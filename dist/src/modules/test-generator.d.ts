import { AppRequirements, GeneratedApp } from '../types';
interface TestSuite {
    name: string;
    type: 'unit' | 'integration' | 'e2e';
    framework: 'jest' | 'vitest' | 'cypress' | 'playwright';
    files: TestFile[];
}
interface TestFile {
    path: string;
    content: string;
    coverage: string[];
}
interface TestConfig {
    framework: string;
    setupFiles: string[];
    testMatch: string[];
    collectCoverageFrom: string[];
    coverageThreshold: {
        global: {
            branches: number;
            functions: number;
            lines: number;
            statements: number;
        };
    };
}
export declare class TestGenerator {
    private testTemplates;
    private coverageTargets;
    initialize(): Promise<void>;
    private initializeTestTemplates;
    private initializeCoverageTargets;
    generateTests(app: GeneratedApp, requirements: AppRequirements): Promise<{
        suites: TestSuite[];
        config: TestConfig;
        coverage: number;
    }>;
    private generateUnitTests;
    private generateComponentTests;
    private generateServiceTests;
    private generateModelTests;
    private generateIntegrationTests;
    private generateAPITests;
    private generateE2ETests;
    private generateTestConfig;
    private calculateExpectedCoverage;
    private renderTemplate;
    private extractComponentsFromApp;
    private extractServicesFromApp;
    private extractModelsFromApp;
    private extractAPIEndpoints;
    private getFileNameWithoutExtension;
    private extractModelFields;
    private extractServiceMethods;
    private generateComponentTestCases;
    private generateAPITestCases;
    private generateUserFlows;
    private generateExpectedBehavior;
    private generateMocks;
    private generateAssertion;
    private generateTestData;
    private generateUpdateTestData;
    private generateErrorSetup;
    private generateErrorMessage;
    private generateExpectedResponse;
    private generateCustomAssertions;
}
export {};
//# sourceMappingURL=test-generator.d.ts.map