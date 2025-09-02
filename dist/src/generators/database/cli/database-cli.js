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
exports.program = void 0;
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const postgresql_1 = require("../postgresql");
const mongodb_1 = require("../mongodb");
const sequelize_adapter_1 = require("../orm/sequelize-adapter");
const prisma_adapter_1 = require("../orm/prisma-adapter");
const mongoose_adapter_1 = require("../orm/mongoose-adapter");
const schema_validator_1 = require("../validation/schema-validator");
const performance_optimizer_1 = require("../optimization/performance-optimizer");
const seed_generator_1 = require("../utils/seed-generator");
const migration_manager_1 = require("../utils/migration-manager");
const ecommerce_template_1 = require("../templates/ecommerce-template");
const blog_template_1 = require("../templates/blog-template");
const saas_template_1 = require("../templates/saas-template");
const program = new commander_1.Command();
exports.program = program;
program
    .name('dbgen')
    .description('Database schema generator and management tool')
    .version('1.0.0');
// Generate command
program
    .command('generate')
    .alias('gen')
    .description('Generate database schema and related files')
    .option('-t, --template <template>', 'Template to use (ecommerce, blog, saas)', 'ecommerce')
    .option('-d, --database <database>', 'Database type (postgresql, mongodb)', 'postgresql')
    .option('-o, --output <output>', 'Output directory', './generated')
    .option('--orm <orm>', 'ORM to generate (sequelize, prisma, mongoose)', 'sequelize')
    .option('--validation <validation>', 'Validation library (zod, joi, yup)', 'zod')
    .option('--optimize', 'Apply performance optimizations', false)
    .action(async (options) => {
    try {
        console.log('🚀 Starting database generation...\n');
        // Get template
        const template = getTemplate(options.template);
        console.log(`📋 Using template: ${template.name}`);
        // Create generator
        const config = {
            type: options.database,
            name: template.name.toLowerCase().replace(/\s+/g, '_'),
            options: {}
        };
        const generator = createGenerator(config);
        console.log(`🗄️  Database type: ${options.database}`);
        // Validate schema
        console.log('🔍 Validating schema...');
        const validator = new schema_validator_1.SchemaValidator();
        const validation = validator.validateSchema(template);
        if (!validation.isValid) {
            console.error('❌ Schema validation failed:');
            validation.errors.forEach(error => {
                console.error(`  - ${error.table}.${error.field}: ${error.message}`);
            });
            process.exit(1);
        }
        if (validation.warnings.length > 0) {
            console.log('⚠️  Schema warnings:');
            validation.warnings.forEach(warning => {
                console.log(`  - ${warning.table}: ${warning.message}`);
            });
        }
        // Optimize if requested
        let finalTemplate = template;
        if (options.optimize) {
            console.log('⚡ Optimizing schema...');
            const optimizer = new performance_optimizer_1.PerformanceOptimizer(template);
            finalTemplate = optimizer.generateOptimizedSchema();
            const analysis = optimizer.analyzePerformance();
            console.log(`📊 Performance score: ${analysis.score}/100`);
        }
        // Create output directory
        const outputDir = path.resolve(options.output);
        await ensureDirectory(outputDir);
        // Generate main schema
        console.log('🏗️  Generating database schema...');
        const schema = await generator.generateSchema(finalTemplate);
        const schemaFile = path.join(outputDir, `schema.${options.database === 'postgresql' ? 'sql' : 'js'}`);
        await fs.promises.writeFile(schemaFile, schema);
        console.log(`✅ Schema written to: ${schemaFile}`);
        // Generate ORM files
        if (options.orm && options.database === 'postgresql') {
            console.log(`🔧 Generating ${options.orm} models...`);
            await generateORM(options.orm, finalTemplate, outputDir, config);
        }
        else if (options.database === 'mongodb') {
            console.log('🔧 Generating Mongoose models...');
            await generateORM('mongoose', finalTemplate, outputDir, config);
        }
        // Generate validation schemas
        console.log(`✅ Generating ${options.validation} validation schemas...`);
        const validationSchema = validator.generateValidationSchema(finalTemplate, options.validation);
        const validationFile = path.join(outputDir, `validation.${options.validation === 'zod' ? 'ts' : 'js'}`);
        await fs.promises.writeFile(validationFile, validationSchema);
        console.log(`✅ Validation schema written to: ${validationFile}`);
        // Generate migrations
        console.log('📦 Generating migration utilities...');
        const migrationManager = new migration_manager_1.MigrationManager(generator);
        const migrationSchema = migrationManager.generateMigrationSchema();
        const migrationFile = path.join(outputDir, `migration-schema.${options.database === 'postgresql' ? 'sql' : 'js'}`);
        await fs.promises.writeFile(migrationFile, migrationSchema);
        // Generate seed data
        console.log('🌱 Generating seed data...');
        const seedGenerator = new seed_generator_1.SeedGenerator(generator);
        const seedTemplate = seedGenerator.generateSeedTemplate(finalTemplate);
        const seedData = await seedGenerator.generateSeeds(finalTemplate, seedTemplate);
        const seedFile = path.join(outputDir, `seeds.${options.database === 'postgresql' ? 'sql' : 'js'}`);
        await fs.promises.writeFile(seedFile, seedData);
        // Generate backup scripts
        console.log('💾 Generating backup scripts...');
        const backupScript = await generator.generateBackupScript();
        const backupFile = path.join(outputDir, 'backup.sh');
        await fs.promises.writeFile(backupFile, backupScript, { mode: 0o755 });
        // Generate connection pool
        console.log('🔌 Generating connection utilities...');
        const connectionPool = await generator.generateConnectionPool();
        const connectionFile = path.join(outputDir, `connection.${options.database === 'postgresql' ? 'ts' : 'ts'}`);
        await fs.promises.writeFile(connectionFile, connectionPool);
        // Generate query builder
        console.log('🔨 Generating query builder...');
        const queryBuilder = await generator.generateQueryBuilder();
        const queryBuilderFile = path.join(outputDir, `query-builder.ts`);
        await fs.promises.writeFile(queryBuilderFile, queryBuilder);
        // Generate performance report if optimized
        if (options.optimize) {
            console.log('📈 Generating performance report...');
            const optimizer = new performance_optimizer_1.PerformanceOptimizer(finalTemplate);
            const report = optimizer.generatePerformanceReport();
            const reportFile = path.join(outputDir, 'performance-report.md');
            await fs.promises.writeFile(reportFile, report);
        }
        // Generate README
        console.log('📚 Generating documentation...');
        const readme = generateReadme(finalTemplate, options);
        const readmeFile = path.join(outputDir, 'README.md');
        await fs.promises.writeFile(readmeFile, readme);
        console.log('\n🎉 Database generation completed successfully!');
        console.log(`📁 Files generated in: ${outputDir}`);
        console.log('\n📋 Generated files:');
        const files = await fs.promises.readdir(outputDir);
        files.forEach(file => console.log(`  - ${file}`));
    }
    catch (error) {
        console.error('❌ Generation failed:', error);
        process.exit(1);
    }
});
// Validate command
program
    .command('validate <schema>')
    .description('Validate a schema file')
    .option('--format <format>', 'Schema format (json, yaml)', 'json')
    .action(async (schemaPath, options) => {
    try {
        console.log(`🔍 Validating schema: ${schemaPath}`);
        const schemaContent = await fs.promises.readFile(schemaPath, 'utf8');
        const template = JSON.parse(schemaContent);
        const validator = new schema_validator_1.SchemaValidator();
        const result = validator.validateSchema(template);
        if (result.isValid) {
            console.log('✅ Schema is valid!');
            if (result.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                result.warnings.forEach(warning => {
                    console.log(`  - ${warning.table}: ${warning.message}`);
                });
            }
        }
        else {
            console.log('❌ Schema validation failed:');
            result.errors.forEach(error => {
                console.error(`  - ${error.table}.${error.field}: ${error.message}`);
            });
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
});
// Optimize command
program
    .command('optimize <schema>')
    .description('Analyze and optimize schema performance')
    .option('-o, --output <output>', 'Output file for optimized schema')
    .option('--report', 'Generate performance report', false)
    .action(async (schemaPath, options) => {
    try {
        console.log(`⚡ Analyzing schema: ${schemaPath}`);
        const schemaContent = await fs.promises.readFile(schemaPath, 'utf8');
        const template = JSON.parse(schemaContent);
        const optimizer = new performance_optimizer_1.PerformanceOptimizer(template);
        const analysis = optimizer.analyzePerformance();
        console.log(`\n📊 Performance Analysis:`);
        console.log(`Score: ${analysis.score}/100`);
        console.log(`Suggestions: ${analysis.suggestions.length}`);
        if (analysis.suggestions.length > 0) {
            console.log('\n🔧 Optimization Suggestions:');
            analysis.suggestions.slice(0, 5).forEach(suggestion => {
                console.log(`  - ${suggestion.priority.toUpperCase()}: ${suggestion.description}`);
            });
        }
        if (options.output) {
            const optimizedTemplate = optimizer.generateOptimizedSchema();
            await fs.promises.writeFile(options.output, JSON.stringify(optimizedTemplate, null, 2));
            console.log(`\n✅ Optimized schema written to: ${options.output}`);
        }
        if (options.report) {
            const report = optimizer.generatePerformanceReport();
            const reportPath = schemaPath.replace('.json', '-performance-report.md');
            await fs.promises.writeFile(reportPath, report);
            console.log(`📈 Performance report written to: ${reportPath}`);
        }
    }
    catch (error) {
        console.error('❌ Optimization failed:', error);
        process.exit(1);
    }
});
// Seed command
program
    .command('seed')
    .description('Generate seed data for database')
    .option('-s, --schema <schema>', 'Schema file to use', './schema.json')
    .option('-d, --database <database>', 'Database type (postgresql, mongodb)', 'postgresql')
    .option('-c, --count <count>', 'Number of records per table', '10')
    .option('-o, --output <output>', 'Output file', './seeds.sql')
    .action(async (options) => {
    try {
        console.log('🌱 Generating seed data...');
        const schemaContent = await fs.promises.readFile(options.schema, 'utf8');
        const template = JSON.parse(schemaContent);
        const config = {
            type: options.database,
            name: template.name,
            options: {}
        };
        const generator = createGenerator(config);
        const seedGenerator = new seed_generator_1.SeedGenerator(generator);
        // Generate seed configs
        const seedConfigs = template.tables.map((table) => ({
            table: table.name,
            count: parseInt(options.count)
        }));
        const seedData = await seedGenerator.generateSeeds(template, seedConfigs);
        await fs.promises.writeFile(options.output, seedData);
        console.log(`✅ Seed data written to: ${options.output}`);
    }
    catch (error) {
        console.error('❌ Seed generation failed:', error);
        process.exit(1);
    }
});
// Migration command
program
    .command('migration')
    .description('Database migration utilities')
    .option('--create <name>', 'Create a new migration')
    .option('--run', 'Run pending migrations')
    .option('--rollback <steps>', 'Rollback migrations')
    .option('--status', 'Show migration status')
    .action(async (options) => {
    try {
        console.log('📦 Migration utilities - Feature in development');
        console.log('This will integrate with your existing migration system');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
});
// Helper functions
function getTemplate(templateName) {
    switch (templateName.toLowerCase()) {
        case 'ecommerce':
        case 'e-commerce':
            return (0, ecommerce_template_1.generateEcommerceSchema)();
        case 'blog':
            return (0, blog_template_1.generateBlogSchema)();
        case 'saas':
            return (0, saas_template_1.generateSaasSchema)();
        default:
            throw new Error(`Unknown template: ${templateName}. Available templates: ecommerce, blog, saas`);
    }
}
function createGenerator(config) {
    switch (config.type) {
        case 'postgresql':
            return new postgresql_1.PostgreSQLGenerator(config);
        case 'mongodb':
            return new mongodb_1.MongoDBGenerator(config);
        default:
            throw new Error(`Unsupported database type: ${config.type}`);
    }
}
async function generateORM(ormType, template, outputDir, config) {
    switch (ormType.toLowerCase()) {
        case 'sequelize':
            const sequelizeAdapter = new sequelize_adapter_1.SequelizeAdapter({
                dialect: 'postgres',
                host: 'localhost',
                port: 5432,
                database: config.name,
                username: 'postgres',
                password: ''
            });
            const sequelizeModels = sequelizeAdapter.generateModels(template);
            await fs.promises.writeFile(path.join(outputDir, 'sequelize-models.ts'), sequelizeModels);
            const sequelizeRepos = sequelizeAdapter.generateRepositoryPattern(template);
            await fs.promises.writeFile(path.join(outputDir, 'sequelize-repositories.ts'), sequelizeRepos);
            const sequelizeServices = sequelizeAdapter.generateServiceLayer(template);
            await fs.promises.writeFile(path.join(outputDir, 'sequelize-services.ts'), sequelizeServices);
            break;
        case 'prisma':
            const prismaAdapter = new prisma_adapter_1.PrismaAdapter({
                provider: 'postgresql',
                url: `postgresql://localhost:5432/${config.name}`
            });
            const prismaSchema = prismaAdapter.generateSchema(template);
            await fs.promises.writeFile(path.join(outputDir, 'schema.prisma'), prismaSchema);
            const prismaClient = prismaAdapter.generateClientCode(template);
            await fs.promises.writeFile(path.join(outputDir, 'prisma-client.ts'), prismaClient);
            const prismaRepos = prismaAdapter.generateRepositoryPattern(template);
            await fs.promises.writeFile(path.join(outputDir, 'prisma-repositories.ts'), prismaRepos);
            break;
        case 'mongoose':
            const mongooseAdapter = new mongoose_adapter_1.MongooseAdapter({
                uri: `mongodb://localhost:27017/${config.name}`
            });
            const mongooseModels = mongooseAdapter.generateModels(template);
            await fs.promises.writeFile(path.join(outputDir, 'mongoose-models.ts'), mongooseModels);
            const mongooseRepos = mongooseAdapter.generateRepositoryPattern(template);
            await fs.promises.writeFile(path.join(outputDir, 'mongoose-repositories.ts'), mongooseRepos);
            const mongooseServices = mongooseAdapter.generateServiceLayer(template);
            await fs.promises.writeFile(path.join(outputDir, 'mongoose-services.ts'), mongooseServices);
            break;
        default:
            console.log(`⚠️  Unknown ORM: ${ormType}`);
    }
}
async function ensureDirectory(dir) {
    try {
        await fs.promises.access(dir);
    }
    catch {
        await fs.promises.mkdir(dir, { recursive: true });
    }
}
function generateReadme(template, options) {
    const dbName = template.name.toLowerCase().replace(/\s+/g, '_');
    return `# ${template.name} Database

${template.description}

## Generated Files

- \`schema.${options.database === 'postgresql' ? 'sql' : 'js'}\` - Main database schema
- \`validation.${options.validation}.ts\` - Data validation schemas
- \`connection.ts\` - Database connection utilities
- \`query-builder.ts\` - Query builder utilities
- \`seeds.${options.database === 'postgresql' ? 'sql' : 'js'}\` - Sample data
- \`backup.sh\` - Backup script
- \`migration-schema.${options.database === 'postgresql' ? 'sql' : 'js'}\` - Migration utilities

${options.orm ? `- \`${options.orm}-models.ts\` - ORM models and repositories` : ''}
${options.optimize ? `- \`performance-report.md\` - Performance analysis` : ''}

## Setup

1. Create your database:
\`\`\`bash
${options.database === 'postgresql' ?
        `createdb ${dbName}` :
        `mongo ${dbName}`}
\`\`\`

2. Run the schema:
\`\`\`bash
${options.database === 'postgresql' ?
        `psql ${dbName} < schema.sql` :
        `mongo ${dbName} schema.js`}
\`\`\`

3. Load seed data:
\`\`\`bash
${options.database === 'postgresql' ?
        `psql ${dbName} < seeds.sql` :
        `mongo ${dbName} seeds.js`}
\`\`\`

## Usage

See the generated model files for usage examples with ${options.orm || 'your ORM'}.

Generated with DATABASE-FOXTROT v1.0.0
`;
}
// Run the CLI
if (require.main === module) {
    program.parse();
}
//# sourceMappingURL=database-cli.js.map