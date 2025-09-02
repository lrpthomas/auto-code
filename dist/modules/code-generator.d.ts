import { AppRequirements } from '../types';
interface GeneratedFile {
    path: string;
    content: string;
    type: 'code' | 'config' | 'test' | 'docs';
}
export declare class CodeGenerator {
    private templates;
    private templateConfigs;
    initialize(): Promise<void>;
    private loadTemplates;
    private initializeTemplateConfigs;
    private registerHelpers;
    generateApplication(requirements: AppRequirements): Promise<GeneratedFile[]>;
    private buildTemplateContext;
    private extractComponents;
    private extractModels;
    private extractRoutes;
    private extractServices;
    private getModelFields;
    private getServiceMethods;
    private generateFrontend;
    private generateBackend;
    private generateDatabase;
    private generateConfiguration;
    private createDefaultTemplate;
    private processOutputPath;
    private generateDockerfile;
    private generateDockerCompose;
    private generateEnvExample;
    private generateReadme;
}
export {};
//# sourceMappingURL=code-generator.d.ts.map