import { AppRequirements, GeneratedApp } from '../../types';
export declare class FastAPIGenerator {
    private templates;
    constructor();
    private loadTemplates;
    generateAPI(requirements: AppRequirements): Promise<GeneratedApp>;
    private generateMain;
    private generateConfig;
    private generateSecurity;
    private generateDatabase;
    private generateDependencies;
    private generateAPIRouter;
    private generateAuthEndpoints;
    private generateUserEndpoints;
    private generateUserModel;
    private generateUserSchemas;
    private generateTokenSchemas;
    private generateBaseCRUD;
    private generateUserCRUD;
    private generateEmailUtils;
    private generateSecurityUtils;
    private generateRequirements;
    private generatePyProject;
    private generateEnvExample;
    private generateAlembicConfig;
    private generateAlembicEnv;
    private generateAlembicScript;
    private generateTestConfig;
    private generateMainTests;
    private generateAuthTests;
    private generateUserTests;
    private generateSecurityTests;
    private generateDockerfile;
    private generateDockerCompose;
    private generateDocumentation;
    private generateDeploymentConfig;
}
//# sourceMappingURL=FastAPIGenerator.d.ts.map