#!/usr/bin/env node
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.OrchestratorAlpha = void 0;
const orchestrator_1 = require("./orchestrator");
Object.defineProperty(exports, "OrchestratorAlpha", { enumerable: true, get: function () { return orchestrator_1.OrchestratorAlpha; } });
const DEFAULT_CONFIG = {
    maxConcurrentTasks: 4,
    timeoutMinutes: 5,
    retryAttempts: 3,
    agents: {
        'frontend-react-agent': { maxInstances: 2, priority: 1 },
        'frontend-vue-agent': { maxInstances: 2, priority: 1 },
        'frontend-angular-agent': { maxInstances: 1, priority: 1 },
        'backend-nodejs-agent': { maxInstances: 2, priority: 2 },
        'backend-python-agent': { maxInstances: 1, priority: 2 },
        'database-postgresql-agent': { maxInstances: 1, priority: 3 },
        'database-mongodb-agent': { maxInstances: 1, priority: 3 },
        'testing-agent': { maxInstances: 2, priority: 4 },
        'deployment-docker-agent': { maxInstances: 1, priority: 5 },
        'deployment-kubernetes-agent': { maxInstances: 1, priority: 5 }
    }
};
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
async function main() {
    console.log(`
🤖 ORCHESTRATOR-ALPHA v1.0.0
Elite AI Agent Team for Autonomous App Development

🚀 Initializing system...
`);
    const orchestrator = new orchestrator_1.OrchestratorAlpha(DEFAULT_CONFIG);
    try {
        await orchestrator.initialize();
        console.log(`
✅ System initialized successfully!

📊 System Status:
- Agents loaded: ${(await orchestrator.getStatus()).activeAgents}
- Max concurrent tasks: ${DEFAULT_CONFIG.maxConcurrentTasks}
- Timeout: ${DEFAULT_CONFIG.timeoutMinutes} minutes
- System health: ${(await orchestrator.getStatus()).systemHealth}

🎯 Ready to build applications!

📝 Example usage:
   const app = await orchestrator.buildApp("Build a React todo app with user authentication");

💡 To integrate with your application:
   import { OrchestratorAlpha } from 'orchestrator-alpha';
   const orchestrator = new OrchestratorAlpha(config);
   await orchestrator.initialize();
`);
        // Example demonstration
        if (process.argv.includes('--demo')) {
            console.log('\n🔥 Running demonstration...\n');
            await runDemo(orchestrator);
        }
        // Keep process alive for API mode
        if (process.argv.includes('--api')) {
            console.log('\n🌐 Starting API server...\n');
            await startAPIServer(orchestrator);
        }
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down ORCHESTRATOR-ALPHA...');
            await orchestrator.shutdown();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('❌ Failed to initialize ORCHESTRATOR-ALPHA:', error);
        process.exit(1);
    }
}
async function runDemo(orchestrator) {
    const demoApps = [
        "Build a React todo application with user authentication and real-time updates",
        "Create a Vue.js blog platform with markdown support and admin panel",
        "Develop a Node.js API for an e-commerce platform with payment processing"
    ];
    for (const description of demoApps) {
        try {
            console.log(`\n🔨 Building: ${description}\n`);
            const startTime = Date.now();
            const app = await orchestrator.buildApp(description);
            const buildTime = (Date.now() - startTime) / 1000;
            console.log(`✅ Application built successfully!`);
            console.log(`📋 App ID: ${app.id}`);
            console.log(`📊 Files generated: ${Object.keys(app.structure).length}`);
            console.log(`🧪 Test coverage: ${app.metadata.testCoverage}%`);
            console.log(`⏱️  Build time: ${buildTime}s`);
            console.log(`📦 Tech stack: ${JSON.stringify(app.metadata.techStack, null, 2)}`);
        }
        catch (error) {
            console.error(`❌ Failed to build application: ${error}`);
        }
    }
}
async function startAPIServer(orchestrator) {
    const express = require('express');
    const cors = require('cors');
    const app = express();
    const PORT = process.env.PORT || 3333;
    app.use(cors());
    app.use(express.json());
    // Health check
    app.get('/health', async (req, res) => {
        const status = await orchestrator.getStatus();
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            orchestrator: status
        });
    });
    // Build application endpoint
    app.post('/build', async (req, res) => {
        try {
            const { description } = req.body;
            if (!description) {
                return res.status(400).json({
                    success: false,
                    error: 'Description is required'
                });
            }
            console.log(`\n🔨 API Request: Building "${description}"\n`);
            const startTime = Date.now();
            const app = await orchestrator.buildApp(description);
            const buildTime = (Date.now() - startTime) / 1000;
            res.json({
                success: true,
                data: {
                    id: app.id,
                    name: app.name,
                    structure: Object.keys(app.structure),
                    tests: Object.keys(app.tests),
                    documentation: app.documentation,
                    deployment: app.deployment,
                    metadata: app.metadata,
                    buildTime
                }
            });
        }
        catch (error) {
            console.error('❌ Build failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Get application files
    app.get('/apps/:id/files', async (req, res) => {
        // In a real implementation, you'd store and retrieve apps
        res.status(501).json({
            success: false,
            error: 'File retrieval not implemented in demo'
        });
    });
    app.listen(PORT, () => {
        console.log(`
🌐 ORCHESTRATOR-ALPHA API Server running on port ${PORT}

📡 Endpoints:
- GET  /health          - System health check
- POST /build           - Build application
- GET  /apps/:id/files  - Get application files

📝 Example request:
curl -X POST http://localhost:${PORT}/build \\
  -H "Content-Type: application/json" \\
  -d '{"description": "Build a React todo app with authentication"}'
`);
    });
}
// CLI argument parsing
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🤖 ORCHESTRATOR-ALPHA - Elite AI Agent Team for Autonomous App Development

Usage: orchestrator-alpha [options]

Options:
  --help, -h     Show this help message
  --demo         Run demonstration with sample applications
  --api          Start API server mode
  --version, -v  Show version information

Examples:
  orchestrator-alpha --demo     # Run demonstration
  orchestrator-alpha --api      # Start API server
  
Environment Variables:
  PORT                 API server port (default: 3333)
  LOG_LEVEL           Logging level (default: info)
  MAX_CONCURRENT      Max concurrent tasks (default: 4)
  TIMEOUT_MINUTES     Task timeout in minutes (default: 5)
`);
    process.exit(0);
}
if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log('ORCHESTRATOR-ALPHA v1.0.0');
    process.exit(0);
}
// Run main function
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}
__exportStar(require("./types"), exports);
__exportStar(require("./orchestrator"), exports);
//# sourceMappingURL=index.js.map