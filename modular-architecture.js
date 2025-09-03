/**
 * Modular Architecture System
 * Each module runs independently with isolated failure domains
 */

const { Worker } = require('worker_threads');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class ModularOrchestrator extends EventEmitter {
    constructor() {
        super();
        this.modules = new Map();
        this.workers = new Map();
        this.state = new Map();
        this.healthChecks = new Map();
    }

    /**
     * Register isolated modules
     */
    async registerModules() {
        const modules = [
            // Core Analysis Module - Can fail without stopping generation
            {
                name: 'idea-analyzer',
                path: './modules/idea-analyzer.js',
                critical: false,
                fallback: 'basic-analyzer',
                timeout: 30000,
                retries: 3,
                dependencies: []
            },
            
            // Project Planning Module - Has fallback templates
            {
                name: 'project-planner',
                path: './modules/project-planner.js',
                critical: false,
                fallback: 'template-planner',
                timeout: 45000,
                retries: 2,
                dependencies: ['idea-analyzer']
            },
            
            // Code Generation Modules - Multiple independent generators
            {
                name: 'frontend-generator',
                path: './modules/frontend-generator.js',
                critical: false,
                fallback: 'template-frontend',
                timeout: 60000,
                retries: 2,
                dependencies: ['project-planner'],
                parallel: true
            },
            {
                name: 'backend-generator',
                path: './modules/backend-generator.js',
                critical: false,
                fallback: 'template-backend',
                timeout: 60000,
                retries: 2,
                dependencies: ['project-planner'],
                parallel: true
            },
            {
                name: 'database-generator',
                path: './modules/database-generator.js',
                critical: false,
                fallback: 'sqlite-default',
                timeout: 30000,
                retries: 2,
                dependencies: ['project-planner'],
                parallel: true
            },
            {
                name: 'api-generator',
                path: './modules/api-generator.js',
                critical: false,
                fallback: 'rest-template',
                timeout: 45000,
                retries: 2,
                dependencies: ['backend-generator'],
                parallel: true
            },
            
            // Testing Module - Optional but recommended
            {
                name: 'test-generator',
                path: './modules/test-generator.js',
                critical: false,
                fallback: 'basic-tests',
                timeout: 30000,
                retries: 1,
                dependencies: ['frontend-generator', 'backend-generator'],
                optional: true
            },
            
            // Documentation Module - Non-critical
            {
                name: 'doc-generator',
                path: './modules/doc-generator.js',
                critical: false,
                fallback: 'basic-readme',
                timeout: 20000,
                retries: 1,
                dependencies: ['frontend-generator', 'backend-generator'],
                optional: true
            },
            
            // Deployment Module - Can fail gracefully
            {
                name: 'deployment-manager',
                path: './modules/deployment-manager.js',
                critical: false,
                fallback: 'local-server',
                timeout: 120000,
                retries: 2,
                dependencies: ['frontend-generator', 'backend-generator']
            },
            
            // Git Module - Optional
            {
                name: 'git-manager',
                path: './modules/git-manager.js',
                critical: false,
                fallback: null,
                timeout: 30000,
                retries: 1,
                dependencies: [],
                optional: true
            }
        ];

        for (const module of modules) {
            await this.registerModule(module);
        }
    }

    /**
     * Register a single module with isolation
     */
    async registerModule(config) {
        const moduleWrapper = {
            ...config,
            status: 'ready',
            lastRun: null,
            failures: 0,
            successRate: 100,
            averageTime: 0,
            worker: null
        };

        this.modules.set(config.name, moduleWrapper);
        
        // Set up health check
        this.healthChecks.set(config.name, setInterval(() => {
            this.checkModuleHealth(config.name);
        }, 60000)); // Check every minute
    }

    /**
     * Execute module with isolation and fallback
     */
    async executeModule(moduleName, input, context = {}) {
        const module = this.modules.get(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        const startTime = Date.now();
        let result = null;
        let attempt = 0;

        while (attempt < module.retries) {
            try {
                // Check dependencies
                await this.checkDependencies(module);
                
                // Execute in isolated worker
                result = await this.executeInWorker(module, input, context);
                
                // Update success metrics
                this.updateMetrics(module, true, Date.now() - startTime);
                
                return result;

            } catch (error) {
                attempt++;
                console.log(`Module ${moduleName} failed (attempt ${attempt}/${module.retries}): ${error.message}`);
                
                // Update failure metrics
                this.updateMetrics(module, false, Date.now() - startTime);
                
                // Try fallback if final attempt
                if (attempt >= module.retries && module.fallback) {
                    console.log(`Using fallback: ${module.fallback}`);
                    return await this.executeFallback(module.fallback, input, context);
                }
                
                // If optional module, skip
                if (module.optional) {
                    console.log(`Skipping optional module: ${moduleName}`);
                    return { skipped: true, reason: error.message };
                }
                
                // Wait before retry
                if (attempt < module.retries) {
                    await this.wait(Math.min(1000 * Math.pow(2, attempt), 10000));
                }
            }
        }

        throw new Error(`Module ${moduleName} failed after ${module.retries} attempts`);
    }

    /**
     * Execute module in isolated worker thread
     */
    async executeInWorker(module, input, context) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(`
                const { parentPort } = require('worker_threads');
                const module = require('${module.path}');
                
                parentPort.on('message', async ({ input, context }) => {
                    try {
                        const result = await module.execute(input, context);
                        parentPort.postMessage({ success: true, result });
                    } catch (error) {
                        parentPort.postMessage({ success: false, error: error.message });
                    }
                });
            `, { eval: true });

            const timeout = setTimeout(() => {
                worker.terminate();
                reject(new Error(`Module ${module.name} timed out after ${module.timeout}ms`));
            }, module.timeout);

            worker.on('message', (message) => {
                clearTimeout(timeout);
                worker.terminate();
                
                if (message.success) {
                    resolve(message.result);
                } else {
                    reject(new Error(message.error));
                }
            });

            worker.on('error', (error) => {
                clearTimeout(timeout);
                worker.terminate();
                reject(error);
            });

            worker.postMessage({ input, context });
        });
    }

    /**
     * Execute fallback strategy
     */
    async executeFallback(fallbackName, input, context) {
        const fallbacks = {
            'basic-analyzer': async (input) => ({
                type: 'web-application',
                complexity: 'medium',
                features: this.extractBasicFeatures(input),
                techStack: this.getDefaultTechStack()
            }),
            
            'template-planner': async (input) => ({
                structure: this.getTemplateStructure(input.type),
                tasks: this.getTemplateTasks(input.type),
                dependencies: this.getTemplateDependencies(input.type)
            }),
            
            'template-frontend': async (input) => ({
                files: await this.loadTemplateFiles('frontend', input.techStack?.frontend || 'react')
            }),
            
            'template-backend': async (input) => ({
                files: await this.loadTemplateFiles('backend', input.techStack?.backend || 'express')
            }),
            
            'sqlite-default': async () => ({
                schema: this.getDefaultDatabaseSchema(),
                migrations: []
            }),
            
            'rest-template': async () => ({
                endpoints: this.getDefaultAPIEndpoints(),
                swagger: this.getDefaultSwaggerDoc()
            }),
            
            'basic-tests': async () => ({
                testFiles: this.getBasicTestTemplate(),
                coverage: 'minimal'
            }),
            
            'basic-readme': async (input) => ({
                content: this.generateBasicReadme(input)
            }),
            
            'local-server': async () => ({
                type: 'development',
                port: 3000,
                command: 'pnpm run dev'
            })
        };

        const fallbackFn = fallbacks[fallbackName];
        if (!fallbackFn) {
            throw new Error(`Fallback ${fallbackName} not found`);
        }

        return await fallbackFn(input);
    }

    /**
     * Execute pipeline with parallel processing
     */
    async executePipeline(idea, options = {}) {
        const results = {
            idea,
            timestamp: new Date().toISOString(),
            modules: {},
            status: 'in-progress'
        };

        try {
            // Phase 1: Sequential analysis and planning
            console.log('Phase 1: Analysis and Planning');
            results.modules.analysis = await this.executeModule('idea-analyzer', idea);
            results.modules.plan = await this.executeModule('project-planner', results.modules.analysis);
            
            // Phase 2: Parallel code generation
            console.log('Phase 2: Parallel Code Generation');
            const parallelModules = [
                'frontend-generator',
                'backend-generator',
                'database-generator'
            ];
            
            const parallelResults = await Promise.allSettled(
                parallelModules.map(moduleName => 
                    this.executeModule(moduleName, results.modules.plan)
                )
            );
            
            parallelResults.forEach((result, index) => {
                const moduleName = parallelModules[index];
                results.modules[moduleName] = result.status === 'fulfilled' 
                    ? result.value 
                    : { error: result.reason?.message };
            });
            
            // Phase 3: Dependent modules (can fail)
            console.log('Phase 3: Enhancement Modules');
            const enhancementModules = [
                'api-generator',
                'test-generator',
                'doc-generator'
            ];
            
            for (const moduleName of enhancementModules) {
                try {
                    results.modules[moduleName] = await this.executeModule(
                        moduleName, 
                        results.modules
                    );
                } catch (error) {
                    console.log(`Enhancement module ${moduleName} failed: ${error.message}`);
                    results.modules[moduleName] = { skipped: true, error: error.message };
                }
            }
            
            // Phase 4: Deployment and finalization
            console.log('Phase 4: Deployment and Finalization');
            try {
                results.modules.deployment = await this.executeModule(
                    'deployment-manager', 
                    results.modules
                );
            } catch (error) {
                console.log('Deployment failed, project still generated');
                results.modules.deployment = { failed: true, error: error.message };
            }
            
            // Optional: Git integration
            if (options.git !== false) {
                try {
                    results.modules.git = await this.executeModule('git-manager', results.modules);
                } catch (error) {
                    console.log('Git integration skipped');
                    results.modules.git = { skipped: true };
                }
            }
            
            results.status = 'completed';
            results.success = true;
            
        } catch (error) {
            console.error('Pipeline failed:', error);
            results.status = 'failed';
            results.error = error.message;
            results.success = false;
        }

        return results;
    }

    /**
     * Check module health
     */
    async checkModuleHealth(moduleName) {
        const module = this.modules.get(moduleName);
        if (!module) return;

        // Calculate health score
        const healthScore = this.calculateHealthScore(module);
        
        // Auto-restart if unhealthy
        if (healthScore < 50 && module.failures > 5) {
            console.log(`Restarting unhealthy module: ${moduleName}`);
            await this.restartModule(moduleName);
        }
        
        // Alert if critical module is failing
        if (module.critical && healthScore < 70) {
            this.emit('critical-module-unhealthy', { module: moduleName, healthScore });
        }
    }

    /**
     * Update module metrics
     */
    updateMetrics(module, success, time) {
        if (success) {
            module.failures = 0;
            module.successRate = (module.successRate * 0.9) + 10; // Moving average
        } else {
            module.failures++;
            module.successRate = module.successRate * 0.9;
        }
        
        module.averageTime = (module.averageTime * 0.8) + (time * 0.2);
        module.lastRun = Date.now();
    }

    /**
     * Helper utilities
     */
    extractBasicFeatures(idea) {
        const keywords = idea.toLowerCase().split(/\s+/);
        const features = [];
        
        if (keywords.some(w => ['chat', 'message', 'communication'].includes(w))) {
            features.push('real-time-communication');
        }
        if (keywords.some(w => ['dashboard', 'analytics', 'monitor'].includes(w))) {
            features.push('data-visualization');
        }
        if (keywords.some(w => ['user', 'auth', 'login'].includes(w))) {
            features.push('authentication');
        }
        
        return features.length > 0 ? features : ['basic-application'];
    }

    getDefaultTechStack() {
        return {
            frontend: 'react',
            backend: 'express',
            database: 'sqlite',
            styling: 'tailwind'
        };
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    calculateHealthScore(module) {
        return Math.max(0, Math.min(100, module.successRate));
    }
}

module.exports = ModularOrchestrator;