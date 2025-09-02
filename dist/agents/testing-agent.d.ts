import { Agent, AgentTask, AgentResult } from '../src/types';
export default class TestingAgent implements Agent {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    version: string;
    initialize(): Promise<void>;
    execute(task: AgentTask): Promise<AgentResult>;
    private generateReactTests;
    private generateUtilTests;
    private generateTestConfig;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=testing-agent.d.ts.map