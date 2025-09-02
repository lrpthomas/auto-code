// Main Database Generator Exports
// This is the primary entry point for the DATABASE-FOXTROT system

// Core interfaces and types - avoiding circular imports
export interface DatabaseConfig {
  type: 'postgresql' | 'mongodb';
  name: string;
  options?: Record<string, any>;
}

export interface TableConfig {
  name: string;
  fields: FieldConfig[];
  indexes?: IndexConfig[];
  relationships?: RelationshipConfig[];
}

export interface FieldConfig {
  name: string;
  type: string;
  constraints?: ConstraintConfig[];
  default?: any;
  nullable?: boolean;
}

export interface IndexConfig {
  name: string;
  fields: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface RelationshipConfig {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  table: string;
  foreignKey: string;
  onDelete?: 'cascade' | 'restrict' | 'set null';
  onUpdate?: 'cascade' | 'restrict' | 'set null';
}

export interface ConstraintConfig {
  type: 'primary' | 'foreign' | 'unique' | 'check' | 'not null';
  value?: any;
  references?: {
    table: string;
    field: string;
  };
}

export interface SchemaTemplate {
  name: string;
  description: string;
  tables: TableConfig[];
  procedures?: StoredProcedureConfig[];
  triggers?: TriggerConfig[];
}

export interface StoredProcedureConfig {
  name: string;
  parameters: ParameterConfig[];
  body: string;
  returns?: string;
}

export interface TriggerConfig {
  name: string;
  table: string;
  event: 'before' | 'after';
  action: 'insert' | 'update' | 'delete';
  function: string;
}

export interface ParameterConfig {
  name: string;
  type: string;
  direction?: 'in' | 'out' | 'inout';
}

export abstract class DatabaseGenerator {
  protected config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract generateSchema(template: SchemaTemplate): Promise<string>;
  abstract generateMigration(from: SchemaTemplate, to: SchemaTemplate): Promise<string>;
  abstract generateSeeds(template: SchemaTemplate, data: Record<string, any[]>): Promise<string>;
  abstract generateBackupScript(): Promise<string>;
  abstract generateConnectionPool(): Promise<string>;
  abstract generateQueryBuilder(): Promise<string>;
}
export { PostgreSQLGenerator } from './postgresql';
export { MongoDBGenerator } from './mongodb';

// ORM Adapters
export { SequelizeAdapter } from './orm/sequelize-adapter';
export { PrismaAdapter } from './orm/prisma-adapter';
export { MongooseAdapter } from './orm/mongoose-adapter';

// Utility modules
export { MigrationManager } from './utils/migration-manager';
export { SeedGenerator } from './utils/seed-generator';
export { BackupManager } from './utils/backup-manager';

// Validation and optimization
export { SchemaValidator } from './validation/schema-validator';
export { PerformanceOptimizer } from './optimization/performance-optimizer';

// Templates
export * from './templates';

// CLI (for programmatic access)
export { program as DatabaseCLI } from './cli/database-cli';

// Factory function for creating generators
export function createDatabaseGenerator(config: DatabaseConfig): DatabaseGenerator {
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
export async function generateDatabase(options: {
  template: string;
  database: 'postgresql' | 'mongodb';
  orm?: 'sequelize' | 'prisma' | 'mongoose';
  validation?: 'zod' | 'joi' | 'yup';
  optimize?: boolean;
  outputDir: string;
}) {
  const { getTemplateInfo } = await import('./templates');
  
  // Get template
  const templateInfo = getTemplateInfo(options.template);
  const template = await templateInfo.generator();
  
  // Create generator
  const config: DatabaseConfig = {
    type: options.database,
    name: template.name.toLowerCase().replace(/\s+/g, '_'),
    options: {}
  };
  
  const generator = createDatabaseGenerator(config);
  
  // Import validation and optimization modules
  const { SchemaValidator } = await import('./validation/schema-validator');
  const { PerformanceOptimizer } = await import('./optimization/performance-optimizer');
  
  // Validate schema
  const validator = new SchemaValidator();
  const validation = validator.validateSchema(template);
  
  if (!validation.isValid) {
    throw new Error(`Schema validation failed: ${validation.errors.map((e: any) => e.message).join(', ')}`);
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
    seeds: null as string | null,
    migration: null as string | null,
    orm: null as any
  };
  
  // Import utility modules
  const { SeedGenerator } = await import('./utils/seed-generator');
  const { MigrationManager } = await import('./utils/migration-manager');
  
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
          const { SequelizeAdapter } = await import('./orm/sequelize-adapter');
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
          const { PrismaAdapter } = await import('./orm/prisma-adapter');
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
          const { MongooseAdapter } = await import('./orm/mongoose-adapter');
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
export const VERSION = '1.0.0';
export const NAME = 'DATABASE-FOXTROT';
export const DESCRIPTION = 'Elite database architecture specialist for autonomous app development';