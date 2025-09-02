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
export declare class ErrorRecoveryManager extends EventEmitter {
    private strategies;
    private circuitBreakers;
    private errorHistory;
    private maxHistorySize;
    private readonly config;
    constructor();
    handleError(agent: Agent, task: AgentTask, error: Error, attempt?: number): Promise<AgentResult>;
    registerStrategy(strategy: RecoveryStrategy): void;
    getErrorHistory(agentId?: string, limit?: number): ErrorContext[];
    getCircuitBreakerStatus(agentId: string): CircuitBreakerState | null;
    resetCircuitBreaker(agentId: string): void;
    private initializeRecoveryStrategies;
    private findBestStrategy;
    private createRetryTask;
    private isCircuitOpen;
    private recordFailure;
    private recordSuccess;
    private addToHistory;
    private sleep;
    private createTimeoutPromise;
}
export declare class ResilientAgent implements Agent {
    private baseAgent;
    private recoveryManager;
    constructor(baseAgent: Agent, recoveryManager?: ErrorRecoveryManager);
    get id(): string;
    get name(): string;
    get type(): string;
    get capabilities(): string[];
    initialize(): Promise<void>;
    execute(task: AgentTask): Promise<AgentResult>;
    cleanup(): Promise<void>;
}
export declare class SystemHealthMonitor extends EventEmitter {
    private checkIntervalMs;
    private agents;
    private healthChecks;
    private healthStatus;
    private monitoringInterval;
    constructor(checkIntervalMs?: number);
    registerAgent(agent: Agent): void;
    startMonitoring(): void;
    stopMonitoring(): void;
    getSystemHealth(): {
        overall: 'healthy' | 'degraded' | 'unhealthy';
        agents: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
        lastCheck: Date;
    };
    private performHealthChecks;
}
export {};
//# sourceMappingURL=error-recovery.d.ts.map