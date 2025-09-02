import { AppRequirements, GeneratedApp } from '../types';
interface DeploymentResult {
    success: boolean;
    platform: string;
    configs: Record<string, string>;
    instructions: string;
    estimatedDeployTime: number;
}
export declare class DeploymentManager {
    private deploymentTemplates;
    private platformHandlers;
    initialize(): Promise<void>;
    private initializeDeploymentTemplates;
    private initializePlatformHandlers;
    generateDeployment(app: GeneratedApp, requirements: AppRequirements): Promise<DeploymentResult>;
    private generateDockerConfig;
    private generateKubernetesConfig;
    private generateVercelConfig;
    private generateAWSConfig;
    private generateDockerCompose;
    private generateDockerComposeProd;
    private generateDockerIgnore;
    private generateK8sConfigMap;
    private generateK8sSecrets;
    private generateCloudFormationTemplate;
    private generateDeploymentInstructions;
    private generateDockerInstructions;
    private generateK8sInstructions;
    private generateVercelInstructions;
    private generateAWSInstructions;
    private estimateDeploymentTime;
    private getAppName;
    private getRequiredPorts;
    private getEnvironmentVars;
    private renderTemplate;
}
export {};
//# sourceMappingURL=deployment-manager.d.ts.map