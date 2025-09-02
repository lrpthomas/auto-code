"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaAdapter = void 0;
class PrismaAdapter {
    config;
    constructor(config) {
        this.config = config;
    }
    generateSchema(template) {
        let schema = `// Prisma Schema for ${template.name}\n`;
        schema += `// Generated: ${new Date().toISOString()}\n\n`;
        // Generate generator block
        schema += `generator client {\n`;
        schema += `  provider = "prisma-client-js"\n`;
        schema += `  binaryTargets = ["native", "debian-openssl-1.1.x"]\n`;
        schema += `}\n\n`;
        // Generate datasource block
        schema += `datasource db {\n`;
        schema += `  provider = "${this.config.provider}"\n`;
        schema += `  url      = env("DATABASE_URL")\n`;
        if (this.config.directUrl) {
            schema += `  directUrl = env("DIRECT_URL")\n`;
        }
        if (this.config.shadowDatabaseUrl) {
            schema += `  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")\n`;
        }
        schema += `}\n\n`;
        // Generate models
        for (const table of template.tables) {
            schema += this.generateModel(table, template.tables);
            schema += '\n';
        }
        return schema;
    }
    generateModel(table, allTables) {
        const modelName = this.toPascalCase(table.name);
        let model = `model ${modelName} {\n`;
        // Generate fields
        for (const field of table.fields) {
            model += `  ${this.generateField(field)}\n`;
        }
        // Add default timestamps if not present
        const hasCreatedAt = table.fields.some(f => f.name.toLowerCase().includes('created'));
        const hasUpdatedAt = table.fields.some(f => f.name.toLowerCase().includes('updated'));
        if (!hasCreatedAt) {
            model += `  createdAt DateTime @default(now()) @map("created_at")\n`;
        }
        if (!hasUpdatedAt) {
            model += `  updatedAt DateTime @updatedAt @map("updated_at")\n`;
        }
        // Generate relationships
        if (table.relationships) {
            for (const rel of table.relationships) {
                model += this.generateRelationship(table, rel, allTables);
            }
        }
        // Add table mapping
        model += `\n  @@map("${table.name}")\n`;
        // Add indexes
        if (table.indexes) {
            for (const index of table.indexes) {
                model += this.generateIndex(index);
            }
        }
        model += `}`;
        return model;
    }
    generateField(field) {
        const fieldType = this.mapFieldToPrisma(field);
        const nullable = field.nullable ? '?' : '';
        const defaultValue = field.default !== undefined ? ` @default(${this.formatDefaultValue(field.default, field.type)})` : '';
        let fieldDef = `  ${field.name} ${fieldType}${nullable}${defaultValue}`;
        // Add constraints
        if (field.constraints) {
            for (const constraint of field.constraints) {
                switch (constraint.type) {
                    case 'primary':
                        fieldDef += ' @id';
                        if (field.type === 'integer') {
                            fieldDef += ' @default(autoincrement())';
                        }
                        break;
                    case 'unique':
                        fieldDef += ' @unique';
                        break;
                }
            }
        }
        // Add field mapping if field name is different from database column
        if (field.name.includes('_')) {
            fieldDef += ` @map("${field.name}")`;
        }
        return fieldDef;
    }
    generateRelationship(table, rel, allTables) {
        const targetTable = allTables.find(t => t.name === rel.table);
        if (!targetTable)
            return '';
        const targetModel = this.toPascalCase(rel.table);
        const currentModel = this.toPascalCase(table.name);
        switch (rel.type) {
            case 'one-to-one':
                return `\n  ${rel.table.toLowerCase()} ${targetModel}? @relation(fields: [${rel.foreignKey}], references: [id])`;
            case 'one-to-many':
                // This is the "many" side
                return `\n  ${table.name.toLowerCase()} ${currentModel}? @relation(fields: [${rel.foreignKey}], references: [id])`;
            case 'many-to-many':
                const relationName = `${currentModel}${targetModel}`;
                return `\n  ${rel.table.toLowerCase()}s ${targetModel}[] @relation("${relationName}")`;
            default:
                return '';
        }
    }
    generateIndex(index) {
        const fields = index.fields.map(f => `"${f}"`).join(', ');
        if (index.unique) {
            return `  @@unique([${fields}], name: "${index.name}")\n`;
        }
        else {
            return `  @@index([${fields}], name: "${index.name}")\n`;
        }
    }
    mapFieldToPrisma(field) {
        switch (field.type) {
            case 'string':
                return 'String';
            case 'text':
                return 'String';
            case 'integer':
                return 'Int';
            case 'bigint':
                return 'BigInt';
            case 'decimal':
                return 'Decimal';
            case 'boolean':
                return 'Boolean';
            case 'date':
            case 'datetime':
            case 'timestamp':
                return 'DateTime';
            case 'json':
                return 'Json';
            case 'uuid':
                return 'String';
            default:
                return 'String';
        }
    }
    formatDefaultValue(value, type) {
        if (value === null)
            return 'null';
        switch (type) {
            case 'string':
            case 'text':
                return `"${value}"`;
            case 'boolean':
                return value ? 'true' : 'false';
            case 'date':
            case 'datetime':
            case 'timestamp':
                if (value === 'now' || value === 'CURRENT_TIMESTAMP') {
                    return 'now()';
                }
                return `"${value}"`;
            case 'integer':
            case 'bigint':
            case 'decimal':
                return String(value);
            case 'uuid':
                if (value === 'uuid' || value === 'auto') {
                    return 'uuid()';
                }
                return `"${value}"`;
            default:
                return String(value);
        }
    }
    toPascalCase(str) {
        return str.replace(/(^|_)(.)/g, (_, __, char) => char.toUpperCase());
    }
    generateClientCode(template) {
        let client = `// Prisma Client for ${template.name}\n`;
        client += `// Generated: ${new Date().toISOString()}\n\n`;
        client += `import { PrismaClient, Prisma } from '@prisma/client';\n\n`;
        // Generate client instance with middleware
        client += `const prisma = new PrismaClient({\n`;
        client += `  log: ['query', 'info', 'warn', 'error'],\n`;
        client += `});\n\n`;
        // Add soft delete middleware
        client += `// Soft delete middleware\n`;
        client += `prisma.$use(async (params, next) => {\n`;
        client += `  if (params.action === 'delete') {\n`;
        client += `    params.action = 'update';\n`;
        client += `    params.args['data'] = { deletedAt: new Date() };\n`;
        client += `  }\n`;
        client += `  if (params.action === 'deleteMany') {\n`;
        client += `    params.action = 'updateMany';\n`;
        client += `    if (params.args.data != undefined) {\n`;
        client += `      params.args.data['deletedAt'] = new Date();\n`;
        client += `    } else {\n`;
        client += `      params.args['data'] = { deletedAt: new Date() };\n`;
        client += `    }\n`;
        client += `  }\n`;
        client += `  return next(params);\n`;
        client += `});\n\n`;
        // Add query filter middleware
        client += `// Filter deleted records middleware\n`;
        client += `prisma.$use(async (params, next) => {\n`;
        client += `  if (params.action === 'findUnique' || params.action === 'findFirst') {\n`;
        client += `    params.action = 'findFirst';\n`;
        client += `    params.args.where['deletedAt'] = null;\n`;
        client += `  }\n`;
        client += `  if (params.action === 'findMany') {\n`;
        client += `    if (params.args.where != undefined) {\n`;
        client += `      if (params.args.where.deletedAt == undefined) {\n`;
        client += `        params.args.where['deletedAt'] = null;\n`;
        client += `      }\n`;
        client += `    } else {\n`;
        client += `      params.args['where'] = { deletedAt: null };\n`;
        client += `    }\n`;
        client += `  }\n`;
        client += `  return next(params);\n`;
        client += `});\n\n`;
        client += `export { prisma, Prisma };\n\n`;
        // Generate type-safe client wrapper
        client += `export class DatabaseClient {\n`;
        client += `  static async connect(): Promise<void> {\n`;
        client += `    try {\n`;
        client += `      await prisma.$connect();\n`;
        client += `      console.log('Database connected successfully');\n`;
        client += `    } catch (error) {\n`;
        client += `      console.error('Database connection failed:', error);\n`;
        client += `      throw error;\n`;
        client += `    }\n`;
        client += `  }\n\n`;
        client += `  static async disconnect(): Promise<void> {\n`;
        client += `    await prisma.$disconnect();\n`;
        client += `  }\n\n`;
        client += `  static async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {\n`;
        client += `    return await prisma.$transaction(fn);\n`;
        client += `  }\n\n`;
        client += `  static async reset(): Promise<void> {\n`;
        client += `    const tableNames = [${template.tables.map(t => `'${t.name}'`).join(', ')}];\n`;
        client += `    await prisma.$transaction([\n`;
        client += `      prisma.$executeRaw\`SET FOREIGN_KEY_CHECKS = 0;\`,\n`;
        client += `      ...tableNames.map(name => prisma.$executeRawUnsafe(\`TRUNCATE TABLE \${name};\`)),\n`;
        client += `      prisma.$executeRaw\`SET FOREIGN_KEY_CHECKS = 1;\`\n`;
        client += `    ]);\n`;
        client += `  }\n`;
        client += `}\n`;
        return client;
    }
    generateRepositoryPattern(template) {
        let repositories = `// Repository Pattern for ${template.name}\n`;
        repositories += `// Generated: ${new Date().toISOString()}\n\n`;
        repositories += `import { prisma, Prisma } from './client';\n\n`;
        // Base repository interface
        repositories += `export interface IRepository<T, CreateInput, UpdateInput, WhereInput> {\n`;
        repositories += `  findMany(args?: { where?: WhereInput; skip?: number; take?: number; orderBy?: any }): Promise<T[]>;\n`;
        repositories += `  findUnique(where: WhereInput): Promise<T | null>;\n`;
        repositories += `  create(data: CreateInput): Promise<T>;\n`;
        repositories += `  update(where: WhereInput, data: UpdateInput): Promise<T>;\n`;
        repositories += `  delete(where: WhereInput): Promise<T>;\n`;
        repositories += `  count(where?: WhereInput): Promise<number>;\n`;
        repositories += `}\n\n`;
        // Generate repositories for each table
        for (const table of template.tables) {
            const modelName = this.toPascalCase(table.name);
            const repoName = `${modelName}Repository`;
            repositories += `// ${modelName} Repository\n`;
            repositories += `export class ${repoName} implements IRepository<\n`;
            repositories += `  Prisma.${modelName}GetPayload<{}>,\n`;
            repositories += `  Prisma.${modelName}CreateInput,\n`;
            repositories += `  Prisma.${modelName}UpdateInput,\n`;
            repositories += `  Prisma.${modelName}WhereUniqueInput\n`;
            repositories += `> {\n`;
            repositories += `  async findMany(args?: {\n`;
            repositories += `    where?: Prisma.${modelName}WhereInput;\n`;
            repositories += `    skip?: number;\n`;
            repositories += `    take?: number;\n`;
            repositories += `    orderBy?: Prisma.${modelName}OrderByWithRelationInput;\n`;
            repositories += `    include?: Prisma.${modelName}Include;\n`;
            repositories += `  }): Promise<Prisma.${modelName}GetPayload<{}>[]> {\n`;
            repositories += `    return await prisma.${table.name}.findMany(args);\n`;
            repositories += `  }\n\n`;
            repositories += `  async findUnique(where: Prisma.${modelName}WhereUniqueInput): Promise<Prisma.${modelName}GetPayload<{}> | null> {\n`;
            repositories += `    return await prisma.${table.name}.findUnique({ where });\n`;
            repositories += `  }\n\n`;
            repositories += `  async create(data: Prisma.${modelName}CreateInput): Promise<Prisma.${modelName}GetPayload<{}>> {\n`;
            repositories += `    return await prisma.${table.name}.create({ data });\n`;
            repositories += `  }\n\n`;
            repositories += `  async update(\n`;
            repositories += `    where: Prisma.${modelName}WhereUniqueInput,\n`;
            repositories += `    data: Prisma.${modelName}UpdateInput\n`;
            repositories += `  ): Promise<Prisma.${modelName}GetPayload<{}>> {\n`;
            repositories += `    return await prisma.${table.name}.update({ where, data });\n`;
            repositories += `  }\n\n`;
            repositories += `  async delete(where: Prisma.${modelName}WhereUniqueInput): Promise<Prisma.${modelName}GetPayload<{}>> {\n`;
            repositories += `    return await prisma.${table.name}.delete({ where });\n`;
            repositories += `  }\n\n`;
            repositories += `  async count(where?: Prisma.${modelName}WhereInput): Promise<number> {\n`;
            repositories += `    return await prisma.${table.name}.count({ where });\n`;
            repositories += `  }\n\n`;
            // Add specific methods based on fields
            const hasEmail = table.fields.some(f => f.name.toLowerCase().includes('email'));
            if (hasEmail) {
                repositories += `  async findByEmail(email: string): Promise<Prisma.${modelName}GetPayload<{}> | null> {\n`;
                repositories += `    return await this.findUnique({ email });\n`;
                repositories += `  }\n\n`;
            }
            const hasSlug = table.fields.some(f => f.name.toLowerCase().includes('slug'));
            if (hasSlug) {
                repositories += `  async findBySlug(slug: string): Promise<Prisma.${modelName}GetPayload<{}> | null> {\n`;
                repositories += `    return await this.findUnique({ slug });\n`;
                repositories += `  }\n\n`;
            }
            repositories += `  async paginate(page = 1, limit = 10, where?: Prisma.${modelName}WhereInput) {\n`;
            repositories += `    const skip = (page - 1) * limit;\n`;
            repositories += `    const [data, total] = await Promise.all([\n`;
            repositories += `      this.findMany({ where, skip, take: limit }),\n`;
            repositories += `      this.count(where)\n`;
            repositories += `    ]);\n`;
            repositories += `    return {\n`;
            repositories += `      data,\n`;
            repositories += `      total,\n`;
            repositories += `      page,\n`;
            repositories += `      limit,\n`;
            repositories += `      totalPages: Math.ceil(total / limit)\n`;
            repositories += `    };\n`;
            repositories += `  }\n\n`;
            repositories += `}\n\n`;
        }
        return repositories;
    }
    generateMigrationScript() {
        return `#!/bin/bash
# Prisma Migration Script
# Generated: ${new Date().toISOString()}

echo "Running Prisma migrations..."

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed database (optional)
if [ -f "prisma/seed.ts" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

echo "Migrations completed successfully"
`;
    }
    generateSeedFile(template) {
        let seed = `// Prisma Seed File for ${template.name}\n`;
        seed += `// Generated: ${new Date().toISOString()}\n\n`;
        seed += `import { PrismaClient } from '@prisma/client';\n\n`;
        seed += `const prisma = new PrismaClient();\n\n`;
        seed += `async function main() {\n`;
        seed += `  console.log('🌱 Seeding database...');\n\n`;
        for (const table of template.tables) {
            const modelName = this.toPascalCase(table.name);
            seed += `  // Seed ${modelName}\n`;
            seed += `  const ${table.name}Data = Array.from({ length: 10 }, (_, i) => ({\n`;
            for (const field of table.fields) {
                if (field.constraints?.some(c => c.type === 'primary'))
                    continue;
                if (field.name.toLowerCase().includes('created') || field.name.toLowerCase().includes('updated'))
                    continue;
                seed += `    ${field.name}: ${this.generateSeedValue(field, 'i')},\n`;
            }
            seed += `  }));\n\n`;
            seed += `  await prisma.${table.name}.createMany({\n`;
            seed += `    data: ${table.name}Data,\n`;
            seed += `    skipDuplicates: true,\n`;
            seed += `  });\n\n`;
        }
        seed += `  console.log('✅ Seeding completed successfully');\n`;
        seed += `}\n\n`;
        seed += `main()\n`;
        seed += `  .catch((e) => {\n`;
        seed += `    console.error('❌ Seeding failed:', e);\n`;
        seed += `    process.exit(1);\n`;
        seed += `  })\n`;
        seed += `  .finally(async () => {\n`;
        seed += `    await prisma.$disconnect();\n`;
        seed += `  });\n`;
        return seed;
    }
    generateSeedValue(field, indexVar) {
        const fieldName = field.name.toLowerCase();
        switch (field.type) {
            case 'string':
                if (fieldName.includes('email')) {
                    return `\`user\${${indexVar}}@example.com\``;
                }
                else if (fieldName.includes('name')) {
                    return `\`Name \${${indexVar}}\``;
                }
                else {
                    return `\`${field.name} \${${indexVar}}\``;
                }
            case 'text':
                return `\`This is sample text content for ${field.name} \${${indexVar}}\``;
            case 'integer':
            case 'bigint':
                return `${indexVar} + 1`;
            case 'decimal':
                return `(${indexVar} + 1) * 10.99`;
            case 'boolean':
                return `${indexVar} % 2 === 0`;
            case 'uuid':
                return `crypto.randomUUID()`;
            default:
                return `\`value\${${indexVar}}\``;
        }
    }
}
exports.PrismaAdapter = PrismaAdapter;
//# sourceMappingURL=prisma-adapter.js.map