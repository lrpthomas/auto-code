import { AppRequirements, GeneratedApp } from '../../types';
export declare class ExpressGenerator {
    private templates;
    constructor();
    private loadTemplates;
    generateAPI(requirements: AppRequirements): Promise<GeneratedApp>;
    private generateServer;
    private generateAuthMiddleware;
    private generateErrorHandler;
    private generateRateLimit;
    private generateValidation;
    private generateRoutes;
    private generateAuthRoutes;
    private generateAPIRoutes;
    private generateAuthController;
    private generateAPIController;
    private generateUserModel;
    private generateModelIndex;
    private generatePackageJSON;
    private generateDatabaseConfig;
    private generateRedisConfig;
    private generateEnvExample;
    private generateDockerfile;
    private generateDockerCompose;
    private generateServerTests;
    private generateAuthTests;
    private generateAPITests;
    private generateDocumentation;
    private generateDeploymentConfig;
}
//# sourceMappingURL=ExpressGenerator.d.ts.map