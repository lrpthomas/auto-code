import { SchemaTemplate } from '../index';
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
export declare class MongooseAdapter {
    private config;
    constructor(config: MongooseConfig);
    generateModels(template: SchemaTemplate): string;
    private generateInterface;
    private generateSchema;
    private generateModel;
    private generateConnection;
    private generateFieldValidation;
    private mapFieldToMongoose;
    private mapFieldToTypeScript;
    private formatDefaultValue;
    private toPascalCase;
    generateRepositoryPattern(template: SchemaTemplate): string;
    generateServiceLayer(template: SchemaTemplate): string;
}
//# sourceMappingURL=mongoose-adapter.d.ts.map