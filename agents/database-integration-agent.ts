import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import { Pool } from 'pg';
import mongoose from 'mongoose';

export default class DatabaseIntegrationAgent implements Agent {
  id = 'database-integration-agent';
  name = 'Database Integration Specialist';
  type = 'database';
  description = 'Handles database design, ORM setup, migrations, and data modeling';
  capabilities = ['postgresql', 'mongodb', 'mysql', 'prisma', 'mongoose', 'sequelize', 'migrations', 'schemas'];
  version = '2.0.0';

  private supportedDatabases = ['postgresql', 'mongodb', 'mysql', 'sqlite'];
  private supportedORMs = ['prisma', 'mongoose', 'sequelize', 'typeorm'];

  async initialize(): Promise<void> {
    console.log('Database Integration Specialist initialized');
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const requirements = task.requirements;
    const context = task.context || {};
    
    try {
      const databaseSystem = await this.generateDatabaseSystem(requirements, context);
      
      return {
        success: true,
        data: databaseSystem,
        metadata: {
          agent: this.id,
          timestamp: new Date(),
          databaseType: this.detectDatabaseType(requirements),
          ormChoice: this.selectORM(requirements),
          migrations: true,
          indexing: true
        }
      };
    } catch (error) {
      console.error('Database integration failed:', error);
      throw error;
    }
  }

  private async generateDatabaseSystem(requirements: AppRequirements, context: any): Promise<any> {
    const dbType = this.detectDatabaseType(requirements);
    const orm = this.selectORM(requirements);
    
    return {
      config: this.generateDatabaseConfig(dbType),
      schema: this.generateSchema(requirements, dbType, orm),
      models: this.generateModels(requirements, orm),
      migrations: this.generateMigrations(requirements, dbType),
      seeds: this.generateSeeds(requirements),
      queries: this.generateQueries(requirements, orm),
      indexes: this.generateIndexes(requirements),
      connections: this.generateConnectionManager(dbType),
      utilities: this.generateDatabaseUtils(dbType, orm)
    };
  }

  private generateDatabaseConfig(dbType: string): string {
    const configs = {
      postgresql: this.generatePostgreSQLConfig(),
      mongodb: this.generateMongoDBConfig(),
      mysql: this.generateMySQLConfig(),
      sqlite: this.generateSQLiteConfig()
    };

    return configs[dbType as keyof typeof configs] || configs.postgresql;
  }

  private generatePostgreSQLConfig(): string {
    return `// PostgreSQL Database Configuration
import { Pool, PoolConfig } from 'pg';
import { Sequelize } from 'sequelize';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

export const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'app_database',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  pool: {
    max: 20,
    min: 2,
    acquire: 30000,
    idle: 10000
  }
};

// PostgreSQL Connection Pool
export const pgPool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.username,
  password: dbConfig.password,
  ssl: dbConfig.ssl,
  max: dbConfig.pool?.max || 20,
  min: dbConfig.pool?.min || 2,
  idleTimeoutMillis: dbConfig.pool?.idle || 10000,
  connectionTimeoutMillis: dbConfig.pool?.acquire || 30000,
});

// Sequelize Instance
export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: dbConfig.pool,
    dialectOptions: {
      ssl: dbConfig.ssl
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL:', error);
    return false;
  }
}

// Close database connection
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pgPool.end();
    await sequelize.close();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}`;
  }

  private generateMongoDBConfig(): string {
    return `// MongoDB Database Configuration
import mongoose from 'mongoose';

interface MongoConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

export const mongoConfig: MongoConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/app_database',
  options: {
    maxPoolSize: 20,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    bufferMaxEntries: 0,
    retryWrites: true,
    retryReads: true
  }
};

// MongoDB Connection Manager
export class MongoConnection {
  private static instance: MongoConnection;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): MongoConnection {
    if (!MongoConnection.instance) {
      MongoConnection.instance = new MongoConnection();
    }
    return MongoConnection.instance;
  }

  public async connect(): Promise<boolean> {
    try {
      if (this.isConnected) {
        return true;
      }

      await mongoose.connect(mongoConfig.uri, mongoConfig.options);
      this.isConnected = true;
      
      console.log('✅ MongoDB connection established successfully');
      
      // Set up connection event handlers
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
        this.isConnected = true;
      });

      return true;
    } catch (error) {
      console.error('❌ Unable to connect to MongoDB:', error);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }

  public isMongoConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export const mongoConnection = MongoConnection.getInstance();

// Test MongoDB connection
export async function testDatabaseConnection(): Promise<boolean> {
  return await mongoConnection.connect();
}`;
  }

  private generateMySQLConfig(): string {
    return `// MySQL Database Configuration
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';

export const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'app_database',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  connectionLimit: 20,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// MySQL Connection Pool
export const mysqlPool = mysql.createPool(mysqlConfig);

// Sequelize Instance for MySQL
export const sequelize = new Sequelize(
  mysqlConfig.database,
  mysqlConfig.user,
  mysqlConfig.password,
  {
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: mysqlConfig.ssl
    },
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
);

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const connection = await mysqlPool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ MySQL connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL:', error);
    return false;
  }
}`;
  }

  private generateSQLiteConfig(): string {
    return `// SQLite Database Configuration
import { Sequelize } from 'sequelize';
import path from 'path';

const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'database.sqlite');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to SQLite:', error);
    return false;
  }
}`;
  }

  private generateSchema(requirements: AppRequirements, dbType: string, orm: string): string {
    if (dbType === 'mongodb') {
      return this.generateMongoSchema(requirements);
    } else {
      return this.generateSQLSchema(requirements, orm);
    }
  }

  private generateMongoSchema(requirements: AppRequirements): string {
    const entities = this.extractEntities(requirements);
    
    return `// MongoDB Schema Definitions
import mongoose, { Schema, Document } from 'mongoose';

// Base schema with common fields
const baseSchema = {
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
};

${entities.map(entity => `
// ${entity} Schema
export interface I${entity} extends Document {
  ${this.generateEntityFields(entity, requirements)}
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const ${entity.toLowerCase()}Schema = new Schema<I${entity}>({
  ${this.generateMongoSchemaFields(entity, requirements)}
  ...baseSchema
}, {
  timestamps: true,
  collection: '${entity.toLowerCase()}s'
});

// Indexes
${this.generateMongoIndexes(entity, requirements)}

// Pre-save middleware
${entity.toLowerCase()}Schema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
${entity.toLowerCase()}Schema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const ${entity} = mongoose.model<I${entity}>('${entity}', ${entity.toLowerCase()}Schema);
`).join('')}

// Export all models
export const models = {
  ${entities.join(', ')}
};`;
  }

  private generateSQLSchema(requirements: AppRequirements, orm: string): string {
    const entities = this.extractEntities(requirements);
    
    return `// SQL Database Schema
import { DataTypes, Model, Sequelize } from 'sequelize';
import { sequelize } from './config';

// Base model attributes
const baseAttributes = {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
};

${entities.map(entity => `
// ${entity} Model
export interface ${entity}Attributes {
  id?: string;
  ${this.generateEntityFields(entity, requirements)}
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
}

export class ${entity} extends Model<${entity}Attributes> implements ${entity}Attributes {
  public id!: string;
  ${this.generateModelProperties(entity, requirements)}
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public isActive!: boolean;

  // Instance methods
  public toJSON() {
    const values = { ...this.get() };
    return values;
  }
}

${entity}.init({
  ...baseAttributes,
  ${this.generateSequelizeFields(entity, requirements)}
}, {
  sequelize,
  modelName: '${entity}',
  tableName: '${entity.toLowerCase()}s',
  timestamps: true,
  underscored: true,
  indexes: [
    ${this.generateSQLIndexes(entity, requirements)}
  ]
});
`).join('')}

// Define associations
${this.generateAssociations(entities, requirements)}

// Export all models
export const models = {
  ${entities.join(', ')},
  sequelize
};

// Sync database (use with caution in production)
export async function syncDatabase(force: boolean = false): Promise<void> {
  try {
    await sequelize.sync({ force });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Database sync error:', error);
    throw error;
  }
}`;
  }

  private generateModels(requirements: AppRequirements, orm: string): string {
    const entities = this.extractEntities(requirements);
    
    return `// Data Access Layer
${entities.map(entity => `
// ${entity} Repository
export class ${entity}Repository {
  /**
   * Create a new ${entity.toLowerCase()}
   */
  async create(data: Partial<${entity}Attributes>): Promise<${entity}> {
    try {
      const ${entity.toLowerCase()} = await ${entity}.create(data);
      return ${entity.toLowerCase()};
    } catch (error) {
      console.error('Error creating ${entity.toLowerCase()}:', error);
      throw new Error('Failed to create ${entity.toLowerCase()}');
    }
  }

  /**
   * Find ${entity.toLowerCase()} by ID
   */
  async findById(id: string): Promise<${entity} | null> {
    try {
      return await ${entity}.findByPk(id);
    } catch (error) {
      console.error('Error finding ${entity.toLowerCase()} by ID:', error);
      throw new Error('Failed to find ${entity.toLowerCase()}');
    }
  }

  /**
   * Find all ${entity.toLowerCase()}s with pagination
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    where?: any;
    include?: any;
  } = {}): Promise<{ rows: ${entity}[]; count: number }> {
    try {
      const { page = 1, limit = 10, where = {}, include = [] } = options;
      const offset = (page - 1) * limit;

      return await ${entity}.findAndCountAll({
        where: { ...where, isActive: true },
        include,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error('Error finding ${entity.toLowerCase()}s:', error);
      throw new Error('Failed to fetch ${entity.toLowerCase()}s');
    }
  }

  /**
   * Update ${entity.toLowerCase()} by ID
   */
  async update(id: string, data: Partial<${entity}Attributes>): Promise<${entity} | null> {
    try {
      const [affectedCount] = await ${entity}.update(data, {
        where: { id, isActive: true }
      });

      if (affectedCount === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      console.error('Error updating ${entity.toLowerCase()}:', error);
      throw new Error('Failed to update ${entity.toLowerCase()}');
    }
  }

  /**
   * Soft delete ${entity.toLowerCase()} by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const [affectedCount] = await ${entity}.update(
        { isActive: false },
        { where: { id, isActive: true } }
      );
      return affectedCount > 0;
    } catch (error) {
      console.error('Error deleting ${entity.toLowerCase()}:', error);
      throw new Error('Failed to delete ${entity.toLowerCase()}');
    }
  }

  /**
   * Search ${entity.toLowerCase()}s
   */
  async search(query: string, options: { page?: number; limit?: number } = {}): Promise<{ rows: ${entity}[]; count: number }> {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      return await ${entity}.findAndCountAll({
        where: {
          [Op.and]: [
            { isActive: true },
            {
              [Op.or]: [
                // Add searchable fields here based on entity
                ${this.generateSearchFields(entity, requirements)}
              ]
            }
          ]
        },
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error('Error searching ${entity.toLowerCase()}s:', error);
      throw new Error('Failed to search ${entity.toLowerCase()}s');
    }
  }
}

export const ${entity.toLowerCase()}Repository = new ${entity}Repository();
`).join('')}

// Repository Manager
export class RepositoryManager {
  ${entities.map(entity => `public ${entity.toLowerCase()} = ${entity.toLowerCase()}Repository;`).join('\n  ')}
}

export const repositories = new RepositoryManager();`;
  }

  private generateMigrations(requirements: AppRequirements, dbType: string): string {
    const entities = this.extractEntities(requirements);
    
    return `// Database Migrations
import { QueryInterface, DataTypes } from 'sequelize';

${entities.map((entity, index) => `
// Migration ${String(index + 1).padStart(3, '0')}: Create ${entity}s table
export const up${String(index + 1).padStart(3, '0')} = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('${entity.toLowerCase()}s', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ${this.generateMigrationFields(entity, requirements)}
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  // Add indexes
  ${this.generateMigrationIndexes(entity, requirements)}
};

export const down${String(index + 1).padStart(3, '0')} = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('${entity.toLowerCase()}s');
};
`).join('')}

// Migration Runner
export class MigrationRunner {
  private migrations = [
    ${entities.map((_, index) => `{ up: up${String(index + 1).padStart(3, '0')}, down: down${String(index + 1).padStart(3, '0')} }`).join(',\n    ')}
  ];

  async runMigrations(): Promise<void> {
    const { QueryInterface } = require('sequelize');
    const queryInterface = new QueryInterface(sequelize);

    for (const [index, migration] of this.migrations.entries()) {
      try {
        console.log(\`Running migration \${index + 1}...\`);
        await migration.up(queryInterface);
        console.log(\`✅ Migration \${index + 1} completed\`);
      } catch (error) {
        console.error(\`❌ Migration \${index + 1} failed:`, error);
        throw error;
      }
    }
  }

  async rollbackMigrations(): Promise<void> {
    const { QueryInterface } = require('sequelize');
    const queryInterface = new QueryInterface(sequelize);

    for (let i = this.migrations.length - 1; i >= 0; i--) {
      try {
        console.log(\`Rolling back migration \${i + 1}...\`);
        await this.migrations[i].down(queryInterface);
        console.log(\`✅ Migration \${i + 1} rolled back\`);
      } catch (error) {
        console.error(\`❌ Rollback \${i + 1} failed:`, error);
        throw error;
      }
    }
  }
}

export const migrationRunner = new MigrationRunner();`;
  }

  private generateSeeds(requirements: AppRequirements): string {
    const entities = this.extractEntities(requirements);
    
    return `// Database Seeds
${entities.map(entity => `
// ${entity} Seeds
const ${entity.toLowerCase()}Seeds = [
  ${this.generateSampleData(entity, requirements)}
];

export async function seed${entity}s(): Promise<void> {
  try {
    for (const seedData of ${entity.toLowerCase()}Seeds) {
      await ${entity}.findOrCreate({
        where: { ${this.getPrimarySearchField(entity)} },
        defaults: seedData
      });
    }
    console.log('✅ ${entity} seeds completed');
  } catch (error) {
    console.error('❌ ${entity} seeding failed:', error);
    throw error;
  }
}
`).join('')}

// Master Seeder
export class DatabaseSeeder {
  async runAll(): Promise<void> {
    console.log('🌱 Starting database seeding...');
    
    try {
      ${entities.map(entity => `await seed${entity}s();`).join('\n      ')}
      
      console.log('✅ All seeds completed successfully');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }
}

export const databaseSeeder = new DatabaseSeeder();`;
  }

  private generateQueries(requirements: AppRequirements, orm: string): string {
    const entities = this.extractEntities(requirements);
    
    return `// Custom Database Queries
import { Op } from 'sequelize';
import { QueryTypes } from 'sequelize';

export class QueryService {
  ${entities.map(entity => `
  /**
   * Get ${entity.toLowerCase()} statistics
   */
  async get${entity}Stats(): Promise<any> {
    const stats = await sequelize.query(\`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent
      FROM ${entity.toLowerCase()}s
    \`, { type: QueryTypes.SELECT });
    
    return stats[0];
  }

  /**
   * Get trending ${entity.toLowerCase()}s
   */
  async getTrending${entity}s(limit: number = 10): Promise<${entity}[]> {
    return await ${entity}.findAll({
      where: {
        isActive: true,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      order: [['createdAt', 'DESC']],
      limit
    });
  }
  `).join('')}

  /**
   * Execute raw SQL query
   */
  async rawQuery(query: string, parameters: any[] = []): Promise<any> {
    try {
      return await sequelize.query(query, {
        replacements: parameters,
        type: QueryTypes.SELECT
      });
    } catch (error) {
      console.error('Raw query failed:', error);
      throw error;
    }
  }

  /**
   * Get database health metrics
   */
  async getHealthMetrics(): Promise<any> {
    const metrics = await sequelize.query(\`
      SELECT
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC;
    \`, { type: QueryTypes.SELECT });

    return metrics;
  }

  /**
   * Analyze query performance
   */
  async explainQuery(query: string): Promise<any> {
    const explanation = await sequelize.query(\`EXPLAIN ANALYZE \${query}\`, {
      type: QueryTypes.SELECT
    });

    return explanation;
  }
}

export const queryService = new QueryService();`;
  }

  private generateIndexes(requirements: AppRequirements): string {
    const entities = this.extractEntities(requirements);
    
    return `// Database Indexes Strategy
export const indexDefinitions = {
  ${entities.map(entity => `
  ${entity.toLowerCase()}: [
    // Primary key index (automatic)
    { fields: ['id'], unique: true },
    
    // Common query indexes
    { fields: ['createdAt'] },
    { fields: ['updatedAt'] },
    { fields: ['isActive'] },
    
    // Entity-specific indexes
    ${this.generateEntityIndexes(entity, requirements)}
    
    // Composite indexes for common queries
    { fields: ['isActive', 'createdAt'] },
    
    // Partial indexes for better performance
    { 
      fields: ['createdAt'], 
      where: { isActive: true },
      name: '${entity.toLowerCase()}s_active_created_at_idx'
    }
  ]`).join(',')})
};

/**
 * Create indexes programmatically
 */
export async function createIndexes(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  
  for (const [tableName, indexes] of Object.entries(indexDefinitions)) {
    for (const index of indexes) {
      try {
        const indexName = index.name || \`\${tableName}_\${index.fields.join('_')}_idx\`;
        await queryInterface.addIndex(\`\${tableName}s\`, {
          fields: index.fields,
          unique: index.unique || false,
          where: index.where,
          name: indexName
        });
        console.log(\`✅ Index created: \${indexName}\`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error(\`❌ Failed to create index:`, error);
        }
      }
    }
  }
}`;
  }

  private generateConnectionManager(dbType: string): string {
    return `// Database Connection Manager
export class ConnectionManager {
  private connections: Map<string, any> = new Map();
  private healthCheck: NodeJS.Timeout | null = null;

  /**
   * Initialize all database connections
   */
  async initialize(): Promise<void> {
    try {
      // Test primary connection
      const isConnected = await testDatabaseConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to primary database');
      }

      // Start health check monitoring
      this.startHealthCheck();
      
      console.log('✅ Database connections initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Health check for database connections
   */
  private startHealthCheck(): void {
    this.healthCheck = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        console.error('Database health check failed:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private async checkHealth(): Promise<void> {
    ${dbType === 'mongodb' ? `
    if (!mongoose.connection.readyState) {
      console.warn('MongoDB connection lost, attempting to reconnect...');
      await mongoConnection.connect();
    }
    ` : `
    try {
      await sequelize.authenticate();
    } catch (error) {
      console.warn('Database connection lost, attempting to reconnect...', error);
      // Implement reconnection logic here
    }
    `}
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.healthCheck) {
        clearInterval(this.healthCheck);
      }

      ${dbType === 'mongodb' ? `
      await mongoConnection.disconnect();
      ` : `
      await closeDatabaseConnection();
      `}
      
      console.log('Database connections closed gracefully');
    } catch (error) {
      console.error('Error during database shutdown:', error);
    }
  }

  /**
   * Get connection status
   */
  getStatus(): any {
    return {
      ${dbType === 'mongodb' ? `
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        state: mongoose.connection.readyState
      }
      ` : `
      sql: {
        connected: sequelize.connectionManager.pool.size > 0,
        poolSize: sequelize.connectionManager.pool.size,
        maxConnections: sequelize.connectionManager.pool.max
      }
      `}
    };
  }
}

export const connectionManager = new ConnectionManager();`;
  }

  private generateDatabaseUtils(dbType: string, orm: string): string {
    return `// Database Utility Functions
import { Transaction } from 'sequelize';

export class DatabaseUtils {
  /**
   * Execute operations within a transaction
   */
  async withTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    const transaction = await sequelize.transaction();
    
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Batch insert with transaction
   */
  async batchInsert<T>(model: any, data: T[], batchSize: number = 100): Promise<void> {
    const batches = this.createBatches(data, batchSize);
    
    for (const batch of batches) {
      await this.withTransaction(async (transaction) => {
        await model.bulkCreate(batch, { transaction });
      });
    }
  }

  /**
   * Batch update with transaction
   */
  async batchUpdate(model: any, updates: { where: any; data: any }[], batchSize: number = 100): Promise<void> {
    const batches = this.createBatches(updates, batchSize);
    
    for (const batch of batches) {
      await this.withTransaction(async (transaction) => {
        for (const update of batch) {
          await model.update(update.data, { where: update.where, transaction });
        }
      });
    }
  }

  /**
   * Database backup utility
   */
  async createBackup(filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = filename || \`backup_\${timestamp}.sql\`;
    
    try {
      // Implement database-specific backup logic
      ${dbType === 'postgresql' ? `
      const { exec } = require('child_process');
      const command = \`pg_dump \${process.env.DATABASE_URL} > \${backupName}\`;
      
      return new Promise((resolve, reject) => {
        exec(command, (error: any, stdout: any, stderr: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(backupName);
          }
        });
      });
      ` : `
      console.warn('Backup not implemented for this database type');
      return backupName;
      `}
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  /**
   * Database statistics
   */
  async getStatistics(): Promise<any> {
    try {
      const stats = await queryService.rawQuery(\`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations,
          n_live_tup as live_rows,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      \`);
      
      return stats;
    } catch (error) {
      console.error('Failed to get database statistics:', error);
      return [];
    }
  }

  /**
   * Optimize database performance
   */
  async optimize(): Promise<void> {
    try {
      ${dbType === 'postgresql' ? `
      // Run VACUUM and ANALYZE
      await queryService.rawQuery('VACUUM ANALYZE;');
      console.log('✅ Database optimization completed');
      ` : `
      console.log('Optimization not implemented for this database type');
      `}
    } catch (error) {
      console.error('Database optimization failed:', error);
    }
  }

  private createBatches<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }
}

export const databaseUtils = new DatabaseUtils();`;
  }

  // Helper methods
  private detectDatabaseType(requirements: AppRequirements): string {
    const description = requirements.description.toLowerCase();
    const features = requirements.features?.join(' ').toLowerCase() || '';
    
    if (description.includes('mongodb') || features.includes('mongodb')) return 'mongodb';
    if (description.includes('mysql') || features.includes('mysql')) return 'mysql';
    if (description.includes('sqlite') || features.includes('sqlite')) return 'sqlite';
    if (description.includes('postgresql') || features.includes('postgresql')) return 'postgresql';
    
    // Default to PostgreSQL for production applications
    return 'postgresql';
  }

  private selectORM(requirements: AppRequirements): string {
    const dbType = this.detectDatabaseType(requirements);
    
    if (dbType === 'mongodb') return 'mongoose';
    
    // For SQL databases, prefer Sequelize for its maturity
    return 'sequelize';
  }

  private extractEntities(requirements: AppRequirements): string[] {
    const description = requirements.description.toLowerCase();
    const features = requirements.features?.join(' ').toLowerCase() || '';
    const text = `${description} ${features}`;
    
    const commonEntities = ['User', 'Product', 'Order', 'Category', 'Post', 'Comment'];
    const foundEntities = commonEntities.filter(entity => 
      text.includes(entity.toLowerCase())
    );
    
    // Always include User for most applications
    if (!foundEntities.includes('User')) {
      foundEntities.unshift('User');
    }
    
    return foundEntities.length > 0 ? foundEntities : ['User', 'Content'];
  }

  private generateEntityFields(entity: string, requirements: AppRequirements): string {
    const commonFields = {
      User: 'email: string;\n  name: string;\n  password: string;\n  role: string;',
      Product: 'name: string;\n  description: string;\n  price: number;\n  categoryId?: string;',
      Order: 'userId: string;\n  total: number;\n  status: string;',
      Category: 'name: string;\n  description?: string;',
      Post: 'title: string;\n  content: string;\n  authorId: string;',
      Comment: 'content: string;\n  authorId: string;\n  postId: string;'
    };
    
    return commonFields[entity as keyof typeof commonFields] || 'name: string;\n  description?: string;';
  }

  private generateMongoSchemaFields(entity: string, requirements: AppRequirements): string {
    // Implementation would generate MongoDB schema fields
    return 'name: { type: String, required: true }';
  }

  private generateSequelizeFields(entity: string, requirements: AppRequirements): string {
    // Implementation would generate Sequelize field definitions
    return 'name: { type: DataTypes.STRING, allowNull: false }';
  }

  private generateMigrationFields(entity: string, requirements: AppRequirements): string {
    // Implementation would generate migration field definitions
    return 'name: { type: DataTypes.STRING, allowNull: false }';
  }

  private generateModelProperties(entity: string, requirements: AppRequirements): string {
    // Implementation would generate TypeScript model properties
    return 'public name!: string;';
  }

  private generateAssociations(entities: string[], requirements: AppRequirements): string {
    // Implementation would generate Sequelize associations
    return '// Define model associations here';
  }

  private generateMongoIndexes(entity: string, requirements: AppRequirements): string {
    return `${entity.toLowerCase()}Schema.index({ name: 1 });`;
  }

  private generateSQLIndexes(entity: string, requirements: AppRequirements): string {
    return `{ fields: ['name'] }`;
  }

  private generateMigrationIndexes(entity: string, requirements: AppRequirements): string {
    return `await queryInterface.addIndex('${entity.toLowerCase()}s', ['name']);`;
  }

  private generateEntityIndexes(entity: string, requirements: AppRequirements): string {
    return `{ fields: ['name'] }`;
  }

  private generateSearchFields(entity: string, requirements: AppRequirements): string {
    return `{ name: { [Op.iLike]: \`%\${query}%\` } }`;
  }

  private generateSampleData(entity: string, requirements: AppRequirements): string {
    return `{ name: 'Sample ${entity}', description: 'Sample data for ${entity}' }`;
  }

  private getPrimarySearchField(entity: string): string {
    return entity === 'User' ? 'email: seedData.email' : 'name: seedData.name';
  }

  async cleanup(): Promise<void> {
    console.log('Database Integration Specialist cleaned up');
  }
}