import { SchemaTemplate } from '../index';
export interface PrismaConfig {
    provider: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
    url: string;
    directUrl?: string;
    shadowDatabaseUrl?: string;
}
export declare class PrismaAdapter {
    private config;
    constructor(config: PrismaConfig);
    generateSchema(template: SchemaTemplate): string;
    private generateModel;
    private generateField;
    private generateRelationship;
    private generateIndex;
    private mapFieldToPrisma;
    private formatDefaultValue;
    private toPascalCase;
    generateClientCode(template: SchemaTemplate): string;
    generateRepositoryPattern(template: SchemaTemplate): string;
    generateMigrationScript(): string;
    generateSeedFile(template: SchemaTemplate): string;
    private generateSeedValue;
}
//# sourceMappingURL=prisma-adapter.d.ts.map