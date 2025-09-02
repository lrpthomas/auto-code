import { SchemaTemplate, TableConfig, FieldConfig, RelationshipConfig } from '../index';

export interface MongooseConfig {
  uri: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
  };
}

export class MongooseAdapter {
  private config: MongooseConfig;

  constructor(config: MongooseConfig) {
    this.config = config;
  }

  generateModels(template: SchemaTemplate): string {
    let output = `// Mongoose Models for ${template.name}\n`;
    output += `// Generated: ${new Date().toISOString()}\n\n`;
    
    output += `import mongoose, { Schema, Document, Model } from 'mongoose';\n`;
    output += `import { MongoError } from 'mongodb';\n\n`;
    
    // Generate interfaces
    for (const table of template.tables) {
      output += this.generateInterface(table);
      output += '\n';
    }
    
    // Generate schemas
    for (const table of template.tables) {
      output += this.generateSchema(table);
      output += '\n';
    }
    
    // Generate models
    for (const table of template.tables) {
      output += this.generateModel(table);
      output += '\n';
    }
    
    // Generate connection
    output += this.generateConnection();
    
    return output;
  }

  private generateInterface(table: TableConfig): string {
    const interfaceName = `I${this.toPascalCase(table.name)}`;
    
    let interface_def = `// ${interfaceName} Interface\n`;
    interface_def += `export interface ${interfaceName} extends Document {\n`;
    
    for (const field of table.fields) {
      if (field.name === 'id') continue; // MongoDB uses _id
      
      const tsType = this.mapFieldToTypeScript(field);
      const optional = field.nullable || field.default !== undefined ? '?' : '';
      interface_def += `  ${field.name}${optional}: ${tsType};\n`;
    }
    
    // Add virtual methods
    interface_def += `  toJSON(): any;\n`;
    interface_def += `}\n`;
    
    return interface_def;
  }

  private generateSchema(table: TableConfig): string {
    const schemaName = `${this.toPascalCase(table.name)}Schema`;
    const interfaceName = `I${this.toPascalCase(table.name)}`;
    
    let schema = `// ${schemaName} Definition\n`;
    schema += `const ${schemaName} = new Schema<${interfaceName}>({\n`;
    
    for (const field of table.fields) {
      if (field.name === 'id') continue; // Skip ID field for MongoDB
      
      schema += `  ${field.name}: {\n`;
      schema += `    type: ${this.mapFieldToMongoose(field)},\n`;
      
      if (!field.nullable && field.default === undefined) {
        schema += `    required: [true, '${field.name} is required'],\n`;
      }
      
      if (field.default !== undefined) {
        schema += `    default: ${this.formatDefaultValue(field.default, field.type)},\n`;
      }
      
      // Add field-specific validations
      schema += this.generateFieldValidation(field);
      
      schema += `  },\n`;
    }
    
    schema += `}, {\n`;
    schema += `  timestamps: true,\n`;
    schema += `  collection: '${table.name}',\n`;
    schema += `  toJSON: {\n`;
    schema += `    transform: (doc, ret) => {\n`;
    schema += `      ret.id = ret._id.toString();\n`;
    schema += `      delete ret._id;\n`;
    schema += `      delete ret.__v;\n`;
    schema += `      return ret;\n`;
    schema += `    }\n`;
    schema += `  },\n`;
    schema += `  toObject: {\n`;
    schema += `    transform: (doc, ret) => {\n`;
    schema += `      ret.id = ret._id.toString();\n`;
    schema += `      delete ret._id;\n`;
    schema += `      delete ret.__v;\n`;
    schema += `      return ret;\n`;
    schema += `    }\n`;
    schema += `  }\n`;
    schema += `});\n\n`;
    
    // Add indexes
    if (table.indexes) {
      schema += `// Indexes\n`;
      for (const index of table.indexes) {
        const fields: Record<string, number> = {};
        index.fields.forEach(field => {
          fields[field] = 1; // Ascending by default
        });
        
        const options = index.unique ? ', { unique: true }' : '';
        schema += `${schemaName}.index(${JSON.stringify(fields)}${options});\n`;
      }
      schema += '\n';
    }
    
    // Add pre-save middleware
    schema += `// Pre-save middleware\n`;
    schema += `${schemaName}.pre('save', function(next) {\n`;
    schema += `  // Add custom pre-save logic here\n`;
    schema += `  next();\n`;
    schema += `});\n\n`;
    
    // Add static methods
    schema += `// Static methods\n`;
    schema += `${schemaName}.statics = {\n`;
    
    // Add findByField methods for common fields
    const hasEmail = table.fields.some(f => f.name.toLowerCase().includes('email'));
    if (hasEmail) {
      schema += `  findByEmail(email: string) {\n`;
      schema += `    return this.findOne({ email: email.toLowerCase() });\n`;
      schema += `  },\n\n`;
    }
    
    const hasSlug = table.fields.some(f => f.name.toLowerCase().includes('slug'));
    if (hasSlug) {
      schema += `  findBySlug(slug: string) {\n`;
      schema += `    return this.findOne({ slug });\n`;
      schema += `  },\n\n`;
    }
    
    const hasStatus = table.fields.some(f => f.name.toLowerCase().includes('status'));
    if (hasStatus) {
      schema += `  findByStatus(status: string) {\n`;
      schema += `    return this.find({ status });\n`;
      schema += `  },\n\n`;
    }
    
    schema += `  paginate(query = {}, options = {}) {\n`;
    schema += `    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;\n`;
    schema += `    const skip = (page - 1) * limit;\n`;
    schema += `    \n`;
    schema += `    return Promise.all([\n`;
    schema += `      this.find(query).sort(sort).skip(skip).limit(limit),\n`;
    schema += `      this.countDocuments(query)\n`;
    schema += `    ]).then(([data, total]) => ({\n`;
    schema += `      data,\n`;
    schema += `      total,\n`;
    schema += `      page,\n`;
    schema += `      limit,\n`;
    schema += `      totalPages: Math.ceil(total / limit)\n`;
    schema += `    }));\n`;
    schema += `  }\n`;
    schema += `};\n\n`;
    
    // Add instance methods
    schema += `// Instance methods\n`;
    schema += `${schemaName}.methods = {\n`;
    schema += `  toSafeJSON() {\n`;
    schema += `    const obj = this.toJSON();\n`;
    schema += `    // Remove sensitive fields\n`;
    schema += `    delete obj.password;\n`;
    schema += `    return obj;\n`;
    schema += `  }\n`;
    schema += `};\n`;
    
    return schema;
  }

  private generateModel(table: TableConfig): string {
    const modelName = this.toPascalCase(table.name);
    const schemaName = `${modelName}Schema`;
    const interfaceName = `I${modelName}`;
    
    let model = `// ${modelName} Model\n`;
    model += `export const ${modelName}: Model<${interfaceName}> = mongoose.model<${interfaceName}>('${modelName}', ${schemaName});\n`;
    
    return model;
  }

  private generateConnection(): string {
    return `
// Database Connection
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Database already connected');
      return;
    }

    try {
      const uri = process.env.MONGODB_URI || '${this.config.uri}';
      
      await mongoose.connect(uri, {
        maxPoolSize: ${this.config.options?.maxPoolSize || 20},
        minPoolSize: ${this.config.options?.minPoolSize || 5},
        maxIdleTimeMS: ${this.config.options?.maxIdleTimeMS || 30000},
        serverSelectionTimeoutMS: ${this.config.options?.serverSelectionTimeoutMS || 5000},
        socketTimeoutMS: ${this.config.options?.socketTimeoutMS || 45000},
      });

      this.isConnected = true;
      console.log('✅ Database connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ Database connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  Database disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 Database reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      console.error('❌ Database connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Database disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      if (!this.isConnected) {
        return { status: 'error', message: 'Database not connected' };
      }

      // Ping database
      await mongoose.connection.db.admin().ping();
      return { status: 'healthy', message: 'Database is responding' };
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const dbConnection = DatabaseConnection.getInstance();
`;
  }

  private generateFieldValidation(field: FieldConfig): string {
    let validation = '';
    const fieldName = field.name.toLowerCase();
    
    switch (field.type) {
      case 'string':
        validation += `    trim: true,\n`;
        validation += `    maxlength: [255, '${field.name} must be less than 255 characters'],\n`;
        
        if (fieldName.includes('email')) {
          validation += `    lowercase: true,\n`;
          validation += `    validate: {\n`;
          validation += `      validator: (v: string) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v),\n`;
          validation += `      message: 'Please enter a valid email address'\n`;
          validation += `    },\n`;
        }
        
        if (fieldName.includes('url')) {
          validation += `    validate: {\n`;
          validation += `      validator: (v: string) => /^https?:\\/\\/.+/.test(v),\n`;
          validation += `      message: 'Please enter a valid URL'\n`;
          validation += `    },\n`;
        }
        break;
        
      case 'text':
        validation += `    trim: true,\n`;
        validation += `    maxlength: [10000, '${field.name} must be less than 10000 characters'],\n`;
        break;
        
      case 'integer':
      case 'bigint':
        validation += `    min: [0, '${field.name} must be a positive number'],\n`;
        break;
        
      case 'decimal':
        validation += `    min: [0, '${field.name} must be a positive number'],\n`;
        validation += `    validate: {\n`;
        validation += `      validator: (v: number) => v >= 0,\n`;
        validation += `      message: '${field.name} must be a positive number'\n`;
        validation += `    },\n`;
        break;
    }
    
    return validation;
  }

  private mapFieldToMongoose(field: FieldConfig): string {
    switch (field.type) {
      case 'string':
      case 'text':
      case 'uuid':
        return 'String';
      case 'integer':
      case 'bigint':
      case 'decimal':
        return 'Number';
      case 'boolean':
        return 'Boolean';
      case 'date':
      case 'datetime':
      case 'timestamp':
        return 'Date';
      case 'json':
        return 'Schema.Types.Mixed';
      default:
        return 'String';
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
          return 'Date.now';
        }
        return `new Date('${value}')`;
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
    
    repositories += `import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';\n\n`;
    
    // Base repository interface
    repositories += `export interface IRepository<T extends Document> {\n`;
    repositories += `  findAll(filter?: FilterQuery<T>, options?: QueryOptions): Promise<T[]>;\n`;
    repositories += `  findById(id: string): Promise<T | null>;\n`;
    repositories += `  findOne(filter: FilterQuery<T>): Promise<T | null>;\n`;
    repositories += `  create(data: Partial<T>): Promise<T>;\n`;
    repositories += `  update(id: string, data: UpdateQuery<T>): Promise<T | null>;\n`;
    repositories += `  delete(id: string): Promise<T | null>;\n`;
    repositories += `  count(filter?: FilterQuery<T>): Promise<number>;\n`;
    repositories += `  paginate(filter: FilterQuery<T>, options: PaginateOptions): Promise<PaginateResult<T>>;\n`;
    repositories += `}\n\n`;
    
    repositories += `export interface PaginateOptions {\n`;
    repositories += `  page?: number;\n`;
    repositories += `  limit?: number;\n`;
    repositories += `  sort?: Record<string, 1 | -1>;\n`;
    repositories += `}\n\n`;
    
    repositories += `export interface PaginateResult<T> {\n`;
    repositories += `  data: T[];\n`;
    repositories += `  total: number;\n`;
    repositories += `  page: number;\n`;
    repositories += `  limit: number;\n`;
    repositories += `  totalPages: number;\n`;
    repositories += `}\n\n`;
    
    // Base repository class
    repositories += `export abstract class BaseRepository<T extends Document> implements IRepository<T> {\n`;
    repositories += `  protected model: Model<T>;\n\n`;
    repositories += `  constructor(model: Model<T>) {\n`;
    repositories += `    this.model = model;\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async findAll(filter: FilterQuery<T> = {}, options: QueryOptions = {}): Promise<T[]> {\n`;
    repositories += `    return await this.model.find(filter, null, options).exec();\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async findById(id: string): Promise<T | null> {\n`;
    repositories += `    return await this.model.findById(id).exec();\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async findOne(filter: FilterQuery<T>): Promise<T | null> {\n`;
    repositories += `    return await this.model.findOne(filter).exec();\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async create(data: Partial<T>): Promise<T> {\n`;
    repositories += `    const document = new this.model(data);\n`;
    repositories += `    return await document.save();\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async update(id: string, data: UpdateQuery<T>): Promise<T | null> {\n`;
    repositories += `    return await this.model.findByIdAndUpdate(id, data, { new: true }).exec();\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async delete(id: string): Promise<T | null> {\n`;
    repositories += `    return await this.model.findByIdAndDelete(id).exec();\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async count(filter: FilterQuery<T> = {}): Promise<number> {\n`;
    repositories += `    return await this.model.countDocuments(filter).exec();\n`;
    repositories += `  }\n\n`;
    
    repositories += `  async paginate(filter: FilterQuery<T> = {}, options: PaginateOptions = {}): Promise<PaginateResult<T>> {\n`;
    repositories += `    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;\n`;
    repositories += `    const skip = (page - 1) * limit;\n`;
    repositories += `    \n`;
    repositories += `    const [data, total] = await Promise.all([\n`;
    repositories += `      this.model.find(filter).sort(sort).skip(skip).limit(limit).exec(),\n`;
    repositories += `      this.model.countDocuments(filter).exec()\n`;
    repositories += `    ]);\n`;
    repositories += `    \n`;
    repositories += `    return {\n`;
    repositories += `      data,\n`;
    repositories += `      total,\n`;
    repositories += `      page,\n`;
    repositories += `      limit,\n`;
    repositories += `      totalPages: Math.ceil(total / limit)\n`;
    repositories += `    };\n`;
    repositories += `  }\n`;
    repositories += `}\n\n`;
    
    // Generate specific repositories for each table
    for (const table of template.tables) {
      const className = this.toPascalCase(table.name);
      const interfaceName = `I${className}`;
      
      repositories += `// ${className} Repository\n`;
      repositories += `export class ${className}Repository extends BaseRepository<${interfaceName}> {\n`;
      repositories += `  constructor() {\n`;
      repositories += `    super(${className});\n`;
      repositories += `  }\n\n`;
      
      // Add specific methods based on fields
      const hasEmail = table.fields.some(f => f.name.toLowerCase().includes('email'));
      if (hasEmail) {
        repositories += `  async findByEmail(email: string): Promise<${interfaceName} | null> {\n`;
        repositories += `    return await this.findOne({ email: email.toLowerCase() });\n`;
        repositories += `  }\n\n`;
      }
      
      const hasSlug = table.fields.some(f => f.name.toLowerCase().includes('slug'));
      if (hasSlug) {
        repositories += `  async findBySlug(slug: string): Promise<${interfaceName} | null> {\n`;
        repositories += `    return await this.findOne({ slug });\n`;
        repositories += `  }\n\n`;
      }
      
      const hasStatus = table.fields.some(f => f.name.toLowerCase().includes('status'));
      if (hasStatus) {
        repositories += `  async findByStatus(status: string): Promise<${interfaceName}[]> {\n`;
        repositories += `    return await this.findAll({ status });\n`;
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
      const interfaceName = `I${className}`;
      
      services += `// ${className} Service\n`;
      services += `export class ${serviceName} {\n`;
      services += `  private repository: ${repoName};\n\n`;
      services += `  constructor() {\n`;
      services += `    this.repository = new ${repoName}();\n`;
      services += `  }\n\n`;
      
      // CRUD methods
      services += `  async getAll(options: PaginateOptions = {}): Promise<PaginateResult<${interfaceName}>> {\n`;
      services += `    return await this.repository.paginate({}, options);\n`;
      services += `  }\n\n`;
      
      services += `  async getById(id: string): Promise<${interfaceName} | null> {\n`;
      services += `    return await this.repository.findById(id);\n`;
      services += `  }\n\n`;
      
      services += `  async create(data: Partial<${interfaceName}>): Promise<${interfaceName}> {\n`;
      services += `    return await this.repository.create(data);\n`;
      services += `  }\n\n`;
      
      services += `  async update(id: string, data: Partial<${interfaceName}>): Promise<${interfaceName} | null> {\n`;
      services += `    return await this.repository.update(id, data);\n`;
      services += `  }\n\n`;
      
      services += `  async delete(id: string): Promise<${interfaceName} | null> {\n`;
      services += `    return await this.repository.delete(id);\n`;
      services += `  }\n\n`;
      
      // Custom methods based on fields
      const hasStatus = table.fields.some(f => f.name.toLowerCase().includes('status'));
      if (hasStatus) {
        services += `  async getByStatus(status: string, options: PaginateOptions = {}): Promise<PaginateResult<${interfaceName}>> {\n`;
        services += `    return await this.repository.paginate({ status }, options);\n`;
        services += `  }\n\n`;
      }
      
      const hasEmail = table.fields.some(f => f.name.toLowerCase().includes('email'));
      if (hasEmail) {
        services += `  async getByEmail(email: string): Promise<${interfaceName} | null> {\n`;
        services += `    return await this.repository.findByEmail(email);\n`;
        services += `  }\n\n`;
      }
      
      services += `}\n\n`;
    }
    
    return services;
  }
}