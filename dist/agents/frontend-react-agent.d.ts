import { Agent, AgentTask, AgentResult } from '../src/types';
export default class FrontendReactAgent implements Agent {
    id: string;
    name: string;
    type: string;
    capabilities: string[];
    initialize(): Promise<void>;
    execute(task: AgentTask): Promise<AgentResult>;
    private generateReactApp;
    private generatePackageJson;
    private generateViteConfig;
    private generateTsConfig;
    private generateIndexHtml;
    private generateMainTsx;
    private generateAppComponent;
    private generateIndexCss;
    private generateComponents;
    private generateHooks;
    private generateApiUtils;
    private generateAuthUtils;
    private generateAuthContext;
    private generateProtectedRoute;
    private generateLoginPage;
    private generateRegisterPage;
    private generateDashboardPage;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=frontend-react-agent.d.ts.map