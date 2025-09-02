import { Agent, AgentTask, AgentResult } from '../src/types';
export default class BackendNodejsAgent implements Agent {
    id: string;
    name: string;
    type: string;
    capabilities: string[];
    initialize(): Promise<void>;
    execute(task: AgentTask): Promise<AgentResult>;
    private generateNodeApp;
    private generatePackageJson;
    private generateTsConfig;
    private generateEnvExample;
    private generateServer;
    private generateApp;
    private generateDatabaseConfig;
    private generateMiddleware;
    private generateRoutes;
    private generateControllers;
    private generateServices;
    private generateModels;
    private generateUtils;
    private extractFeatures;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=backend-nodejs-agent.d.ts.map