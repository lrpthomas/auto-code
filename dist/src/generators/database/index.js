"use strict";
// Main Database Generator Exports
// This is the primary entry point for the DATABASE-FOXTROT system
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.DESCRIPTION = exports.NAME = exports.VERSION = exports.DatabaseCLI = exports.PerformanceOptimizer = exports.SchemaValidator = exports.BackupManager = exports.SeedGenerator = exports.MigrationManager = exports.MongooseAdapter = exports.PrismaAdapter = exports.SequelizeAdapter = exports.MongoDBGenerator = exports.PostgreSQLGenerator = exports.DatabaseGenerator = void 0;
exports.createDatabaseGenerator = createDatabaseGenerator;
exports.generateDatabase = generateDatabase;
class DatabaseGenerator {
    config;
    constructor(config) {
        this.config = config;
    }
}
exports.DatabaseGenerator = DatabaseGenerator;
var postgresql_1 = require("./postgresql");
Object.defineProperty(exports, "PostgreSQLGenerator", { enumerable: true, get: function () { return postgresql_1.PostgreSQLGenerator; } });
var mongodb_1 = require("./mongodb");
Object.defineProperty(exports, "MongoDBGenerator", { enumerable: true, get: function () { return mongodb_1.MongoDBGenerator; } });
// ORM Adapters
var sequelize_adapter_1 = require("./orm/sequelize-adapter");
Object.defineProperty(exports, "SequelizeAdapter", { enumerable: true, get: function () { return sequelize_adapter_1.SequelizeAdapter; } });
var prisma_adapter_1 = require("./orm/prisma-adapter");
Object.defineProperty(exports, "PrismaAdapter", { enumerable: true, get: function () { return prisma_adapter_1.PrismaAdapter; } });
var mongoose_adapter_1 = require("./orm/mongoose-adapter");
Object.defineProperty(exports, "MongooseAdapter", { enumerable: true, get: function () { return mongoose_adapter_1.MongooseAdapter; } });
// Utility modules
var migration_manager_1 = require("./utils/migration-manager");
Object.defineProperty(exports, "MigrationManager", { enumerable: true, get: function () { return migration_manager_1.MigrationManager; } });
var seed_generator_1 = require("./utils/seed-generator");
Object.defineProperty(exports, "SeedGenerator", { enumerable: true, get: function () { return seed_generator_1.SeedGenerator; } });
var backup_manager_1 = require("./utils/backup-manager");
Object.defineProperty(exports, "BackupManager", { enumerable: true, get: function () { return backup_manager_1.BackupManager; } });
// Validation and optimization
var schema_validator_1 = require("./validation/schema-validator");
Object.defineProperty(exports, "SchemaValidator", { enumerable: true, get: function () { return schema_validator_1.SchemaValidator; } });
var performance_optimizer_1 = require("./optimization/performance-optimizer");
Object.defineProperty(exports, "PerformanceOptimizer", { enumerable: true, get: function () { return performance_optimizer_1.PerformanceOptimizer; } });
// Templates
__exportStar(require("./templates"), exports);
// CLI (for programmatic access)
var database_cli_1 = require("./cli/database-cli");
Object.defineProperty(exports, "DatabaseCLI", { enumerable: true, get: function () { return database_cli_1.program; } });
// Factory function for creating generators
function createDatabaseGenerator(config) {
    switch (config.type) {
        case 'postgresql':
            return new PostgreSQLGenerator(config);
        case 'mongodb':
            return new MongoDBGenerator(config);
        default:
            throw new Error(`Unsupported database type: ${config.type}`);
    }
}
// Helper function for full database generation workflow
async function generateDatabase(options) {
    const { getTemplateInfo, AVAILABLE_TEMPLATES } = await Promise.resolve().then(() => __importStar(require('./templates')));
    // Get template
    const templateInfo = getTemplateInfo(options.template);
    const template = await templateInfo.generator();
    // Create generator
    const config = {
        type: options.database,
        name: template.name.toLowerCase().replace(/\s+/g, '_'),
        options: {}
    };
    const generator = createDatabaseGenerator(config);
    // Validate schema
    const validator = new SchemaValidator();
    const validation = validator.validateSchema(template);
    if (!validation.isValid) {
        throw new Error(`Schema validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    // Optimize if requested
    let finalTemplate = template;
    if (options.optimize) {
        const optimizer = new PerformanceOptimizer(template);
        finalTemplate = optimizer.generateOptimizedSchema();
    }
    // Generate all files
    const results = {
        schema: await generator.generateSchema(finalTemplate),
        validation: validator.generateValidationSchema(finalTemplate, options.validation || 'zod'),
        connectionPool: await generator.generateConnectionPool(),
        queryBuilder: await generator.generateQueryBuilder(),
        backupScript: await generator.generateBackupScript(),
        seeds: null,
        migration: null,
        orm: null
    };
    // Generate seeds
    const seedGenerator = new SeedGenerator(generator);
    const seedTemplate = seedGenerator.generateSeedTemplate(finalTemplate);
    results.seeds = await seedGenerator.generateSeeds(finalTemplate, seedTemplate);
    // Generate migration utilities
    const migrationManager = new MigrationManager(generator);
    results.migration = migrationManager.generateMigrationSchema();
    // Generate ORM files if requested
    if (options.orm) {
        switch (options.orm) {
            case 'sequelize':
                if (options.database === 'postgresql') {
                    const adapter = new SequelizeAdapter({
                        dialect: 'postgres',
                        host: 'localhost',
                        port: 5432,
                        database: config.name,
                        username: 'postgres',
                        password: ''
                    });
                    results.orm = {
                        models: adapter.generateModels(finalTemplate),
                        repositories: adapter.generateRepositoryPattern(finalTemplate),
                        services: adapter.generateServiceLayer(finalTemplate)
                    };
                }
                break;
            case 'prisma':
                if (options.database === 'postgresql') {
                    const adapter = new PrismaAdapter({
                        provider: 'postgresql',
                        url: `postgresql://localhost:5432/${config.name}`
                    });
                    results.orm = {
                        schema: adapter.generateSchema(finalTemplate),
                        client: adapter.generateClientCode(finalTemplate),
                        repositories: adapter.generateRepositoryPattern(finalTemplate)
                    };
                }
                break;
            case 'mongoose':
                if (options.database === 'mongodb') {
                    const adapter = new MongooseAdapter({
                        uri: `mongodb://localhost:27017/${config.name}`
                    });
                    results.orm = {
                        models: adapter.generateModels(finalTemplate),
                        repositories: adapter.generateRepositoryPattern(finalTemplate),
                        services: adapter.generateServiceLayer(finalTemplate)
                    };
                }
                break;
        }
    }
    return {
        template: finalTemplate,
        files: results,
        validation
    };
}
// Version info
exports.VERSION = '1.0.0';
exports.NAME = 'DATABASE-FOXTROT';
exports.DESCRIPTION = 'Elite database architecture specialist for autonomous app development';
//# sourceMappingURL=index.js.map