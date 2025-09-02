import { DatabaseGenerator, SchemaTemplate, DatabaseConfig } from './index';
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
export declare class MongoDBGenerator extends DatabaseGenerator {
    constructor(config: DatabaseConfig);
    generateSchema(template: SchemaTemplate): Promise<string>;
    private convertTablesToCollections;
    private generateMongoSchema;
    private generateJsonSchema;
    private getJsonSchemaType;
    private mapFieldType;
    private convertIndexes;
    private generateCollection;
    private generateAggregationPipelines;
    generateMigration(from: SchemaTemplate, to: SchemaTemplate): Promise<string>;
    generateSeeds(template: SchemaTemplate, data: Record<string, any[]>): Promise<string>;
    generateBackupScript(): Promise<string>;
    generateConnectionPool(): Promise<string>;
    generateQueryBuilder(): Promise<string>;
}
//# sourceMappingURL=mongodb.d.ts.map