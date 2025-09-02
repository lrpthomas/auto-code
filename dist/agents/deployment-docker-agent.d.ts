import { Agent, AgentTask, AgentResult } from '../src/types';
export default class DockerDeploymentAgent implements Agent {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    version: string;
    initialize(): Promise<void>;
    execute(task: AgentTask): Promise<AgentResult>;
    private generateDockerfile;
    private generateDockerCompose;
    private generateK8sDeployment;
    private generateBuildScript;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=deployment-docker-agent.d.ts.map