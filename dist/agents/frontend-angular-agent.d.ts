import { Agent, AgentTask, AgentResult } from '../src/types';
export default class FrontendAngularAgent implements Agent {
    id: string;
    name: string;
    type: string;
    capabilities: string[];
    initialize(): Promise<void>;
    execute(task: AgentTask): Promise<AgentResult>;
    private generateAngularApp;
    private generatePackageJson;
    private generateAngularJson;
    private generateTsConfig;
    private generateAppTsConfig;
    private generateIndexHtml;
    private generateMainTs;
    private generateAppComponent;
    private generateAppTemplate;
    private generateAppStyles;
    private generateAppConfig;
    private generateRoutes;
    private generateComponents;
    private generateAuthComponents;
    private generateServices;
    private generateAuthStore;
    private generateAuthGuards;
    private generateAuthInterceptor;
    private generateGlobalStyles;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=frontend-angular-agent.d.ts.map