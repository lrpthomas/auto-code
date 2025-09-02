#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseGenerator, SchemaTemplate, DatabaseConfig, TableConfig } from '../index';
import { PostgreSQLGenerator } from '../postgresql';
import { MongoDBGenerator } from '../mongodb';
import { SequelizeAdapter } from '../orm/sequelize-adapter';
import { PrismaAdapter } from '../orm/prisma-adapter';
import { MongooseAdapter } from '../orm/mongoose-adapter';
import { SchemaValidator } from '../validation/schema-validator';
import { PerformanceOptimizer } from '../optimization/performance-optimizer';
import { SeedGenerator } from '../utils/seed-generator';
import { MigrationManager } from '../utils/migration-manager';
import { generateEcommerceSchema } from '../templates/ecommerce-template';
import { generateBlogSchema } from '../templates/blog-template';
import { generateSaasSchema } from '../templates/saas-template';

const program = new Command();

// Add missing export at top to fix reference
export { program };

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
  .action(async (options: any) => {
    try {
      console.log('🚀 Starting database generation...\n');
      
      // Get template
      const template = getTemplate(options.template);
      console.log(`📋 Using template: ${template.name}`);
      
      // Create generator
      const config: DatabaseConfig = {
        type: options.database as 'postgresql' | 'mongodb',
        name: template.name.toLowerCase().replace(/\s+/g, '_'),
        options: {}
      };
      
      const generator = createGenerator(config);
      console.log(`🗄️  Database type: ${options.database}`);
      
      // Validate schema
      console.log('🔍 Validating schema...');
      const validator = new SchemaValidator();
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
        const optimizer = new PerformanceOptimizer(template);
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
      } else if (options.database === 'mongodb') {
        console.log('🔧 Generating Mongoose models...');
        await generateORM('mongoose', finalTemplate, outputDir, config);
      }
      
      // Generate validation schemas
      console.log(`✅ Generating ${options.validation} validation schemas...`);
      const validationSchema = validator.generateValidationSchema(finalTemplate, options.validation as 'zod' | 'joi' | 'yup');
      const validationFile = path.join(outputDir, `validation.${options.validation === 'zod' ? 'ts' : 'js'}`);
      await fs.promises.writeFile(validationFile, validationSchema);
      console.log(`✅ Validation schema written to: ${validationFile}`);
      
      // Generate migrations
      console.log('📦 Generating migration utilities...');
      const migrationManager = new MigrationManager(generator);
      const migrationSchema = migrationManager.generateMigrationSchema();
      const migrationFile = path.join(outputDir, `migration-schema.${options.database === 'postgresql' ? 'sql' : 'js'}`);
      await fs.promises.writeFile(migrationFile, migrationSchema);
      
      // Generate seed data
      console.log('🌱 Generating seed data...');
      const seedGenerator = new SeedGenerator(generator);
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
        const optimizer = new PerformanceOptimizer(finalTemplate);
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
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate <schema>')
  .description('Validate a schema file')
  .option('--format <format>', 'Schema format (json, yaml)', 'json')
  .action(async (schemaPath: string, _options: any) => {
    try {
      console.log(`🔍 Validating schema: ${schemaPath}`);
      
      const schemaContent = await fs.promises.readFile(schemaPath, 'utf8');
      const template: SchemaTemplate = JSON.parse(schemaContent);
      
      const validator = new SchemaValidator();
      const result = validator.validateSchema(template);
      
      if (result.isValid) {
        console.log('✅ Schema is valid!');
        if (result.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          result.warnings.forEach(warning => {
            console.log(`  - ${warning.table}: ${warning.message}`);
          });
        }
      } else {
        console.log('❌ Schema validation failed:');
        result.errors.forEach(error => {
          console.error(`  - ${error.table}.${error.field}: ${error.message}`);
        });
        process.exit(1);
      }
      
    } catch (error) {
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
  .action(async (schemaPath: string, options: any) => {
    try {
      console.log(`⚡ Analyzing schema: ${schemaPath}`);
      
      const schemaContent = await fs.promises.readFile(schemaPath, 'utf8');
      const template: SchemaTemplate = JSON.parse(schemaContent);
      
      const optimizer = new PerformanceOptimizer(template);
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
      
    } catch (error) {
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
  .action(async (options: any) => {
    try {
      console.log('🌱 Generating seed data...');
      
      const schemaContent = await fs.promises.readFile(options.schema, 'utf8');
      const template: SchemaTemplate = JSON.parse(schemaContent);
      
      const config: DatabaseConfig = {
        type: options.database as 'postgresql' | 'mongodb',
        name: template.name,
        options: {}
      };
      
      const generator = createGenerator(config);
      const seedGenerator = new SeedGenerator(generator);
      
      // Generate seed configs
      const seedConfigs = template.tables.map((table: TableConfig) => ({
        table: table.name,
        count: parseInt(options.count)
      }));
      
      const seedData = await seedGenerator.generateSeeds(template, seedConfigs);
      await fs.promises.writeFile(options.output, seedData);
      
      console.log(`✅ Seed data written to: ${options.output}`);
      
    } catch (error) {
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
  .action(async (_options: any) => {
    try {
      console.log('📦 Migration utilities - Feature in development');
      console.log('This will integrate with your existing migration system');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  });

// Helper functions
function getTemplate(templateName: string): SchemaTemplate {
  switch (templateName.toLowerCase()) {
    case 'ecommerce':
    case 'e-commerce':
      return generateEcommerceSchema();
    case 'blog':
      return generateBlogSchema();
    case 'saas':
      return generateSaasSchema();
    default:
      throw new Error(`Unknown template: ${templateName}. Available templates: ecommerce, blog, saas`);
  }
}

function createGenerator(config: DatabaseConfig): DatabaseGenerator {
  switch (config.type) {
    case 'postgresql':
      return new PostgreSQLGenerator(config);
    case 'mongodb':
      return new MongoDBGenerator(config);
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

async function generateORM(ormType: string, template: SchemaTemplate, outputDir: string, config: DatabaseConfig): Promise<void> {
  switch (ormType.toLowerCase()) {
    case 'sequelize':
      const sequelizeAdapter = new SequelizeAdapter({
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
      const prismaAdapter = new PrismaAdapter({
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
      const mongooseAdapter = new MongooseAdapter({
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

async function ensureDirectory(dir: string): Promise<void> {
  try {
    await fs.promises.access(dir);
  } catch {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

function generateReadme(template: SchemaTemplate, options: any): string {
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