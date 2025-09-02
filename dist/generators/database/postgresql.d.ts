import { DatabaseGenerator, SchemaTemplate, DatabaseConfig } from './index';
export declare class PostgreSQLGenerator extends DatabaseGenerator {
    constructor(config: DatabaseConfig);
    generateSchema(template: SchemaTemplate): Promise<string>;
    private generateTable;
    private generateField;
    private mapFieldType;
    private generateConstraint;
    private formatDefaultValue;
    private generateIndexes;
    private generateRelationships;
    private generateStoredProcedure;
    private generateTrigger;
    generateMigration(from: SchemaTemplate, to: SchemaTemplate): Promise<string>;
    generateSeeds(template: SchemaTemplate, data: Record<string, any[]>): Promise<string>;
    generateBackupScript(): Promise<string>;
    generateConnectionPool(): Promise<string>;
    generateQueryBuilder(): Promise<string>;
}
//# sourceMappingURL=postgresql.d.ts.map