import { EventEmitter } from 'events';
import { Agent, AgentTask, AgentResult } from '../types';

interface ErrorContext {
  agentId: string;
  taskId: string;
  error: Error;
  attempt: number;
  maxAttempts: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface RecoveryStrategy {
  name: string;
  canHandle: (context: ErrorContext) => boolean;
  execute: (context: ErrorContext, agent: Agent) => Promise<AgentResult>;
  priority: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: Date;
  state: 'closed' | 'open' | 'half-open';
  nextRetry: Date;
}

export class ErrorRecoveryManager extends EventEmitter {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorHistory: ErrorContext[] = new Map();
  private maxHistorySize = 1000;
  
  // Configuration
  private readonly config = {
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeMs: 30000, // 30 seconds
      halfOpenMaxAttempts: 3
    },
    retry: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2
    },
    timeout: {
      defaultMs: 60000, // 1 minute
      maxMs: 300000     // 5 minutes
    }
  };

  constructor() {
    super();
    this.initializeRecoveryStrategies();
  }

  async handleError(
    agent: Agent,
    task: AgentTask,
    error: Error,
    attempt: number = 1
  ): Promise<AgentResult> {
    const context: ErrorContext = {
      agentId: agent.id,
      taskId: task.id,
      error,
      attempt,
      maxAttempts: this.config.retry.maxAttempts,
      timestamp: new Date(),
      metadata: {
        taskType: task.type,
        requirements: task.requirements
      }
    };

    this.addToHistory(context);
    this.emit('errorOccurred', context);

    // Check circuit breaker
    if (this.isCircuitOpen(agent.id)) {
      return {
        success: false,
        error: 'Circuit breaker is open - too many recent failures'
      };
    }

    // Find and execute recovery strategy
    const strategy = this.findBestStrategy(context);
    if (strategy) {
      try {
        this.emit('recoveryStarted', { strategy: strategy.name, context });
        const result = await strategy.execute(context, agent);
        
        if (result.success) {
          this.recordSuccess(agent.id);
          this.emit('recoverySucceeded', { strategy: strategy.name, context });
        } else {
          this.recordFailure(agent.id);
          this.emit('recoveryFailed', { strategy: strategy.name, context, result });
        }
        
        return result;
      } catch (recoveryError) {
        this.recordFailure(agent.id);
        this.emit('recoveryError', { 
          strategy: strategy.name, 
          context, 
          error: recoveryError 
        });
        
        return {
          success: false,
          error: `Recovery strategy '${strategy.name}' failed: ${recoveryError}`
        };
      }
    }

    // No strategy found - return failure
    this.recordFailure(agent.id);
    return {
      success: false,
      error: `No recovery strategy available for error: ${error.message}`
    };
  }

  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.emit('strategyRegistered', { name: strategy.name });
  }

  getErrorHistory(agentId?: string, limit: number = 100): ErrorContext[] {
    let history = Array.from(this.errorHistory);
    
    if (agentId) {
      history = history.filter(ctx => ctx.agentId === agentId);
    }
    
    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getCircuitBreakerStatus(agentId: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(agentId) || null;
  }

  resetCircuitBreaker(agentId: string): void {
    this.circuitBreakers.delete(agentId);
    this.emit('circuitBreakerReset', { agentId });
  }

  private initializeRecoveryStrategies(): void {
    // Retry Strategy
    this.registerStrategy({
      name: 'exponential-backoff-retry',
      priority: 1,
      canHandle: (context) => context.attempt < context.maxAttempts,
      execute: async (context, agent) => {
        const delay = Math.min(
          this.config.retry.baseDelayMs * Math.pow(this.config.retry.backoffMultiplier, context.attempt - 1),
          this.config.retry.maxDelayMs
        );
        
        await this.sleep(delay);
        
        const task = this.createRetryTask(context);
        return await agent.execute(task);
      }
    });

    // Resource Cleanup Strategy
    this.registerStrategy({
      name: 'resource-cleanup',
      priority: 2,
      canHandle: (context) => 
        context.error.message.includes('resource') || 
        context.error.message.includes('memory') ||
        context.error.message.includes('connection'),
      execute: async (context, agent) => {
        // Attempt cleanup
        if ('cleanup' in agent && typeof agent.cleanup === 'function') {
          await agent.cleanup();
        }
        
        // Reinitialize
        if ('initialize' in agent && typeof agent.initialize === 'function') {
          await agent.initialize();
        }
        
        // Retry task
        const task = this.createRetryTask(context);
        return await agent.execute(task);
      }
    });

    // Timeout Recovery Strategy
    this.registerStrategy({
      name: 'timeout-recovery',
      priority: 3,
      canHandle: (context) => 
        context.error.message.includes('timeout') || 
        context.error.message.includes('TIMEOUT'),
      execute: async (context, agent) => {
        // Increase timeout for retry
        const task = this.createRetryTask(context);
        
        return await Promise.race([
          agent.execute(task),
          this.createTimeoutPromise(this.config.timeout.maxMs)
        ]);
      }
    });

    // Dependency Recovery Strategy
    this.registerStrategy({
      name: 'dependency-recovery',
      priority: 4,
      canHandle: (context) =>
        context.error.message.includes('dependency') ||
        context.error.message.includes('module') ||
        context.error.message.includes('import'),
      execute: async (context, agent) => {
        // Attempt to reinitialize dependencies
        if ('initialize' in agent && typeof agent.initialize === 'function') {
          await agent.initialize();
        }
        
        const task = this.createRetryTask(context);
        return await agent.execute(task);
      }
    });

    // Graceful Degradation Strategy
    this.registerStrategy({
      name: 'graceful-degradation',
      priority: 10,
      canHandle: () => true, // Fallback strategy
      execute: async (context, agent) => {
        // Return partial success with limited functionality
        return {
          success: true,
          data: {
            degraded: true,
            originalError: context.error.message,
            message: 'Operation completed with reduced functionality'
          },
          metadata: {
            recoveryStrategy: 'graceful-degradation',
            originalAttempts: context.attempt
          }
        };
      }
    });
  }

  private findBestStrategy(context: ErrorContext): RecoveryStrategy | null {
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.canHandle(context))
      .sort((a, b) => a.priority - b.priority);
    
    return applicableStrategies[0] || null;
  }

  private createRetryTask(context: ErrorContext): AgentTask {
    return {
      id: `${context.taskId}_retry_${context.attempt + 1}`,
      type: 'generation', // Default type
      agentId: context.agentId,
      requirements: context.metadata?.requirements || {},
      dependencies: [],
      status: 'pending'
    };
  }

  private isCircuitOpen(agentId: string): boolean {
    const breaker = this.circuitBreakers.get(agentId);
    if (!breaker) return false;

    switch (breaker.state) {
      case 'open':
        if (Date.now() > breaker.nextRetry.getTime()) {
          breaker.state = 'half-open';
          return false;
        }
        return true;
      case 'half-open':
        return false;
      case 'closed':
        return false;
      default:
        return false;
    }
  }

  private recordFailure(agentId: string): void {
    let breaker = this.circuitBreakers.get(agentId);
    if (!breaker) {
      breaker = {
        failures: 0,
        lastFailure: new Date(),
        state: 'closed',
        nextRetry: new Date()
      };
      this.circuitBreakers.set(agentId, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = new Date();

    if (breaker.failures >= this.config.circuitBreaker.failureThreshold) {
      breaker.state = 'open';
      breaker.nextRetry = new Date(Date.now() + this.config.circuitBreaker.recoveryTimeMs);
      this.emit('circuitBreakerOpened', { agentId, failures: breaker.failures });
    }
  }

  private recordSuccess(agentId: string): void {
    const breaker = this.circuitBreakers.get(agentId);
    if (breaker) {
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failures = 0;
        this.emit('circuitBreakerClosed', { agentId });
      } else if (breaker.state === 'closed') {
        breaker.failures = Math.max(0, breaker.failures - 1);
      }
    }
  }

  private addToHistory(context: ErrorContext): void {
    this.errorHistory.push(context);
    
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createTimeoutPromise(timeoutMs: number): Promise<AgentResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }
}

// Resilient Agent Wrapper
export class ResilientAgent implements Agent {
  private baseAgent: Agent;
  private recoveryManager: ErrorRecoveryManager;
  
  constructor(baseAgent: Agent, recoveryManager?: ErrorRecoveryManager) {
    this.baseAgent = baseAgent;
    this.recoveryManager = recoveryManager || new ErrorRecoveryManager();
  }

  get id(): string {
    return this.baseAgent.id;
  }

  get name(): string {
    return this.baseAgent.name;
  }

  get type(): string {
    return this.baseAgent.type;
  }

  get capabilities(): string[] {
    return this.baseAgent.capabilities;
  }

  async initialize(): Promise<void> {
    try {
      await this.baseAgent.initialize();
    } catch (error) {
      // Initialize recovery manager if needed
      this.recoveryManager.emit('initializationFailed', { 
        agentId: this.id, 
        error 
      });
      throw error;
    }
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    let attempt = 1;
    
    while (attempt <= 3) { // Max attempts
      try {
        const result = await this.baseAgent.execute(task);
        
        if (result.success) {
          return result;
        } else {
          throw new Error(result.error || 'Agent execution failed');
        }
      } catch (error) {
        if (attempt === 3) {
          // Final attempt - use recovery manager
          return await this.recoveryManager.handleError(
            this.baseAgent,
            task,
            error instanceof Error ? error : new Error(String(error)),
            attempt
          );
        }
        
        attempt++;
        // Brief delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: false,
      error: 'Maximum retry attempts exceeded'
    };
  }

  async cleanup(): Promise<void> {
    try {
      await this.baseAgent.cleanup();
    } catch (error) {
      this.recoveryManager.emit('cleanupFailed', { 
        agentId: this.id, 
        error 
      });
      // Don't throw - cleanup should be best effort
    }
  }
}

// Health Monitor
export class SystemHealthMonitor extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private healthChecks: Map<string, Date> = new Map();
  private healthStatus: Map<string, 'healthy' | 'degraded' | 'unhealthy'> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(private checkIntervalMs: number = 30000) {
    super();
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.healthStatus.set(agent.id, 'healthy');
    this.healthChecks.set(agent.id, new Date());
  }

  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkIntervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    agents: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    lastCheck: Date;
  } {
    const agentStatuses = Object.fromEntries(this.healthStatus);
    const statusCounts = Array.from(this.healthStatus.values()).reduce(
      (acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (statusCounts.unhealthy > 0) {
      overall = 'unhealthy';
    } else if (statusCounts.degraded > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      agents: agentStatuses,
      lastCheck: new Date()
    };
  }

  private async performHealthChecks(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      try {
        // Simple health check - try to execute a basic task
        const healthTask: AgentTask = {
          id: `health_${agentId}_${Date.now()}`,
          type: 'analysis',
          agentId,
          requirements: { healthCheck: true },
          dependencies: [],
          status: 'pending'
        };

        const result = await Promise.race([
          agent.execute(healthTask),
          new Promise<AgentResult>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);

        if (result.success) {
          this.healthStatus.set(agentId, 'healthy');
        } else {
          this.healthStatus.set(agentId, 'degraded');
        }

        this.healthChecks.set(agentId, new Date());
      } catch (error) {
        this.healthStatus.set(agentId, 'unhealthy');
        this.emit('agentUnhealthy', { agentId, error });
      }
    }

    this.emit('healthCheckCompleted', this.getSystemHealth());
  }
}