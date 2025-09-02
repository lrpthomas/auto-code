import { 
  DatabaseGenerator, 
  SchemaTemplate, 
  TableConfig, 
  FieldConfig, 
  IndexConfig, 
  DatabaseConfig
} from './index';

export interface MongoDocumentConfig {
  collection: string;
  schema: Record<string, any>;
  indexes?: MongoIndexConfig[];
  sharding?: MongoShardingConfig;
  validators?: MongoValidatorConfig;
}

export interface MongoIndexConfig {
  name: string;
  keys: Record<string, 1 | -1 | 'text' | '2dsphere'>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    partialFilterExpression?: Record<string, any>;
    background?: boolean;
  };
}

export interface MongoShardingConfig {
  shardKey: Record<string, 1 | -1>;
  chunks?: number;
}

export interface MongoValidatorConfig {
  $jsonSchema: Record<string, any>;
}

export class MongoDBGenerator extends DatabaseGenerator {
  constructor(config: DatabaseConfig) {
    super(config);
  }

  async generateSchema(template: SchemaTemplate): Promise<string> {
    let schema = `// MongoDB Schema: ${template.name}\n`;
    schema += `// Description: ${template.description}\n\n`;

    // Convert tables to collections
    const collections = this.convertTablesToCollections(template.tables);
    
    for (const collection of collections) {
      schema += this.generateCollection(collection);
      schema += '\n';
    }

    // Generate aggregation pipelines
    schema += this.generateAggregationPipelines(collections);

    return schema;
  }

  private convertTablesToCollections(tables: TableConfig[]): MongoDocumentConfig[] {
    return tables.map(table => {
      const schema = this.generateMongoSchema(table);
      const indexes = this.convertIndexes(table.indexes || []);
      
      return {
        collection: table.name,
        schema,
        indexes,
        validators: {
          $jsonSchema: this.generateJsonSchema(table)
        }
      };
    });
  }

  private generateMongoSchema(table: TableConfig): Record<string, any> {
    const schema: Record<string, any> = {};
    
    for (const field of table.fields) {
      schema[field.name] = {
        type: this.mapFieldType(field.type),
        required: !field.nullable,
        default: field.default
      };
    }
    
    return schema;
  }

  private generateJsonSchema(table: TableConfig): Record<string, any> {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const field of table.fields) {
      properties[field.name] = this.getJsonSchemaType(field);
      
      if (!field.nullable && !field.default) {
        required.push(field.name);
      }
    }
    
    return {
      bsonType: 'object',
      properties,
      required
    };
  }

  private getJsonSchemaType(field: FieldConfig): Record<string, any> {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'text': 'string',
      'integer': 'int',
      'bigint': 'long',
      'decimal': 'decimal',
      'boolean': 'bool',
      'date': 'date',
      'datetime': 'date',
      'timestamp': 'date',
      'json': 'object',
      'uuid': 'string'
    };

    const bsonType = typeMap[field.type] || 'string';
    const schema: Record<string, any> = { bsonType };

    if (field.type === 'string' && field.constraints) {
      const maxLength = field.constraints.find(c => c.type === 'check' && c.value);
      if (maxLength) {
        schema.maxLength = 255;
      }
    }

    return schema;
  }

  private mapFieldType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'text': 'String',
      'integer': 'Number',
      'bigint': 'Number',
      'decimal': 'Number',
      'boolean': 'Boolean',
      'date': 'Date',
      'datetime': 'Date',
      'timestamp': 'Date',
      'json': 'Object',
      'uuid': 'String'
    };

    return typeMap[type] || 'String';
  }

  private convertIndexes(indexes: IndexConfig[]): MongoIndexConfig[] {
    return indexes.map(index => {
      const keys: Record<string, 1 | -1> = {};
      
      for (const field of index.fields) {
        keys[field] = 1; // Default ascending
      }
      
      return {
        name: index.name,
        keys,
        options: {
          unique: index.unique,
          background: true
        }
      };
    });
  }

  private generateCollection(collection: MongoDocumentConfig): string {
    let code = `// Collection: ${collection.collection}\n`;
    
    // Schema definition
    code += `const ${collection.collection}Schema = {\n`;
    for (const [field, config] of Object.entries(collection.schema)) {
      code += `  ${field}: {\n`;
      code += `    type: ${config.type},\n`;
      if (config.required) code += `    required: true,\n`;
      if (config.default !== undefined) code += `    default: ${JSON.stringify(config.default)},\n`;
      code += `  },\n`;
    }
    code += `};\n\n`;

    // Validator
    if (collection.validators) {
      code += `// Validator for ${collection.collection}\n`;
      code += `db.createCollection("${collection.collection}", {\n`;
      code += `  validator: ${JSON.stringify(collection.validators, null, 2)}\n`;
      code += `});\n\n`;
    }

    // Indexes
    if (collection.indexes) {
      code += `// Indexes for ${collection.collection}\n`;
      for (const index of collection.indexes) {
        code += `db.${collection.collection}.createIndex(`;
        code += `${JSON.stringify(index.keys)}, `;
        code += `${JSON.stringify({ name: index.name, ...index.options })});\n`;
      }
      code += '\n';
    }

    // Sharding
    if (collection.sharding) {
      code += `// Sharding for ${collection.collection}\n`;
      code += `sh.enableSharding("${this.config.name}");\n`;
      code += `sh.shardCollection("${this.config.name}.${collection.collection}", `;
      code += `${JSON.stringify(collection.sharding.shardKey)});\n\n`;
    }

    return code;
  }

  private generateAggregationPipelines(collections: MongoDocumentConfig[]): string {
    let pipelines = `// Common Aggregation Pipelines\n\n`;
    
    for (const collection of collections) {
      pipelines += `// Pipelines for ${collection.collection}\n`;
      pipelines += `const ${collection.collection}Pipelines = {\n`;
      
      // Basic aggregation examples
      pipelines += `  // Get all documents with pagination\n`;
      pipelines += `  paginated: (page = 0, limit = 10) => [\n`;
      pipelines += `    { $skip: page * limit },\n`;
      pipelines += `    { $limit: limit },\n`;
      pipelines += `    { $sort: { _id: -1 } }\n`;
      pipelines += `  ],\n\n`;
      
      pipelines += `  // Count documents\n`;
      pipelines += `  count: () => [\n`;
      pipelines += `    { $count: "total" }\n`;
      pipelines += `  ],\n\n`;
      
      pipelines += `  // Group by date\n`;
      pipelines += `  groupByDate: (dateField = 'createdAt') => [\n`;
      pipelines += `    {\n`;
      pipelines += `      $group: {\n`;
      pipelines += `        _id: {\n`;
      pipelines += `          year: { $year: \`$\${dateField}\` },\n`;
      pipelines += `          month: { $month: \`$\${dateField}\` },\n`;
      pipelines += `          day: { $dayOfMonth: \`$\${dateField}\` }\n`;
      pipelines += `        },\n`;
      pipelines += `        count: { $sum: 1 }\n`;
      pipelines += `      }\n`;
      pipelines += `    }\n`;
      pipelines += `  ]\n`;
      
      pipelines += `};\n\n`;
    }
    
    return pipelines;
  }

  async generateMigration(from: SchemaTemplate, to: SchemaTemplate): Promise<string> {
    let migration = `// MongoDB Migration from ${from.name} to ${to.name}\n\n`;
    
    const fromCollections = from.tables.map(t => t.name);
    const toCollections = to.tables.map(t => t.name);
    
    // New collections
    const newCollections = to.tables.filter(t => !fromCollections.includes(t.name));
    for (const table of newCollections) {
      migration += `// Create collection: ${table.name}\n`;
      const mongoCollection = this.convertTablesToCollections([table])[0];
      migration += this.generateCollection(mongoCollection);
      migration += '\n';
    }
    
    // Dropped collections
    const droppedCollections = from.tables.filter(t => !toCollections.includes(t.name));
    for (const table of droppedCollections) {
      migration += `// Drop collection: ${table.name}\n`;
      migration += `db.${table.name}.drop();\n\n`;
    }
    
    // Field migrations
    migration += `// Field migrations\n`;
    migration += `// Note: MongoDB migrations often require custom scripts\n`;
    migration += `// Consider using bulk operations for large datasets\n\n`;
    
    return migration;
  }

  async generateSeeds(template: SchemaTemplate, data: Record<string, any[]>): Promise<string> {
    let seeds = `// Seed data for ${template.name}\n\n`;
    
    for (const [collectionName, records] of Object.entries(data)) {
      if (records.length === 0) continue;
      
      seeds += `// Seed data for ${collectionName}\n`;
      seeds += `db.${collectionName}.insertMany([\n`;
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        seeds += `  ${JSON.stringify(record, null, 2)}`;
        if (i < records.length - 1) seeds += ',';
        seeds += '\n';
      }
      
      seeds += `]);\n\n`;
    }
    
    return seeds;
  }

  async generateBackupScript(): Promise<string> {
    return `#!/bin/bash
# MongoDB Backup Script for ${this.config.name}

DB_NAME="${this.config.name}"
BACKUP_DIR="/var/backups/mongodb"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/$DB_NAME_$TIMESTAMP"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
mongodump --db $DB_NAME --out $BACKUP_FILE

# Compress backup
tar -czf "$BACKUP_FILE.tar.gz" -C $BACKUP_DIR "$DB_NAME_$TIMESTAMP"

# Remove uncompressed backup
rm -rf $BACKUP_FILE

# Remove backups older than 30 days
find $BACKUP_DIR -name "$DB_NAME*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.tar.gz"
`;
  }

  async generateConnectionPool(): Promise<string> {
    return `import { MongoClient, Db } from 'mongodb';

class MongoConnectionPool {
  private static instance: MongoConnectionPool;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  static getInstance(): MongoConnectionPool {
    if (!MongoConnectionPool.instance) {
      MongoConnectionPool.instance = new MongoConnectionPool();
    }
    return MongoConnectionPool.instance;
  }

  async connect(): Promise<void> {
    if (this.client) return;

    const uri = process.env.MONGODB_URI || \`mongodb://localhost:27017/${this.config.name}\`;
    
    this.client = new MongoClient(uri, {
      maxPoolSize: 20, // Maximum number of connections
      minPoolSize: 5,  // Minimum number of connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // How long to try to connect
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 5000
      },
      readPreference: 'secondaryPreferred'
    });

    await this.client.connect();
    this.db = this.client.db('${this.config.name}');
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async transaction<T>(operations: (session: any) => Promise<T>): Promise<T> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const session = this.client.startSession();
    
    try {
      let result: T;
      
      await session.withTransaction(async () => {
        result = await operations(session);
      });
      
      return result!;
    } finally {
      await session.endSession();
    }
  }
}

export const mongoPool = MongoConnectionPool.getInstance();
export { MongoConnectionPool };
`;
  }

  async generateQueryBuilder(): Promise<string> {
    return `export class MongoQueryBuilder {
  private collection: string;
  private _pipeline: any[] = [];
  private _match: Record<string, any> = {};
  private _sort: Record<string, 1 | -1> = {};
  private _limit: number | null = null;
  private _skip: number | null = null;
  private _project: Record<string, 1 | 0> = {};

  constructor(collection: string) {
    this.collection = collection;
  }

  // Match stage (equivalent to WHERE)
  match(conditions: Record<string, any>): this {
    this._match = { ...this._match, ...conditions };
    return this;
  }

  where(field: string, operator: string, value: any): this {
    switch (operator) {
      case '=':
      case '==':
        this._match[field] = value;
        break;
      case '!=':
        this._match[field] = { $ne: value };
        break;
      case '>':
        this._match[field] = { $gt: value };
        break;
      case '>=':
        this._match[field] = { $gte: value };
        break;
      case '<':
        this._match[field] = { $lt: value };
        break;
      case '<=':
        this._match[field] = { $lte: value };
        break;
      case 'in':
        this._match[field] = { $in: Array.isArray(value) ? value : [value] };
        break;
      case 'nin':
        this._match[field] = { $nin: Array.isArray(value) ? value : [value] };
        break;
      case 'like':
        this._match[field] = { $regex: value, $options: 'i' };
        break;
    }
    return this;
  }

  whereIn(field: string, values: any[]): this {
    this._match[field] = { $in: values };
    return this;
  }

  whereNotIn(field: string, values: any[]): this {
    this._match[field] = { $nin: values };
    return this;
  }

  whereBetween(field: string, min: any, max: any): this {
    this._match[field] = { $gte: min, $lte: max };
    return this;
  }

  whereExists(field: string, exists: boolean = true): this {
    this._match[field] = { $exists: exists };
    return this;
  }

  // Project stage (equivalent to SELECT)
  select(fields: string[] | Record<string, 1 | 0>): this {
    if (Array.isArray(fields)) {
      for (const field of fields) {
        this._project[field] = 1;
      }
    } else {
      this._project = { ...this._project, ...fields };
    }
    return this;
  }

  // Sort stage (equivalent to ORDER BY)
  orderBy(field: string, direction: 'asc' | 'desc' | 1 | -1 = 'asc'): this {
    const dir = direction === 'desc' || direction === -1 ? -1 : 1;
    this._sort[field] = dir;
    return this;
  }

  sort(sortSpec: Record<string, 1 | -1>): this {
    this._sort = { ...this._sort, ...sortSpec };
    return this;
  }

  // Limit stage
  limit(count: number): this {
    this._limit = count;
    return this;
  }

  // Skip stage (equivalent to OFFSET)
  skip(count: number): this {
    this._skip = count;
    return this;
  }

  offset(count: number): this {
    return this.skip(count);
  }

  // Pagination helper
  paginate(page: number, perPage: number): this {
    this._skip = (page - 1) * perPage;
    this._limit = perPage;
    return this;
  }

  // Group stage
  groupBy(groupSpec: Record<string, any>): this {
    this._pipeline.push({ $group: groupSpec });
    return this;
  }

  // Lookup stage (equivalent to JOIN)
  leftJoin(
    fromCollection: string,
    localField: string,
    foreignField: string,
    as: string
  ): this {
    this._pipeline.push({
      $lookup: {
        from: fromCollection,
        localField,
        foreignField,
        as
      }
    });
    return this;
  }

  // Unwind stage
  unwind(path: string, preserveNullAndEmptyArrays: boolean = false): this {
    this._pipeline.push({
      $unwind: {
        path: \`$\${path}\`,
        preserveNullAndEmptyArrays
      }
    });
    return this;
  }

  // Add custom pipeline stage
  addStage(stage: Record<string, any>): this {
    this._pipeline.push(stage);
    return this;
  }

  // Build aggregation pipeline
  buildPipeline(): any[] {
    const pipeline: any[] = [];

    // Match stage
    if (Object.keys(this._match).length > 0) {
      pipeline.push({ $match: this._match });
    }

    // Add custom pipeline stages
    pipeline.push(...this._pipeline);

    // Project stage
    if (Object.keys(this._project).length > 0) {
      pipeline.push({ $project: this._project });
    }

    // Sort stage
    if (Object.keys(this._sort).length > 0) {
      pipeline.push({ $sort: this._sort });
    }

    // Skip stage
    if (this._skip !== null) {
      pipeline.push({ $skip: this._skip });
    }

    // Limit stage
    if (this._limit !== null) {
      pipeline.push({ $limit: this._limit });
    }

    return pipeline;
  }

  // Build simple find query (for non-aggregation queries)
  buildFind(): {
    filter: Record<string, any>;
    options: Record<string, any>;
  } {
    const options: Record<string, any> = {};

    if (Object.keys(this._project).length > 0) {
      options.projection = this._project;
    }

    if (Object.keys(this._sort).length > 0) {
      options.sort = this._sort;
    }

    if (this._skip !== null) {
      options.skip = this._skip;
    }

    if (this._limit !== null) {
      options.limit = this._limit;
    }

    return {
      filter: this._match,
      options
    };
  }

  // Static factory methods
  static collection(name: string): MongoQueryBuilder {
    return new MongoQueryBuilder(name);
  }

  // Aggregation helpers
  static aggregate(collection: string): MongoQueryBuilder {
    return new MongoQueryBuilder(collection);
  }

  // Count helper
  count(): any[] {
    return [
      ...(Object.keys(this._match).length > 0 ? [{ $match: this._match }] : []),
      ...this._pipeline,
      { $count: 'total' }
    ];
  }

  // Distinct helper
  distinct(field: string): any[] {
    return [
      ...(Object.keys(this._match).length > 0 ? [{ $match: this._match }] : []),
      { $group: { _id: \`$\${field}\` } }
    ];
  }
}

// Usage examples:
// const query = MongoQueryBuilder.collection('users')
//   .where('age', '>', 18)
//   .where('status', '=', 'active')
//   .select(['name', 'email'])
//   .orderBy('createdAt', 'desc')
//   .limit(10);
//
// const pipeline = query.buildPipeline();
// const findQuery = query.buildFind();
`;
  }
}