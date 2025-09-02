import { SchemaTemplate, TableConfig, FieldConfig, RelationshipConfig } from '../index';

export interface SequelizeConfig {
  dialect: 'postgres' | 'mysql' | 'mariadb' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  logging?: boolean;
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

export class SequelizeAdapter {
  private config: SequelizeConfig;

  constructor(config: SequelizeConfig) {
    this.config = config;
  }

  generateModels(template: SchemaTemplate): string {
    let output = `// Sequelize Models for ${template.name}\n`;
    output += `// Generated: ${new Date().toISOString()}\n\n`;
    
    output += `import { Sequelize, DataTypes, Model, ModelAttributes, ModelOptions } from 'sequelize';\n\n`;
    
    // Generate Sequelize instance
    output += this.generateSequelizeInstance();
    output += '\n';
    
    // Generate model interfaces
    for (const table of template.tables) {
      output += this.generateModelInterface(table);
      output += '\n';
    }
    
    // Generate model classes
    for (const table of template.tables) {
      output += this.generateModelClass(table);
      output += '\n';
    }
    
    // Generate associations
    output += this.generateAssociations(template.tables);
    
    // Generate sync function
    output += this.generateSyncFunction();
    
    return output;
  }

  private generateSequelizeInstance(): string {
    return `const sequelize = new Sequelize({
  dialect: '${this.config.dialect}',
  host: process.env.DB_HOST || '${this.config.host}',
  port: parseInt(process.env.DB_PORT || '${this.config.port}'),
  database: process.env.DB_NAME || '${this.config.database}',
  username: process.env.DB_USER || '${this.config.username}',
  password: process.env.DB_PASSWORD || '${this.config.password}',
  logging: ${this.config.logging || false},
  pool: {
    max: ${this.config.pool?.max || 20},
    min: ${this.config.pool?.min || 5},
    acquire: ${this.config.pool?.acquire || 30000},
    idle: ${this.config.pool?.idle || 10000}
  },
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true
  }
});

export { sequelize };`;
  }

  private generateModelInterface(table: TableConfig): string {
    const className = this.toPascalCase(table.name);
    
    let interface_def = `// ${className} Interface\n`;
    interface_def += `export interface I${className}Attributes {\n`;
    
    for (const field of table.fields) {
      const tsType = this.mapFieldToTypeScript(field);
      const optional = field.nullable || field.default !== undefined ? '?' : '';
      interface_def += `  ${field.name}${optional}: ${tsType};\n`;
    }
    
    interface_def += `}\n\n`;
    
    interface_def += `export interface I${className}CreationAttributes extends Partial<I${className}Attributes> {}\n`;
    
    return interface_def;
  }

  private generateModelClass(table: TableConfig): string {
    const className = this.toPascalCase(table.name);
    
    let model = `// ${className} Model\n`;
    model += `export class ${className} extends Model<I${className}Attributes, I${className}CreationAttributes> implements I${className}Attributes {\n`;
    
    // Declare properties
    for (const field of table.fields) {
      const tsType = this.mapFieldToTypeScript(field);
      const optional = field.nullable ? '!' : '';
      model += `  public ${field.name}${optional}: ${tsType};\n`;
    }
    
    // Add timestamps
    model += `\n  public readonly createdAt!: Date;\n`;
    model += `  public readonly updatedAt!: Date;\n`;
    model += `  public readonly deletedAt?: Date;\n`;
    
    model += `}\n\n`;
    
    // Model initialization
    model += `${className}.init({\n`;
    
    for (const field of table.fields) {
      model += `  ${field.name}: {\n`;
      model += `    type: ${this.mapFieldToSequelize(field)},\n`;
      
      if (field.constraints?.some(c => c.type === 'primary')) {
        model += `    primaryKey: true,\n`;
      }
      
      if (field.constraints?.some(c => c.type === 'unique')) {
        model += `    unique: true,\n`;
      }
      
      if (!field.nullable) {
        model += `    allowNull: false,\n`;
      }
      
      if (field.default !== undefined) {
        model += `    defaultValue: ${this.formatDefaultValue(field.default, field.type)},\n`;
      }
      
      if (field.type === 'string') {
        model += `    validate: {\n`;
        model += `      notEmpty: true,\n`;
        model += `      len: [1, 255]\n`;
        model += `    },\n`;
      }
      
      model += `  },\n`;
    }
    
    model += `}, {\n`;
    model += `  sequelize,\n`;
    model += `  tableName: '${table.name}',\n`;
    model += `  modelName: '${className}',\n`;
    model += `  paranoid: true,\n`;
    model += `  timestamps: true,\n`;
    model += `  underscored: true,\n`;
    
    // Add indexes
    if (table.indexes && table.indexes.length > 0) {
      model += `  indexes: [\n`;
      for (const index of table.indexes) {
        model += `    {\n`;
        model += `      name: '${index.name}',\n`;
        model += `      fields: [${index.fields.map(f => `'${f}'`).join(', ')}],\n`;
        if (index.unique) {
          model += `      unique: true,\n`;
        }
        model += `    },\n`;
      }
      model += `  ],\n`;
    }
    
    model += `});\n`;
    
    return model;
  }

  private generateAssociations(tables: TableConfig[]): string {
    let associations = `\n// Associations\n`;
    
    for (const table of tables) {
      if (!table.relationships) continue;
      
      const className = this.toPascalCase(table.name);
      
      for (const rel of table.relationships) {
        const targetClass = this.toPascalCase(rel.table);
        
        switch (rel.type) {
          case 'one-to-one':
            associations += `${className}.hasOne(${targetClass}, {\n`;
            associations += `  foreignKey: '${rel.foreignKey}',\n`;
            associations += `  as: '${rel.table.toLowerCase()}'\n`;
            associations += `});\n`;
            associations += `${targetClass}.belongsTo(${className}, {\n`;
            associations += `  foreignKey: '${rel.foreignKey}',\n`;
            associations += `  as: '${table.name.toLowerCase()}'\n`;
            associations += `});\n\n`;
            break;
            
          case 'one-to-many':
            associations += `${className}.hasMany(${targetClass}, {\n`;
            associations += `  foreignKey: '${rel.foreignKey}',\n`;
            associations += `  as: '${rel.table.toLowerCase()}s'\n`;
            associations += `});\n`;
            associations += `${targetClass}.belongsTo(${className}, {\n`;
            associations += `  foreignKey: '${rel.foreignKey}',\n`;
            associations += `  as: '${table.name.toLowerCase()}'\n`;
            associations += `});\n\n`;
            break;
            
          case 'many-to-many':
            const junctionTable = `${table.name}_${rel.table}`;
            associations += `${className}.belongsToMany(${targetClass}, {\n`;
            associations += `  through: '${junctionTable}',\n`;
            associations += `  foreignKey: '${table.name.toLowerCase()}_id',\n`;
            associations += `  otherKey: '${rel.table.toLowerCase()}_id',\n`;
            associations += `  as: '${rel.table.toLowerCase()}s'\n`;
            associations += `});\n`;
            associations += `${targetClass}.belongsToMany(${className}, {\n`;
            associations += `  through: '${junctionTable}',\n`;
            associations += `  foreignKey: '${rel.table.toLowerCase()}_id',\n`;
            associations += `  otherKey: '${table.name.toLowerCase()}_id',\n`;
            associations += `  as: '${table.name.toLowerCase()}s'\n`;
            associations += `});\n\n`;
            break;
        }
      }
    }
    
    return associations;
  }

  private generateSyncFunction(): string {
    return `
// Database Sync
export const syncDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await sequelize.sync({ force, alter: !force });
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

// Close connection
export const closeDatabase = async () => {
  await sequelize.close();
};

// Test connection
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};
`;
  }

  private mapFieldToSequelize(field: FieldConfig): string {
    switch (field.type) {
      case 'string':
        return 'DataTypes.STRING';
      case 'text':
        return 'DataTypes.TEXT';
      case 'integer':
        return field.constraints?.some(c => c.type === 'primary') 
          ? 'DataTypes.INTEGER.UNSIGNED' 
          : 'DataTypes.INTEGER';
      case 'bigint':
        return 'DataTypes.BIGINT';
      case 'decimal':
        return 'DataTypes.DECIMAL(10, 2)';
      case 'boolean':
        return 'DataTypes.BOOLEAN';
      case 'date':
        return 'DataTypes.DATEONLY';
      case 'datetime':
      case 'timestamp':
        return 'DataTypes.DATE';
      case 'json':
        return 'DataTypes.JSONB';
      case 'uuid':
        return 'DataTypes.UUID';
      default:
        return 'DataTypes.STRING';
    }
  }

  private mapFieldToTypeScript(field: FieldConfig): string {
    switch (field.type) {
      case 'string':
      case 'text':
      case 'uuid':
        return 'string';
      case 'integer':
      case 'bigint':
      case 'decimal':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
      case 'datetime':
      case 'timestamp':
        return 'Date';
      case 'json':
        return 'any';
      default:
        return 'any';
    }
  }

  private formatDefaultValue(value: any, type: string): string {
    if (value === null) return 'null';
    
    switch (type) {
      case 'string':
      case 'text':
        return `'${value}'`;
      case 'boolean':
        return value ? 'true' : 'false';
      case 'date':
      case 'datetime':
      case 'timestamp':
        if (value === 'now' || value === 'CURRENT_TIMESTAMP') {
          return 'DataTypes.NOW';
        }
        return `'${value}'`;
      case 'json':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }

  private toPascalCase(str: string): string {
    return str.replace(/(^|_)(.)/g, (_, __, char) => char.toUpperCase());
  }

  generateRepositoryPattern(template: SchemaTemplate): string {
    let repositories = `// Repository Pattern for ${template.name}\n`;
    repositories += `// Generated: ${new Date().toISOString()}\n\n`;
    
    repositories += `import { Model, WhereOptions, FindOptions, CreateOptions, UpdateOptions, DestroyOptions } from 'sequelize';\n\n`;
    
    // Base repository interface
    repositories += `export interface IRepository<T extends Model> {\n`;
    repositories += `  findAll(options?: FindOptions): Promise<T[]>;\n`;
    repositories += `  findById(id: number): Promise<T | null>;\n`;
    repositories += `  findOne(options: FindOptions): Promise<T | null>;\n`;
    repositories += `  create(data: any, options?: CreateOptions): Promise<T>;\n`;
    repositories += `  update(data: any, options: UpdateOptions): Promise<[number, T[]]>;\n`;
    repositories += `  delete(options: DestroyOptions): Promise<number>;\n`;
    repositories += `  count(options?: WhereOptions): Promise<number>;\n`;
    repositories += `}\n\n`;
    
    // Base repository class
    repositories += `export abstract class BaseRepository<T extends Model> implements IRepository<T> {\n`;
    repositories += `  protected model: typeof Model;\n\n`;
    repositories += `  constructor(model: typeof Model) {\n`;
    repositories += `    this.model = model;\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async findAll(options: FindOptions = {}): Promise<T[]> {\n`;
    repositories += `    return await this.model.findAll(options) as T[];\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async findById(id: number): Promise<T | null> {\n`;
    repositories += `    return await this.model.findByPk(id) as T;\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async findOne(options: FindOptions): Promise<T | null> {\n`;
    repositories += `    return await this.model.findOne(options) as T;\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async create(data: any, options: CreateOptions = {}): Promise<T> {\n`;
    repositories += `    return await this.model.create(data, options) as T;\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async update(data: any, options: UpdateOptions): Promise<[number, T[]]> {\n`;
    repositories += `    return await this.model.update(data, options) as [number, T[]];\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async delete(options: DestroyOptions): Promise<number> {\n`;
    repositories += `    return await this.model.destroy(options);\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async count(options: WhereOptions = {}): Promise<number> {\n`;
    repositories += `    return await this.model.count({ where: options });\n`;
    repositories += `  }\n`;
    repositories += `}\n\n`;
    
    // Generate specific repositories for each table
    for (const table of template.tables) {
      const className = this.toPascalCase(table.name);
      
      repositories += `// ${className} Repository\n`;
      repositories += `export class ${className}Repository extends BaseRepository<${className}> {\n`;
      repositories += `  constructor() {\n`;
      repositories += `    super(${className});\n`;
      repositories += `  }\n\n`;
      
      // Add specific methods based on fields
      const hasEmail = table.fields.some(f => f.name.toLowerCase().includes('email'));
      if (hasEmail) {
        repositories += `  async findByEmail(email: string): Promise<${className} | null> {\n`;
        repositories += `    return await this.findOne({ where: { email } });\n`;
        repositories += `  }\n\n`;
      }
      
      const hasSlug = table.fields.some(f => f.name.toLowerCase().includes('slug'));
      if (hasSlug) {
        repositories += `  async findBySlug(slug: string): Promise<${className} | null> {\n`;
        repositories += `    return await this.findOne({ where: { slug } });\n`;
        repositories += `  }\n\n`;
      }
      
      const hasStatus = table.fields.some(f => f.name.toLowerCase().includes('status'));
      if (hasStatus) {
        repositories += `  async findByStatus(status: string): Promise<${className}[]> {\n`;
        repositories += `    return await this.findAll({ where: { status } });\n`;
        repositories += `  }\n\n`;
      }
      
      repositories += `}\n\n`;
    }
    
    return repositories;
  }

  generateServiceLayer(template: SchemaTemplate): string {
    let services = `// Service Layer for ${template.name}\n`;
    services += `// Generated: ${new Date().toISOString()}\n\n`;
    
    for (const table of template.tables) {
      const className = this.toPascalCase(table.name);
      const serviceName = `${className}Service`;
      const repoName = `${className}Repository`;
      
      services += `// ${className} Service\n`;
      services += `export class ${serviceName} {\n`;
      services += `  private repository: ${repoName};\n\n`;
      services += `  constructor() {\n`;
      services += `    this.repository = new ${repoName}();\n`;
      services += `  }\n\n`;
      
      // CRUD methods
      services += `  async getAll(page = 1, limit = 10): Promise<{ data: ${className}[], total: number }> {\n`;
      services += `    const offset = (page - 1) * limit;\n`;
      services += `    const data = await this.repository.findAll({ limit, offset });\n`;
      services += `    const total = await this.repository.count();\n`;
      services += `    return { data, total };\n`;
      services += `  }\n\n`;
      
      services += `  async getById(id: number): Promise<${className} | null> {\n`;
      services += `    return await this.repository.findById(id);\n`;
      services += `  }\n\n`;
      
      services += `  async create(data: I${className}CreationAttributes): Promise<${className}> {\n`;
      services += `    return await this.repository.create(data);\n`;
      services += `  }\n\n`;
      
      services += `  async update(id: number, data: Partial<I${className}Attributes>): Promise<${className} | null> {\n`;
      services += `    await this.repository.update(data, { where: { id } });\n`;
      services += `    return await this.repository.findById(id);\n`;
      services += `  }\n\n`;
      
      services += `  async delete(id: number): Promise<boolean> {\n`;
      services += `    const deleted = await this.repository.delete({ where: { id } });\n`;
      services += `    return deleted > 0;\n`;
      services += `  }\n\n`;
      
      // Custom methods based on fields
      const hasStatus = table.fields.some(f => f.name.toLowerCase().includes('status'));
      if (hasStatus) {
        services += `  async getByStatus(status: string): Promise<${className}[]> {\n`;
        services += `    return await this.repository.findByStatus(status);\n`;
        services += `  }\n\n`;
      }
      
      services += `}\n\n`;
    }
    
    return services;
  }
}