import { SchemaTemplate } from '../index';
export interface SequelizeConfig {
    dialect: 'postgres' | 'mysql' | 'mariadb' | 'sqlite';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    logging?: boolean;
    pool?: {
        max: number;
        min: number;
        acquire: number;
        idle: number;
    };
}
export declare class SequelizeAdapter {
    private config;
    constructor(config: SequelizeConfig);
    generateModels(template: SchemaTemplate): string;
    private generateSequelizeInstance;
    private generateModelInterface;
    private generateModelClass;
    private generateAssociations;
    private generateSyncFunction;
    private mapFieldToSequelize;
    private mapFieldToTypeScript;
    private formatDefaultValue;
    private toPascalCase;
    generateRepositoryPattern(template: SchemaTemplate): string;
    generateServiceLayer(template: SchemaTemplate): string;
}
//# sourceMappingURL=sequelize-adapter.d.ts.map