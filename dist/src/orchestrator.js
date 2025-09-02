"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAlpha = void 0;
const events_1 = require("events");
const winston_1 = require("winston");
const requirement_parser_1 = require("./modules/requirement-parser");
const code_generator_1 = require("./modules/code-generator");
const test_generator_1 = require("./modules/test-generator");
const deployment_manager_1 = require("./modules/deployment-manager");
class OrchestratorAlpha extends events_1.EventEmitter {
    logger;
    agents = new Map();
    tasks = new Map();
    activeTasks = new Set();
    config;
    requirementParser;
    codeGenerator;
    testGenerator;
    deploymentManager;
    constructor(config) {
        super();
        this.config = config;
        this.logger = (0, winston_1.createLogger)({
            level: 'info',
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json()),
            defaultMeta: { service: 'orchestrator-alpha' },
            transports: [
                new winston_1.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston_1.transports.File({ filename: 'logs/combined.log' }),
                new winston_1.transports.Console({
                    format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple())
                })
            ]
        });
        this.requirementParser = new requirement_parser_1.RequirementParser();
        this.codeGenerator = new code_generator_1.CodeGenerator();
        this.testGenerator = new test_generator_1.TestGenerator();
        this.deploymentManager = new deployment_manager_1.DeploymentManager();
    }
    async initialize() {
        this.logger.info('Initializing ORCHESTRATOR-ALPHA...');
        try {
            await this.requirementParser.initialize();
            await this.codeGenerator.initialize();
            await this.testGenerator.initialize();
            await this.deploymentManager.initialize();
            await this.loadAgents();
            this.logger.info('ORCHESTRATOR-ALPHA initialized successfully');
            this.emit('initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize ORCHESTRATOR-ALPHA', error);
            throw error;
        }
    }
    async loadAgents() {
        const agentModules = [
            'frontend-react-agent',
            'frontend-vue-agent',
            'frontend-angular-agent',
            'backend-nodejs-agent',
            'backend-python-agent',
            'database-postgresql-agent',
            'database-mongodb-agent',
            'testing-agent',
            'deployment-docker-agent',
            'deployment-kubernetes-agent'
        ];
        for (const agentModule of agentModules) {
            try {
                const AgentClass = await Promise.resolve(`${`../agents/${agentModule}`}`).then(s => __importStar(require(s)));
                const agent = new AgentClass.default();
                await agent.initialize();
                this.agents.set(agent.id, agent);
                this.logger.info(`Loaded agent: ${agent.name}`);
            }
            catch (error) {
                this.logger.warn(`Failed to load agent: ${agentModule}`, error);
            }
        }
    }
    async buildApp(description) {
        const startTime = Date.now();
        this.logger.info('Starting app build process', { description });
        try {
            // Step 1: Parse requirements
            const requirements = await this.parseRequirements(description);
            this.logger.info('Requirements parsed', { requirements });
            // Step 2: Create execution plan
            const executionPlan = await this.createExecutionPlan(requirements);
            this.logger.info('Execution plan created', {
                taskCount: executionPlan.length,
                estimatedTime: this.estimateExecutionTime(executionPlan)
            });
            // Step 3: Execute tasks
            const results = await this.executeTasks(executionPlan);
            // Step 4: Generate final application
            const app = await this.assembleApplication(requirements, results);
            const buildTime = (Date.now() - startTime) / 1000;
            this.logger.info('App build completed', {
                appId: app.id,
                buildTime,
                testCoverage: app.metadata.testCoverage
            });
            this.emit('appBuilt', app);
            return app;
        }
        catch (error) {
            this.logger.error('App build failed', error);
            this.emit('buildFailed', { description, error });
            throw error;
        }
    }
    async parseRequirements(description) {
        return this.requirementParser.parse(description);
    }
    async createExecutionPlan(requirements) {
        const tasks = [];
        const taskId = (type) => `${requirements.id}-${type}-${Date.now()}`;
        // Frontend tasks
        if (requirements.techStack.frontend) {
            tasks.push({
                id: taskId('frontend'),
                type: 'generation',
                agentId: `frontend-${requirements.techStack.frontend}-agent`,
                requirements,
                dependencies: [],
                status: 'pending'
            });
        }
        // Backend tasks
        if (requirements.techStack.backend) {
            tasks.push({
                id: taskId('backend'),
                type: 'generation',
                agentId: `backend-${requirements.techStack.backend}-agent`,
                requirements,
                dependencies: [],
                status: 'pending'
            });
        }
        // Database tasks
        if (requirements.techStack.database) {
            tasks.push({
                id: taskId('database'),
                type: 'generation',
                agentId: `database-${requirements.techStack.database}-agent`,
                requirements,
                dependencies: [],
                status: 'pending'
            });
        }
        // Testing tasks (depends on all generation tasks)
        const generationTaskIds = tasks.map(t => t.id);
        tasks.push({
            id: taskId('testing'),
            type: 'testing',
            agentId: 'testing-agent',
            requirements,
            dependencies: generationTaskIds,
            status: 'pending'
        });
        // Deployment tasks (depends on testing)
        if (requirements.techStack.deployment) {
            tasks.push({
                id: taskId('deployment'),
                type: 'deployment',
                agentId: `deployment-${requirements.techStack.deployment}-agent`,
                requirements,
                dependencies: [taskId('testing')],
                status: 'pending'
            });
        }
        return this.optimizeExecutionPlan(tasks);
    }
    optimizeExecutionPlan(tasks) {
        // Sort by priority and dependencies for optimal execution
        return tasks.sort((a, b) => {
            if (a.dependencies.length !== b.dependencies.length) {
                return a.dependencies.length - b.dependencies.length;
            }
            return a.type.localeCompare(b.type);
        });
    }
    estimateExecutionTime(tasks) {
        const timeEstimates = {
            'analysis': 30, // 30 seconds
            'generation': 120, // 2 minutes
            'testing': 90, // 1.5 minutes
            'deployment': 60 // 1 minute
        };
        return tasks.reduce((total, task) => {
            return total + (timeEstimates[task.type] || 60);
        }, 0);
    }
    async executeTasks(tasks) {
        const results = new Map();
        const completedTasks = new Set();
        for (const task of tasks) {
            this.tasks.set(task.id, task);
        }
        while (completedTasks.size < tasks.length) {
            const readyTasks = tasks.filter(task => !completedTasks.has(task.id) &&
                !this.activeTasks.has(task.id) &&
                task.dependencies.every(dep => completedTasks.has(dep)));
            if (readyTasks.length === 0 && this.activeTasks.size === 0) {
                throw new Error('Deadlock detected in task execution');
            }
            // Execute ready tasks concurrently
            const concurrentTasks = readyTasks.slice(0, this.config.maxConcurrentTasks - this.activeTasks.size);
            await Promise.all(concurrentTasks.map(async (task) => {
                this.activeTasks.add(task.id);
                task.status = 'in_progress';
                task.startTime = new Date();
                try {
                    const agent = this.agents.get(task.agentId);
                    if (!agent) {
                        throw new Error(`Agent not found: ${task.agentId}`);
                    }
                    const result = await this.executeTaskWithTimeout(agent, task);
                    results.set(task.id, result);
                    task.status = result.success ? 'completed' : 'failed';
                    task.endTime = new Date();
                    task.output = result.data;
                    task.error = result.error;
                    if (result.success) {
                        completedTasks.add(task.id);
                        this.logger.info(`Task completed: ${task.id}`);
                    }
                    else {
                        throw new Error(`Task failed: ${task.id} - ${result.error}`);
                    }
                }
                catch (error) {
                    task.status = 'failed';
                    task.endTime = new Date();
                    task.error = error instanceof Error ? error.message : String(error);
                    this.logger.error(`Task execution failed: ${task.id}`, error);
                    throw error;
                }
                finally {
                    this.activeTasks.delete(task.id);
                }
            }));
        }
        return results;
    }
    async executeTaskWithTimeout(agent, task) {
        const timeout = this.config.timeoutMinutes * 60 * 1000;
        return Promise.race([
            agent.execute(task),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Task timeout')), timeout))
        ]);
    }
    async assembleApplication(requirements, results) {
        const app = {
            id: requirements.id,
            name: requirements.description.split(' ').slice(0, 3).join('-').toLowerCase(),
            structure: {},
            tests: {},
            documentation: '',
            deployment: {},
            metadata: {
                techStack: requirements.techStack,
                generatedAt: new Date(),
                testCoverage: 0,
                buildStatus: 'success'
            }
        };
        // Combine results from all agents
        for (const [taskId, result] of results) {
            if (result.success && result.data) {
                if (taskId.includes('frontend') || taskId.includes('backend')) {
                    Object.assign(app.structure, result.data.files || {});
                }
                if (taskId.includes('testing')) {
                    Object.assign(app.tests, result.data.tests || {});
                    app.metadata.testCoverage = result.data.coverage || 0;
                }
                if (taskId.includes('deployment')) {
                    app.deployment = result.data;
                }
            }
        }
        // Generate documentation
        app.documentation = await this.generateDocumentation(app, requirements);
        return app;
    }
    async generateDocumentation(app, requirements) {
        const docs = [
            `# ${app.name}`,
            '',
            `## Description`,
            requirements.description,
            '',
            `## Tech Stack`,
            `- Frontend: ${requirements.techStack.frontend || 'None'}`,
            `- Backend: ${requirements.techStack.backend || 'None'}`,
            `- Database: ${requirements.techStack.database || 'None'}`,
            `- Deployment: ${requirements.techStack.deployment || 'None'}`,
            '',
            `## Features`,
            ...requirements.features.map(f => `- ${f}`),
            '',
            `## Test Coverage`,
            `${app.metadata.testCoverage}%`,
            '',
            `## Generated: ${app.metadata.generatedAt.toISOString()}`
        ];
        return docs.join('\n');
    }
    async getStatus() {
        return {
            activeAgents: this.agents.size,
            activeTasks: this.activeTasks.size,
            completedBuilds: 0, // TODO: Track this
            systemHealth: this.activeTasks.size > this.config.maxConcurrentTasks ? 'degraded' : 'healthy'
        };
    }
    async shutdown() {
        this.logger.info('Shutting down ORCHESTRATOR-ALPHA...');
        // Wait for active tasks to complete or timeout
        const shutdownTimeout = 30000; // 30 seconds
        const startTime = Date.now();
        while (this.activeTasks.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Cleanup agents
        for (const agent of this.agents.values()) {
            try {
                await agent.cleanup();
            }
            catch (error) {
                this.logger.warn(`Error cleaning up agent: ${agent.id}`, error);
            }
        }
        this.agents.clear();
        this.tasks.clear();
        this.activeTasks.clear();
        this.logger.info('ORCHESTRATOR-ALPHA shutdown complete');
        this.emit('shutdown');
    }
}
exports.OrchestratorAlpha = OrchestratorAlpha;
//# sourceMappingURL=orchestrator.js.map