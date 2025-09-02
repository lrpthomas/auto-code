/**
 * Circuit Breaker Pattern Implementation for ARCHITECT-BRAVO
 * Provides fault tolerance and graceful degradation for service calls
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  volumeThreshold: number;
  errorThreshold: number;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  uptime: number;
  errorRate: number;
  averageResponseTime: number;
}

export interface CircuitBreakerMetrics {
  requestCount: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  rejectedCount: number;
  totalResponseTime: number;
  lastResetTime: Date;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public circuitBreakerName: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextAttempt: Date | null = null;
  private metrics: CircuitBreakerMetrics;
  private logger: Logger;
  private monitoringTimer: NodeJS.Timeout | null = null;

  constructor(private config: CircuitBreakerConfig) {
    super();
    this.logger = new Logger(`CircuitBreaker:${config.name}`);
    this.metrics = this.resetMetrics();
    this.startMonitoring();
    
    this.logger.info(`Circuit breaker initialized: ${config.name}`, { config });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, timeout?: number): Promise<T> {
    this.metrics.requestCount++;
    
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.canAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.emit('stateChange', { state: this.state, circuitBreaker: this.config.name });
        this.logger.info(`Circuit breaker transitioning to HALF_OPEN: ${this.config.name}`);
      } else {
        this.metrics.rejectedCount++;
        this.emit('requestRejected', { circuitBreaker: this.config.name });
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.config.name}. Requests are being rejected.`,
          this.config.name
        );
      }
    }

    const startTime = Date.now();
    
    try {
      const result = await this.executeWithTimeout(fn, timeout || this.config.timeout);
      const responseTime = Date.now() - startTime;
      
      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'TimeoutError') {
        this.metrics.timeoutCount++;
        this.onFailure();
        throw new CircuitBreakerError(
          `Request timeout after ${timeout || this.config.timeout}ms for ${this.config.name}`,
          this.config.name
        );
      } else {
        this.onFailure();
        throw error;
      }
    }
  }

  /**
   * Force the circuit breaker to open
   */
  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.config.recoveryTimeout);
    this.emit('stateChange', { state: this.state, circuitBreaker: this.config.name });
    this.logger.warn(`Circuit breaker forced OPEN: ${this.config.name}`);
  }

  /**
   * Force the circuit breaker to close
   */
  forceClose(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = null;
    this.emit('stateChange', { state: this.state, circuitBreaker: this.config.name });
    this.logger.info(`Circuit breaker forced CLOSED: ${this.config.name}`);
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const uptime = this.lastSuccessTime 
      ? Date.now() - this.lastSuccessTime.getTime()
      : 0;
    
    const errorRate = this.metrics.requestCount > 0 
      ? this.metrics.failureCount / this.metrics.requestCount 
      : 0;
    
    const averageResponseTime = this.metrics.successCount > 0
      ? this.metrics.totalResponseTime / this.metrics.successCount
      : 0;

    return {
      name: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.metrics.requestCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      uptime,
      errorRate,
      averageResponseTime
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Reset circuit breaker metrics
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttempt = null;
    this.metrics = this.resetMetrics();
    
    this.emit('reset', { circuitBreaker: this.config.name });
    this.logger.info(`Circuit breaker reset: ${this.config.name}`);
  }

  /**
   * Destroy circuit breaker and cleanup resources
   */
  destroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    this.removeAllListeners();
    this.logger.info(`Circuit breaker destroyed: ${this.config.name}`);
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error(`Timeout after ${timeoutMs}ms`);
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private onSuccess(responseTime: number): void {
    this.metrics.successCount++;
    this.metrics.totalResponseTime += responseTime;
    this.lastSuccessTime = new Date();
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = null;
        
        this.emit('stateChange', { state: this.state, circuitBreaker: this.config.name });
        this.logger.info(`Circuit breaker closed after successful recovery: ${this.config.name}`);
      }
    } else {
      // Reset failure count on successful request in CLOSED state
      this.failureCount = Math.max(0, this.failureCount - 1);
    }

    this.emit('success', { circuitBreaker: this.config.name, responseTime });
  }

  private onFailure(): void {
    this.metrics.failureCount++;
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failure in HALF_OPEN state immediately opens the circuit
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.config.recoveryTimeout);
      
      this.emit('stateChange', { state: this.state, circuitBreaker: this.config.name });
      this.logger.warn(`Circuit breaker opened after failure in HALF_OPEN: ${this.config.name}`);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.state = CircuitBreakerState.OPEN;
        this.nextAttempt = new Date(Date.now() + this.config.recoveryTimeout);
        
        this.emit('stateChange', { state: this.state, circuitBreaker: this.config.name });
        this.logger.warn(`Circuit breaker opened due to failures: ${this.config.name}`, {
          failureCount: this.failureCount,
          threshold: this.config.failureThreshold
        });
      }
    }

    this.emit('failure', { circuitBreaker: this.config.name });
  }

  private shouldOpenCircuit(): boolean {
    // Check failure count threshold
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }
    
    // Check error rate threshold
    if (this.metrics.requestCount >= this.config.volumeThreshold) {
      const errorRate = this.metrics.failureCount / this.metrics.requestCount;
      if (errorRate >= this.config.errorThreshold) {
        return true;
      }
    }
    
    return false;
  }

  private canAttemptReset(): boolean {
    return this.nextAttempt !== null && Date.now() >= this.nextAttempt.getTime();
  }

  private resetMetrics(): CircuitBreakerMetrics {
    return {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      rejectedCount: 0,
      totalResponseTime: 0,
      lastResetTime: new Date()
    };
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.emit('metrics', {
        circuitBreaker: this.config.name,
        metrics: this.metrics,
        stats: this.getStats()
      });

      // Reset metrics periodically
      const timeSinceReset = Date.now() - this.metrics.lastResetTime.getTime();
      if (timeSinceReset >= this.config.monitoringPeriod) {
        this.metrics = this.resetMetrics();
      }
    }, this.config.monitoringPeriod);
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers and provides global operations
 */
export class CircuitBreakerManager extends EventEmitter {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger('CircuitBreakerManager');
  }

  /**
   * Create a new circuit breaker
   */
  createCircuitBreaker(config: Partial<CircuitBreakerConfig> & { name: string }): CircuitBreaker {
    const fullConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      recoveryTimeout: 60000,
      monitoringPeriod: 60000,
      volumeThreshold: 10,
      errorThreshold: 0.5,
      ...config
    };

    const circuitBreaker = new CircuitBreaker(fullConfig);
    this.circuitBreakers.set(config.name, circuitBreaker);

    // Forward events
    circuitBreaker.on('stateChange', (data) => this.emit('stateChange', data));
    circuitBreaker.on('success', (data) => this.emit('success', data));
    circuitBreaker.on('failure', (data) => this.emit('failure', data));
    circuitBreaker.on('requestRejected', (data) => this.emit('requestRejected', data));

    this.logger.info(`Circuit breaker created: ${config.name}`);
    return circuitBreaker;
  }

  /**
   * Get circuit breaker by name
   */
  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): CircuitBreakerStats[] {
    return Array.from(this.circuitBreakers.values()).map(cb => cb.getStats());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
    this.logger.info('All circuit breakers reset');
  }

  /**
   * Force open all circuit breakers
   */
  forceOpenAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.forceOpen();
    }
    this.logger.warn('All circuit breakers forced open');
  }

  /**
   * Force close all circuit breakers
   */
  forceCloseAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.forceClose();
    }
    this.logger.info('All circuit breakers forced closed');
  }

  /**
   * Get system health based on circuit breaker states
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    totalCircuitBreakers: number;
    closedCount: number;
    halfOpenCount: number;
    openCount: number;
    overallErrorRate: number;
  } {
    const stats = this.getAllStats();
    const totalCircuitBreakers = stats.length;
    
    let closedCount = 0;
    let halfOpenCount = 0;
    let openCount = 0;
    let totalRequests = 0;
    let totalFailures = 0;

    for (const stat of stats) {
      switch (stat.state) {
        case CircuitBreakerState.CLOSED:
          closedCount++;
          break;
        case CircuitBreakerState.HALF_OPEN:
          halfOpenCount++;
          break;
        case CircuitBreakerState.OPEN:
          openCount++;
          break;
      }
      
      totalRequests += stat.totalRequests;
      totalFailures += stat.failureCount;
    }

    const overallErrorRate = totalRequests > 0 ? totalFailures / totalRequests : 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (openCount === 0 && halfOpenCount === 0) {
      status = 'healthy';
    } else if (openCount < totalCircuitBreakers / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      totalCircuitBreakers,
      closedCount,
      halfOpenCount,
      openCount,
      overallErrorRate
    };
  }

  /**
   * Destroy all circuit breakers and cleanup resources
   */
  destroy(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.destroy();
    }
    this.circuitBreakers.clear();
    this.removeAllListeners();
    this.logger.info('Circuit breaker manager destroyed');
  }
}

// Default circuit breaker manager instance
export const defaultCircuitBreakerManager = new CircuitBreakerManager();

/**
 * Decorator for automatic circuit breaker protection
 */
export function circuitBreaker(config: Partial<CircuitBreakerConfig> & { name: string }) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const circuitBreakerInstance = defaultCircuitBreakerManager.createCircuitBreaker(config);

    descriptor.value = async function (...args: any[]) {
      return circuitBreakerInstance.execute(() => method.apply(this, args));
    };

    return descriptor;
  };
}