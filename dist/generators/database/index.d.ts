export interface DatabaseConfig {
    type: 'postgresql' | 'mongodb';
    name: string;
    options?: Record<string, any>;
}
export interface TableConfig {
    name: string;
    fields: FieldConfig[];
    indexes?: IndexConfig[];
    relationships?: RelationshipConfig[];
}
export interface FieldConfig {
    name: string;
    type: string;
    constraints?: ConstraintConfig[];
    default?: any;
    nullable?: boolean;
}
export interface IndexConfig {
    name: string;
    fields: string[];
    unique?: boolean;
    type?: 'btree' | 'hash' | 'gin' | 'gist';
}
export interface RelationshipConfig {
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    table: string;
    foreignKey: string;
    onDelete?: 'cascade' | 'restrict' | 'set null';
    onUpdate?: 'cascade' | 'restrict' | 'set null';
}
export interface ConstraintConfig {
    type: 'primary' | 'foreign' | 'unique' | 'check' | 'not null';
    value?: any;
    references?: {
        table: string;
        field: string;
    };
}
export interface SchemaTemplate {
    name: string;
    description: string;
    tables: TableConfig[];
    procedures?: StoredProcedureConfig[];
    triggers?: TriggerConfig[];
}
export interface StoredProcedureConfig {
    name: string;
    parameters: ParameterConfig[];
    body: string;
    returns?: string;
}
export interface TriggerConfig {
    name: string;
    table: string;
    event: 'before' | 'after';
    action: 'insert' | 'update' | 'delete';
    function: string;
}
export interface ParameterConfig {
    name: string;
    type: string;
    direction?: 'in' | 'out' | 'inout';
}
export declare abstract class DatabaseGenerator {
    protected config: DatabaseConfig;
    constructor(config: DatabaseConfig);
    abstract generateSchema(template: SchemaTemplate): Promise<string>;
    abstract generateMigration(from: SchemaTemplate, to: SchemaTemplate): Promise<string>;
    abstract generateSeeds(template: SchemaTemplate, data: Record<string, any[]>): Promise<string>;
    abstract generateBackupScript(): Promise<string>;
    abstract generateConnectionPool(): Promise<string>;
    abstract generateQueryBuilder(): Promise<string>;
}
//# sourceMappingURL=index.d.ts.map