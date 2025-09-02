"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgreSQLGenerator = void 0;
const index_1 = require("./index");
class PostgreSQLGenerator extends index_1.DatabaseGenerator {
    constructor(config) {
        super(config);
    }
    async generateSchema(template) {
        let schema = `-- PostgreSQL Schema: ${template.name}\n`;
        schema += `-- Description: ${template.description}\n\n`;
        // Generate tables
        for (const table of template.tables) {
            schema += this.generateTable(table);
            schema += '\n';
        }
        // Generate indexes
        for (const table of template.tables) {
            if (table.indexes) {
                schema += this.generateIndexes(table);
                schema += '\n';
            }
        }
        // Generate relationships (foreign keys)
        for (const table of template.tables) {
            if (table.relationships) {
                schema += this.generateRelationships(table);
                schema += '\n';
            }
        }
        // Generate stored procedures
        if (template.procedures) {
            for (const procedure of template.procedures) {
                schema += this.generateStoredProcedure(procedure);
                schema += '\n';
            }
        }
        // Generate triggers
        if (template.triggers) {
            for (const trigger of template.triggers) {
                schema += this.generateTrigger(trigger);
                schema += '\n';
            }
        }
        return schema;
    }
    generateTable(table) {
        let sql = `CREATE TABLE ${table.name} (\n`;
        const fieldDefinitions = table.fields.map(field => {
            return `  ${this.generateField(field)}`;
        });
        sql += fieldDefinitions.join(',\n');
        sql += '\n);\n';
        return sql;
    }
    generateField(field) {
        let definition = `${field.name} ${this.mapFieldType(field.type)}`;
        if (field.constraints) {
            for (const constraint of field.constraints) {
                definition += this.generateConstraint(constraint);
            }
        }
        if (!field.nullable) {
            definition += ' NOT NULL';
        }
        if (field.default !== undefined) {
            definition += ` DEFAULT ${this.formatDefaultValue(field.default)}`;
        }
        return definition;
    }
    mapFieldType(type) {
        const typeMap = {
            'string': 'VARCHAR(255)',
            'text': 'TEXT',
            'integer': 'INTEGER',
            'bigint': 'BIGINT',
            'decimal': 'DECIMAL(10,2)',
            'boolean': 'BOOLEAN',
            'date': 'DATE',
            'datetime': 'TIMESTAMP',
            'timestamp': 'TIMESTAMP WITH TIME ZONE',
            'json': 'JSONB',
            'uuid': 'UUID'
        };
        return typeMap[type] || type.toUpperCase();
    }
    generateConstraint(constraint) {
        switch (constraint.type) {
            case 'primary':
                return ' PRIMARY KEY';
            case 'unique':
                return ' UNIQUE';
            case 'not null':
                return ' NOT NULL';
            case 'check':
                return ` CHECK (${constraint.value})`;
            default:
                return '';
        }
    }
    formatDefaultValue(value) {
        if (typeof value === 'string') {
            return `'${value}'`;
        }
        if (typeof value === 'boolean') {
            return value ? 'TRUE' : 'FALSE';
        }
        return String(value);
    }
    generateIndexes(table) {
        let sql = '';
        if (table.indexes) {
            for (const index of table.indexes) {
                const uniqueClause = index.unique ? 'UNIQUE ' : '';
                const typeClause = index.type ? ` USING ${index.type.toUpperCase()}` : '';
                const fieldsClause = index.fields.join(', ');
                sql += `CREATE ${uniqueClause}INDEX ${index.name} ON ${table.name}${typeClause} (${fieldsClause});\n`;
            }
        }
        return sql;
    }
    generateRelationships(table) {
        let sql = '';
        if (table.relationships) {
            for (const relationship of table.relationships) {
                const onDelete = relationship.onDelete ? ` ON DELETE ${relationship.onDelete.toUpperCase().replace(' ', ' ')}` : '';
                const onUpdate = relationship.onUpdate ? ` ON UPDATE ${relationship.onUpdate.toUpperCase().replace(' ', ' ')}` : '';
                sql += `ALTER TABLE ${table.name} ADD CONSTRAINT fk_${table.name}_${relationship.foreignKey} `;
                sql += `FOREIGN KEY (${relationship.foreignKey}) REFERENCES ${relationship.table}(id)`;
                sql += `${onDelete}${onUpdate};\n`;
            }
        }
        return sql;
    }
    generateStoredProcedure(procedure) {
        let sql = `CREATE OR REPLACE FUNCTION ${procedure.name}(`;
        if (procedure.parameters) {
            const params = procedure.parameters.map(param => {
                const direction = param.direction ? `${param.direction.toUpperCase()} ` : '';
                return `${direction}${param.name} ${param.type}`;
            });
            sql += params.join(', ');
        }
        sql += ')';
        if (procedure.returns) {
            sql += ` RETURNS ${procedure.returns}`;
        }
        else {
            sql += ' RETURNS VOID';
        }
        sql += ' AS $$\n';
        sql += 'BEGIN\n';
        sql += procedure.body;
        sql += '\nEND;\n';
        sql += '$$ LANGUAGE plpgsql;\n';
        return sql;
    }
    generateTrigger(trigger) {
        const timing = trigger.event.toUpperCase();
        const event = trigger.action.toUpperCase();
        let sql = `CREATE TRIGGER ${trigger.name}\n`;
        sql += `  ${timing} ${event} ON ${trigger.table}\n`;
        sql += `  FOR EACH ROW\n`;
        sql += `  EXECUTE FUNCTION ${trigger.function}();\n`;
        return sql;
    }
    async generateMigration(from, to) {
        let migration = `-- Migration from ${from.name} to ${to.name}\n\n`;
        // Simple implementation - compare tables and generate ALTER statements
        const fromTableNames = from.tables.map(t => t.name);
        const toTableNames = to.tables.map(t => t.name);
        // New tables
        const newTables = to.tables.filter(t => !fromTableNames.includes(t.name));
        for (const table of newTables) {
            migration += `-- Create new table: ${table.name}\n`;
            migration += this.generateTable(table);
            migration += '\n';
        }
        // Dropped tables
        const droppedTables = from.tables.filter(t => !toTableNames.includes(t.name));
        for (const table of droppedTables) {
            migration += `-- Drop table: ${table.name}\n`;
            migration += `DROP TABLE IF EXISTS ${table.name};\n\n`;
        }
        return migration;
    }
    async generateSeeds(template, data) {
        let seeds = `-- Seed data for ${template.name}\n\n`;
        for (const [tableName, records] of Object.entries(data)) {
            if (records.length === 0)
                continue;
            seeds += `-- Seed data for ${tableName}\n`;
            const columns = Object.keys(records[0]);
            const columnNames = columns.join(', ');
            for (const record of records) {
                const values = columns.map(col => {
                    const value = record[col];
                    if (value === null)
                        return 'NULL';
                    if (typeof value === 'string')
                        return `'${value.replace(/'/g, "''")}'`;
                    if (typeof value === 'boolean')
                        return value ? 'TRUE' : 'FALSE';
                    return String(value);
                }).join(', ');
                seeds += `INSERT INTO ${tableName} (${columnNames}) VALUES (${values});\n`;
            }
            seeds += '\n';
        }
        return seeds;
    }
    async generateBackupScript() {
        return `#!/bin/bash
# PostgreSQL Backup Script for ${this.config.name}

DB_NAME="${this.config.name}"
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/$DB_NAME_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
pg_dump $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove backups older than 30 days
find $BACKUP_DIR -name "$DB_NAME*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
`;
    }
    async generateConnectionPool() {
        return `import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || '${this.config.name}',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of connections
  min: 5,  // Minimum number of connections
  idle: 1000, // Close idle connections after 1 second
  acquire: 30000, // Maximum time to get connection
  evict: 1000, // Run eviction every second
});

export class DatabasePool {
  static async query(text: string, params?: any[]): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  static async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async close(): Promise<void> {
    await pool.end();
  }
}
`;
    }
    async generateQueryBuilder() {
        return `export class PostgreSQLQueryBuilder {
  private _select: string[] = [];
  private _from: string = '';
  private _joins: string[] = [];
  private _where: string[] = [];
  private _groupBy: string[] = [];
  private _having: string[] = [];
  private _orderBy: string[] = [];
  private _limit: number | null = null;
  private _offset: number | null = null;
  private _params: any[] = [];

  select(columns: string | string[]): this {
    if (Array.isArray(columns)) {
      this._select.push(...columns);
    } else {
      this._select.push(columns);
    }
    return this;
  }

  from(table: string): this {
    this._from = table;
    return this;
  }

  join(table: string, condition: string): this {
    this._joins.push(\`INNER JOIN \${table} ON \${condition}\`);
    return this;
  }

  leftJoin(table: string, condition: string): this {
    this._joins.push(\`LEFT JOIN \${table} ON \${condition}\`);
    return this;
  }

  where(condition: string, value?: any): this {
    if (value !== undefined) {
      this._params.push(value);
      this._where.push(\`\${condition} $\${this._params.length}\`);
    } else {
      this._where.push(condition);
    }
    return this;
  }

  whereIn(column: string, values: any[]): this {
    const placeholders = values.map((_, index) => \`$\${this._params.length + index + 1}\`).join(', ');
    this._params.push(...values);
    this._where.push(\`\${column} IN (\${placeholders})\`);
    return this;
  }

  groupBy(columns: string | string[]): this {
    if (Array.isArray(columns)) {
      this._groupBy.push(...columns);
    } else {
      this._groupBy.push(columns);
    }
    return this;
  }

  having(condition: string): this {
    this._having.push(condition);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this._orderBy.push(\`\${column} \${direction}\`);
    return this;
  }

  limit(count: number): this {
    this._limit = count;
    return this;
  }

  offset(count: number): this {
    this._offset = count;
    return this;
  }

  build(): { query: string; params: any[] } {
    let query = 'SELECT ';
    query += this._select.length > 0 ? this._select.join(', ') : '*';
    query += \` FROM \${this._from}\`;

    if (this._joins.length > 0) {
      query += ' ' + this._joins.join(' ');
    }

    if (this._where.length > 0) {
      query += ' WHERE ' + this._where.join(' AND ');
    }

    if (this._groupBy.length > 0) {
      query += ' GROUP BY ' + this._groupBy.join(', ');
    }

    if (this._having.length > 0) {
      query += ' HAVING ' + this._having.join(' AND ');
    }

    if (this._orderBy.length > 0) {
      query += ' ORDER BY ' + this._orderBy.join(', ');
    }

    if (this._limit !== null) {
      query += \` LIMIT \${this._limit}\`;
    }

    if (this._offset !== null) {
      query += \` OFFSET \${this._offset}\`;
    }

    return { query, params: this._params };
  }

  // Insert builder
  static insert(table: string): InsertBuilder {
    return new InsertBuilder(table);
  }

  // Update builder
  static update(table: string): UpdateBuilder {
    return new UpdateBuilder(table);
  }

  // Delete builder
  static delete(table: string): DeleteBuilder {
    return new DeleteBuilder(table);
  }
}

class InsertBuilder {
  private table: string;
  private _values: Record<string, any> = {};

  constructor(table: string) {
    this.table = table;
  }

  values(data: Record<string, any>): this {
    this._values = { ...this._values, ...data };
    return this;
  }

  build(): { query: string; params: any[] } {
    const columns = Object.keys(this._values);
    const placeholders = columns.map((_, index) => \`$\${index + 1}\`);
    const params = Object.values(this._values);

    const query = \`INSERT INTO \${this.table} (\${columns.join(', ')}) VALUES (\${placeholders.join(', ')})\`;
    
    return { query, params };
  }
}

class UpdateBuilder {
  private table: string;
  private _set: Record<string, any> = {};
  private _where: string[] = [];
  private _params: any[] = [];

  constructor(table: string) {
    this.table = table;
  }

  set(data: Record<string, any>): this {
    this._set = { ...this._set, ...data };
    return this;
  }

  where(condition: string, value?: any): this {
    if (value !== undefined) {
      this._params.push(value);
      this._where.push(\`\${condition} $\${this._params.length}\`);
    } else {
      this._where.push(condition);
    }
    return this;
  }

  build(): { query: string; params: any[] } {
    const setClause = Object.keys(this._set).map((key, index) => {
      this._params.unshift(this._set[key]);
      return \`\${key} = $\${index + 1}\`;
    });

    // Adjust where clause parameter indices
    const whereClause = this._where.map(clause => {
      return clause.replace(/\\$(\\d+)/g, (match, num) => {
        return \`$\${parseInt(num) + Object.keys(this._set).length}\`;
      });
    });

    let query = \`UPDATE \${this.table} SET \${setClause.join(', ')}\`;
    
    if (whereClause.length > 0) {
      query += ' WHERE ' + whereClause.join(' AND ');
    }

    return { query, params: this._params };
  }
}

class DeleteBuilder {
  private table: string;
  private _where: string[] = [];
  private _params: any[] = [];

  constructor(table: string) {
    this.table = table;
  }

  where(condition: string, value?: any): this {
    if (value !== undefined) {
      this._params.push(value);
      this._where.push(\`\${condition} $\${this._params.length}\`);
    } else {
      this._where.push(condition);
    }
    return this;
  }

  build(): { query: string; params: any[] } {
    let query = \`DELETE FROM \${this.table}\`;
    
    if (this._where.length > 0) {
      query += ' WHERE ' + this._where.join(' AND ');
    }

    return { query, params: this._params };
  }
}
`;
    }
}
exports.PostgreSQLGenerator = PostgreSQLGenerator;
//# sourceMappingURL=postgresql.js.map