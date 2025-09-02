import { DatabaseGenerator, SchemaTemplate } from '../index';
export interface MigrationRecord {
    id: string;
    name: string;
    timestamp: Date;
    up: string;
    down: string;
    applied: boolean;
    checksum: string;
}
export interface MigrationOptions {
    directory?: string;
    tableName?: string;
    lockTimeout?: number;
}
export declare class MigrationManager {
    private generator;
    private options;
    constructor(generator: DatabaseGenerator, options?: MigrationOptions);
    createMigration(name: string, from: SchemaTemplate, to: SchemaTemplate): Promise<string>;
    private generateMigrationFile;
    private generateDownMigration;
    private generateTimestamp;
    private slugify;
    runMigrations(): Promise<void>;
    rollbackMigration(steps?: number): Promise<void>;
    private getPendingMigrations;
    private getAppliedMigrations;
    private getPostgresPendingMigrations;
    private getMongoPendingMigrations;
    private getPostgresAppliedMigrations;
    private getMongoAppliedMigrations;
    private runMigration;
    private rollbackSingleMigration;
    getMigrationStatus(): Promise<{
        applied: MigrationRecord[];
        pending: MigrationRecord[];
    }>;
    generateMigrationSchema(): string;
}
//# sourceMappingURL=migration-manager.d.ts.map