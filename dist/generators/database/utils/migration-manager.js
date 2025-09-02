"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationManager = void 0;
const postgresql_1 = require("../postgresql");
class MigrationManager {
    generator;
    options;
    constructor(generator, options = {}) {
        this.generator = generator;
        this.options = {
            directory: './migrations',
            tableName: 'schema_migrations',
            lockTimeout: 30000,
            ...options
        };
    }
    async createMigration(name, from, to) {
        const timestamp = this.generateTimestamp();
        const migrationId = `${timestamp}_${this.slugify(name)}`;
        const upScript = await this.generator.generateMigration(from, to);
        const downScript = await this.generateDownMigration(from, to);
        const migrationContent = this.generateMigrationFile(migrationId, name, upScript, downScript);
        return migrationContent;
    }
    generateMigrationFile(id, name, up, down) {
        const isPostgres = this.generator instanceof postgresql_1.PostgreSQLGenerator;
        if (isPostgres) {
            return `-- Migration: ${id}
-- Description: ${name}
-- Generated: ${new Date().toISOString()}

-- Up Migration
-- +migrate Up
${up}

-- Down Migration  
-- +migrate Down
${down}
`;
        }
        else {
            return `// Migration: ${id}
// Description: ${name}
// Generated: ${new Date().toISOString()}

// Up Migration
const up = async (db) => {
${up.split('\n').map(line => `  ${line}`).join('\n')}
};

// Down Migration
const down = async (db) => {
${down.split('\n').map(line => `  ${line}`).join('\n')}
};

module.exports = { up, down };
`;
        }
    }
    async generateDownMigration(from, to) {
        // Generate reverse migration by swapping from and to
        return await this.generator.generateMigration(to, from);
    }
    generateTimestamp() {
        const now = new Date();
        return now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');
    }
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '_')
            .replace(/^-+|-+$/g, '');
    }
    async runMigrations() {
        const pendingMigrations = await this.getPendingMigrations();
        for (const migration of pendingMigrations) {
            await this.runMigration(migration);
        }
    }
    async rollbackMigration(steps = 1) {
        const appliedMigrations = await this.getAppliedMigrations();
        const toRollback = appliedMigrations.slice(-steps);
        for (const migration of toRollback.reverse()) {
            await this.rollbackSingleMigration(migration);
        }
    }
    async getPendingMigrations() {
        // Implementation depends on database type
        if (this.generator instanceof postgresql_1.PostgreSQLGenerator) {
            return this.getPostgresPendingMigrations();
        }
        else {
            return this.getMongoPendingMigrations();
        }
    }
    async getAppliedMigrations() {
        // Implementation depends on database type
        if (this.generator instanceof postgresql_1.PostgreSQLGenerator) {
            return this.getPostgresAppliedMigrations();
        }
        else {
            return this.getMongoAppliedMigrations();
        }
    }
    async getPostgresPendingMigrations() {
        // This would integrate with PostgreSQL connection
        // Placeholder implementation
        return [];
    }
    async getMongoPendingMigrations() {
        // This would integrate with MongoDB connection
        // Placeholder implementation
        return [];
    }
    async getPostgresAppliedMigrations() {
        // This would integrate with PostgreSQL connection
        // Placeholder implementation
        return [];
    }
    async getMongoAppliedMigrations() {
        // This would integrate with MongoDB connection
        // Placeholder implementation
        return [];
    }
    async runMigration(migration) {
        console.log(`Running migration: ${migration.name}`);
        // Implementation would execute the migration
        // and mark it as applied in the migrations table
    }
    async rollbackSingleMigration(migration) {
        console.log(`Rolling back migration: ${migration.name}`);
        // Implementation would execute the down migration
        // and remove it from the migrations table
    }
    async getMigrationStatus() {
        const applied = await this.getAppliedMigrations();
        const pending = await this.getPendingMigrations();
        return { applied, pending };
    }
    generateMigrationSchema() {
        if (this.generator instanceof postgresql_1.PostgreSQLGenerator) {
            return `
CREATE TABLE IF NOT EXISTS ${this.options.tableName} (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64) NOT NULL,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_migrations_applied ON ${this.options.tableName} (applied);
CREATE INDEX IF NOT EXISTS idx_migrations_timestamp ON ${this.options.tableName} (timestamp);
`;
        }
        else {
            return `
// MongoDB migration collection schema
db.createCollection("${this.options.tableName}", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "name", "timestamp", "checksum", "applied"],
      properties: {
        id: {
          bsonType: "string",
          description: "Migration ID"
        },
        name: {
          bsonType: "string", 
          description: "Migration name"
        },
        timestamp: {
          bsonType: "date",
          description: "Migration timestamp"
        },
        checksum: {
          bsonType: "string",
          description: "Migration checksum"
        },
        applied: {
          bsonType: "bool",
          description: "Whether migration was applied"
        },
        appliedAt: {
          bsonType: ["date", "null"],
          description: "When migration was applied"
        }
      }
    }
  }
});

// Create indexes
db.${this.options.tableName}.createIndex({ "applied": 1 });
db.${this.options.tableName}.createIndex({ "timestamp": 1 });
db.${this.options.tableName}.createIndex({ "id": 1 }, { unique: true });
`;
        }
    }
}
exports.MigrationManager = MigrationManager;
//# sourceMappingURL=migration-manager.js.map