import { EventEmitter } from 'events';
import { GeneratedApp, OrchestratorConfig } from './types';
export declare class OrchestratorAlpha extends EventEmitter {
    private logger;
    private agents;
    private tasks;
    private activeTasks;
    private config;
    private requirementParser;
    private codeGenerator;
    private testGenerator;
    private deploymentManager;
    constructor(config: OrchestratorConfig);
    initialize(): Promise<void>;
    private loadAgents;
    buildApp(description: string): Promise<GeneratedApp>;
    private parseRequirements;
    private createExecutionPlan;
    private optimizeExecutionPlan;
    private estimateExecutionTime;
    private executeTasks;
    private executeTaskWithTimeout;
    private assembleApplication;
    private generateDocumentation;
    getStatus(): Promise<{
        activeAgents: number;
        activeTasks: number;
        completedBuilds: number;
        systemHealth: 'healthy' | 'degraded' | 'critical';
    }>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=orchestrator.d.ts.map