"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGenerator = void 0;
class TestGenerator {
    testTemplates = new Map();
    coverageTargets = new Map();
    async initialize() {
        this.initializeTestTemplates();
        this.initializeCoverageTargets();
    }
    initializeTestTemplates() {
        // React component test template
        this.testTemplates.set('react-component', `
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import {{componentName}} from '../{{componentPath}}';

describe('{{componentName}}', () => {
  it('renders without crashing', () => {
    render(<{{componentName}} />);
    expect(screen.getByTestId('{{componentName.toLowerCase}}')).toBeInTheDocument();
  });

  {{#each testCases}}
  it('{{description}}', {{#if async}}async {{/if}}() => {
    {{#if setup}}
    {{setup}}
    {{/if}}
    
    {{#if async}}await {{/if}}{{action}};
    
    {{expectation}};
  });
  {{/each}}
});`);
        // Node.js service test template
        this.testTemplates.set('nodejs-service', `
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {{serviceName}} from '../{{servicePath}}';

describe('{{serviceName}}', () => {
  let {{serviceName.camelCase}}: {{serviceName}};

  beforeEach(() => {
    {{serviceName.camelCase}} = new {{serviceName}}();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  {{#each methods}}
  describe('{{name}}', () => {
    it('should {{expectedBehavior}}', async () => {
      // Arrange
      {{#each mocks}}
      {{mockSetup}}
      {{/each}}
      
      // Act
      const result = await {{../serviceName.camelCase}}.{{name}}({{#each params}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}});
      
      // Assert
      {{assertion}};
    });

    {{#if errorCase}}
    it('should handle errors gracefully', async () => {
      // Arrange
      {{errorSetup}}
      
      // Act & Assert
      await expect({{../serviceName.camelCase}}.{{name}}({{#each params}}invalidData{{#unless @last}}, {{/unless}}{{/each}}))
        .rejects.toThrow('{{errorMessage}}');
    });
    {{/if}}
  });
  {{/each}}
});`);
        // API endpoint test template
        this.testTemplates.set('api-endpoint', `
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../{{appPath}}';

describe('{{endpoint}} API', () => {
  {{#if requiresAuth}}
  let authToken: string;

  beforeAll(async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });
    authToken = response.body.token;
  });
  {{/if}}

  {{#each testCases}}
  it('{{method}} {{path}} - {{description}}', async () => {
    const response = await request(app)
      .{{method.toLowerCase}}('{{path}}')
      {{#if ../requiresAuth}}.set('Authorization', \`Bearer \${authToken}\`){{/if}}
      {{#if data}}.send({{data}}){{/if}}
      .expect({{expectedStatus}});

    {{#if expectedResponse}}
    expect(response.body).toMatchObject({{expectedResponse}});
    {{/if}}

    {{#if customAssertions}}
    {{customAssertions}}
    {{/if}}
  });
  {{/each}}
});`);
        // Database test template
        this.testTemplates.set('database-model', `
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { {{modelName}} } from '../{{modelPath}}';
import { setupTestDatabase, cleanupTestDatabase } from './helpers/database';

describe('{{modelName}} Model', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('should create a new {{modelName.toLowerCase}}', async () => {
    const {{modelName.camelCase}}Data = {{testData}};
    const {{modelName.camelCase}} = await {{modelName}}.create({{modelName.camelCase}}Data);
    
    expect({{modelName.camelCase}}).toBeDefined();
    expect({{modelName.camelCase}}.id).toBeDefined();
    {{#each fields}}
    expect({{../modelName.camelCase}}.{{name}}).toBe({{../modelName.camelCase}}Data.{{name}});
    {{/each}}
  });

  it('should find {{modelName.toLowerCase}} by id', async () => {
    const {{modelName.camelCase}} = await {{modelName}}.create({{testData}});
    const found{{modelName}} = await {{modelName}}.findById({{modelName.camelCase}}.id);
    
    expect(found{{modelName}}).toBeDefined();
    expect(found{{modelName}}.id).toBe({{modelName.camelCase}}.id);
  });

  it('should update {{modelName.toLowerCase}}', async () => {
    const {{modelName.camelCase}} = await {{modelName}}.create({{testData}});
    const updateData = {{updateTestData}};
    
    const updated{{modelName}} = await {{modelName}}.update({{modelName.camelCase}}.id, updateData);
    
    expect(updated{{modelName}}).toBeDefined();
    {{#each updateFields}}
    expect(updated{{modelName}}.{{name}}).toBe(updateData.{{name}});
    {{/each}}
  });

  it('should delete {{modelName.toLowerCase}}', async () => {
    const {{modelName.camelCase}} = await {{modelName}}.create({{testData}});
    await {{modelName}}.delete({{modelName.camelCase}}.id);
    
    const deleted{{modelName}} = await {{modelName}}.findById({{modelName.camelCase}}.id);
    expect(deleted{{modelName}}).toBeNull();
  });
});`);
        // E2E test template
        this.testTemplates.set('e2e-flow', `
import { test, expect } from '@playwright/test';

test.describe('{{flowName}}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  {{#each steps}}
  test('{{description}}', async ({ page }) => {
    {{#each actions}}
    {{action}};
    {{/each}}
    
    {{#each assertions}}
    {{assertion}};
    {{/each}}
  });
  {{/each}}
});`);
    }
    initializeCoverageTargets() {
        this.coverageTargets.set('unit', 90);
        this.coverageTargets.set('integration', 80);
        this.coverageTargets.set('e2e', 70);
    }
    async generateTests(app, requirements) {
        const suites = [];
        // Generate unit tests
        const unitTests = await this.generateUnitTests(app, requirements);
        suites.push(...unitTests);
        // Generate integration tests
        const integrationTests = await this.generateIntegrationTests(app, requirements);
        suites.push(...integrationTests);
        // Generate E2E tests
        const e2eTests = await this.generateE2ETests(app, requirements);
        suites.push(...e2eTests);
        // Generate test configuration
        const config = this.generateTestConfig(requirements);
        // Calculate expected coverage
        const coverage = this.calculateExpectedCoverage(suites);
        return { suites, config, coverage };
    }
    async generateUnitTests(app, requirements) {
        const suites = [];
        // Frontend component tests
        if (requirements.techStack.frontend) {
            const componentTests = this.generateComponentTests(app, requirements);
            suites.push({
                name: 'Frontend Components',
                type: 'unit',
                framework: 'vitest',
                files: componentTests
            });
        }
        // Backend service tests
        if (requirements.techStack.backend) {
            const serviceTests = this.generateServiceTests(app, requirements);
            suites.push({
                name: 'Backend Services',
                type: 'unit',
                framework: 'vitest',
                files: serviceTests
            });
        }
        // Database model tests
        if (requirements.techStack.database) {
            const modelTests = this.generateModelTests(app, requirements);
            suites.push({
                name: 'Database Models',
                type: 'unit',
                framework: 'vitest',
                files: modelTests
            });
        }
        return suites;
    }
    generateComponentTests(app, requirements) {
        const components = this.extractComponentsFromApp(app);
        const testFiles = [];
        components.forEach(component => {
            const testCases = this.generateComponentTestCases(component);
            const content = this.renderTemplate('react-component', {
                componentName: component.name,
                componentPath: component.path,
                testCases
            });
            testFiles.push({
                path: `tests/components/${component.name}.test.tsx`,
                content,
                coverage: [component.path]
            });
        });
        return testFiles;
    }
    generateServiceTests(app, requirements) {
        const services = this.extractServicesFromApp(app);
        const testFiles = [];
        services.forEach(service => {
            const methods = this.extractServiceMethods(service);
            const content = this.renderTemplate('nodejs-service', {
                serviceName: service.name,
                servicePath: service.path,
                methods: methods.map(method => ({
                    ...method,
                    expectedBehavior: this.generateExpectedBehavior(method),
                    mocks: this.generateMocks(method),
                    assertion: this.generateAssertion(method),
                    errorCase: method.canThrowError,
                    errorSetup: this.generateErrorSetup(method),
                    errorMessage: this.generateErrorMessage(method)
                }))
            });
            testFiles.push({
                path: `tests/services/${service.name}.test.ts`,
                content,
                coverage: [service.path]
            });
        });
        return testFiles;
    }
    generateModelTests(app, requirements) {
        const models = this.extractModelsFromApp(app);
        const testFiles = [];
        models.forEach(model => {
            const content = this.renderTemplate('database-model', {
                modelName: model.name,
                modelPath: model.path,
                testData: this.generateTestData(model),
                updateTestData: this.generateUpdateTestData(model),
                fields: model.fields,
                updateFields: model.fields.filter(f => !f.primary && f.name !== 'createdAt')
            });
            testFiles.push({
                path: `tests/models/${model.name}.test.ts`,
                content,
                coverage: [model.path]
            });
        });
        return testFiles;
    }
    async generateIntegrationTests(app, requirements) {
        const suites = [];
        if (requirements.techStack.backend) {
            const apiTests = this.generateAPITests(app, requirements);
            suites.push({
                name: 'API Integration',
                type: 'integration',
                framework: 'vitest',
                files: apiTests
            });
        }
        return suites;
    }
    generateAPITests(app, requirements) {
        const endpoints = this.extractAPIEndpoints(app);
        const testFiles = [];
        endpoints.forEach(endpoint => {
            const testCases = this.generateAPITestCases(endpoint);
            const content = this.renderTemplate('api-endpoint', {
                endpoint: endpoint.name,
                appPath: '../src/app',
                requiresAuth: endpoint.requiresAuth,
                testCases: testCases.map(testCase => ({
                    ...testCase,
                    expectedResponse: this.generateExpectedResponse(testCase),
                    customAssertions: this.generateCustomAssertions(testCase)
                }))
            });
            testFiles.push({
                path: `tests/integration/${endpoint.name}.test.ts`,
                content,
                coverage: [endpoint.path]
            });
        });
        return testFiles;
    }
    async generateE2ETests(app, requirements) {
        const suites = [];
        if (requirements.techStack.frontend) {
            const userFlows = this.generateUserFlows(requirements);
            const testFiles = userFlows.map(flow => ({
                path: `tests/e2e/${flow.name}.spec.ts`,
                content: this.renderTemplate('e2e-flow', flow),
                coverage: []
            }));
            suites.push({
                name: 'User Flows',
                type: 'e2e',
                framework: 'playwright',
                files: testFiles
            });
        }
        return suites;
    }
    generateTestConfig(requirements) {
        const config = {
            framework: 'vitest',
            setupFiles: ['<rootDir>/tests/setup.ts'],
            testMatch: [
                '<rootDir>/tests/**/*.test.{ts,tsx}',
                '<rootDir>/tests/**/*.spec.{ts,tsx}'
            ],
            collectCoverageFrom: [
                'src/**/*.{ts,tsx}',
                '!src/**/*.d.ts',
                '!src/**/*.test.{ts,tsx}'
            ],
            coverageThreshold: {
                global: {
                    branches: 80,
                    functions: 85,
                    lines: 90,
                    statements: 90
                }
            }
        };
        // Adjust based on tech stack
        if (requirements.techStack.frontend === 'react') {
            config.setupFiles.push('<rootDir>/tests/setup-react.ts');
        }
        if (requirements.techStack.database) {
            config.setupFiles.push('<rootDir>/tests/setup-database.ts');
        }
        return config;
    }
    calculateExpectedCoverage(suites) {
        const weights = { unit: 0.6, integration: 0.3, e2e: 0.1 };
        let totalCoverage = 0;
        let totalWeight = 0;
        suites.forEach(suite => {
            const weight = weights[suite.type];
            const suiteCoverage = this.coverageTargets.get(suite.type) || 75;
            totalCoverage += suiteCoverage * weight;
            totalWeight += weight;
        });
        return totalWeight > 0 ? Math.round(totalCoverage / totalWeight) : 75;
    }
    renderTemplate(templateName, context) {
        const template = this.testTemplates.get(templateName);
        if (!template) {
            throw new Error(`Template not found: ${templateName}`);
        }
        // Simple template replacement (in real implementation, use Handlebars)
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const keys = path.trim().split('.');
            let value = context;
            for (const key of keys) {
                if (value && typeof value === 'object') {
                    value = value[key];
                }
                else {
                    return match; // Keep original if path not found
                }
            }
            return String(value || '');
        });
    }
    // Helper methods for extracting information from app structure
    extractComponentsFromApp(app) {
        const components = [];
        // Scan through app structure for component files
        for (const [filePath, content] of Object.entries(app.structure)) {
            if (filePath.includes('/components/') && (filePath.endsWith('.tsx') || filePath.endsWith('.vue'))) {
                components.push({
                    name: this.getFileNameWithoutExtension(filePath),
                    path: filePath
                });
            }
        }
        return components;
    }
    extractServicesFromApp(app) {
        const services = [];
        for (const [filePath, content] of Object.entries(app.structure)) {
            if (filePath.includes('/services/') && filePath.endsWith('.ts')) {
                services.push({
                    name: this.getFileNameWithoutExtension(filePath),
                    path: filePath
                });
            }
        }
        return services;
    }
    extractModelsFromApp(app) {
        const models = [];
        for (const [filePath, content] of Object.entries(app.structure)) {
            if (filePath.includes('/models/') && filePath.endsWith('.ts')) {
                models.push({
                    name: this.getFileNameWithoutExtension(filePath),
                    path: filePath,
                    fields: this.extractModelFields(content)
                });
            }
        }
        return models;
    }
    extractAPIEndpoints(app) {
        const endpoints = [];
        for (const [filePath, content] of Object.entries(app.structure)) {
            if ((filePath.includes('/routes/') || filePath.includes('/controllers/')) && filePath.endsWith('.ts')) {
                endpoints.push({
                    name: this.getFileNameWithoutExtension(filePath),
                    path: filePath,
                    requiresAuth: content.includes('auth') || content.includes('jwt')
                });
            }
        }
        return endpoints;
    }
    getFileNameWithoutExtension(filePath) {
        const fileName = filePath.split('/').pop() || '';
        return fileName.split('.')[0];
    }
    extractModelFields(content) {
        // Simplified field extraction - in real implementation, parse AST
        return [
            { name: 'id', primary: true },
            { name: 'name', primary: false },
            { name: 'createdAt', primary: false }
        ];
    }
    extractServiceMethods(service) {
        return [
            { name: 'create', params: ['data'], canThrowError: true },
            { name: 'findById', params: ['id'], canThrowError: true },
            { name: 'update', params: ['id', 'data'], canThrowError: true },
            { name: 'delete', params: ['id'], canThrowError: true }
        ];
    }
    generateComponentTestCases(component) {
        return [
            {
                description: 'handles user interaction',
                action: 'fireEvent.click(screen.getByRole("button"))',
                expectation: 'expect(screen.getByText("Success")).toBeInTheDocument()'
            }
        ];
    }
    generateAPITestCases(endpoint) {
        return [
            {
                method: 'GET',
                path: `/api/${endpoint.name.toLowerCase()}`,
                description: 'should return all items',
                expectedStatus: 200
            },
            {
                method: 'POST',
                path: `/api/${endpoint.name.toLowerCase()}`,
                description: 'should create new item',
                expectedStatus: 201,
                data: '{ name: "Test Item" }'
            }
        ];
    }
    generateUserFlows(requirements) {
        const flows = [];
        if (requirements.features.includes('User Authentication')) {
            flows.push({
                name: 'user-authentication',
                flowName: 'User Authentication Flow',
                steps: [
                    {
                        description: 'user can sign up',
                        actions: [
                            'await page.click("[data-testid=signup-button]")',
                            'await page.fill("[data-testid=email-input]", "test@example.com")',
                            'await page.fill("[data-testid=password-input]", "password123")',
                            'await page.click("[data-testid=submit-button]")'
                        ],
                        assertions: [
                            'await expect(page.locator("[data-testid=welcome-message]")).toBeVisible()'
                        ]
                    },
                    {
                        description: 'user can log in',
                        actions: [
                            'await page.click("[data-testid=login-button]")',
                            'await page.fill("[data-testid=email-input]", "test@example.com")',
                            'await page.fill("[data-testid=password-input]", "password123")',
                            'await page.click("[data-testid=submit-button]")'
                        ],
                        assertions: [
                            'await expect(page.locator("[data-testid=dashboard]")).toBeVisible()'
                        ]
                    }
                ]
            });
        }
        return flows;
    }
    generateExpectedBehavior(method) {
        const behaviors = {
            create: 'create and return a new record',
            findById: 'find and return record by ID',
            update: 'update and return the record',
            delete: 'delete the record'
        };
        return behaviors[method.name] || 'execute successfully';
    }
    generateMocks(method) {
        return [
            { mockSetup: 'vi.mock("../database", () => ({ query: vi.fn() }));' }
        ];
    }
    generateAssertion(method) {
        if (method.name === 'create')
            return 'expect(result).toHaveProperty("id")';
        if (method.name === 'findById')
            return 'expect(result).toBeDefined()';
        if (method.name === 'update')
            return 'expect(result.updatedAt).toBeInstanceOf(Date)';
        if (method.name === 'delete')
            return 'expect(result).toBe(true)';
        return 'expect(result).toBeDefined()';
    }
    generateTestData(model) {
        return '{ name: "Test Name", email: "test@example.com" }';
    }
    generateUpdateTestData(model) {
        return '{ name: "Updated Name" }';
    }
    generateErrorSetup(method) {
        return 'vi.mocked(query).mockRejectedValue(new Error("Database error"));';
    }
    generateErrorMessage(method) {
        return 'Database error';
    }
    generateExpectedResponse(testCase) {
        if (testCase.method === 'GET')
            return '{ data: expect.any(Array) }';
        if (testCase.method === 'POST')
            return '{ id: expect.any(String), name: "Test Item" }';
        return '{}';
    }
    generateCustomAssertions(testCase) {
        return '';
    }
}
exports.TestGenerator = TestGenerator;
//# sourceMappingURL=test-generator.js.map