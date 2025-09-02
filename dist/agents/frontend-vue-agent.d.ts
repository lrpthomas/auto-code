import { Agent, AgentTask, AgentResult } from '../src/types';
export default class FrontendVueAgent implements Agent {
    id: string;
    name: string;
    type: string;
    capabilities: string[];
    initialize(): Promise<void>;
    execute(task: AgentTask): Promise<AgentResult>;
    private generateVueApp;
    private generatePackageJson;
    private generateViteConfig;
    private generateTsConfig;
    private generateIndexHtml;
    private generateMainTs;
    private generateAppComponent;
    private generateMainCss;
    private generateComponents;
    private generateAuthComponents;
    private generateComposables;
    private generateStore;
    private generateRouter;
    private generateApiUtils;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=frontend-vue-agent.d.ts.map