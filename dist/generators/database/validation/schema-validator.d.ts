import { SchemaTemplate, FieldConfig } from '../index';
export interface ValidationRule {
    name: string;
    message: string;
    validate: (value: any, field: FieldConfig) => boolean;
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export interface ValidationError {
    type: 'error';
    field: string;
    table: string;
    rule: string;
    message: string;
}
export interface ValidationWarning {
    type: 'warning';
    field?: string;
    table: string;
    rule: string;
    message: string;
}
export declare class SchemaValidator {
    private rules;
    constructor();
    private initializeDefaultRules;
    addRule(rule: ValidationRule): void;
    validateSchema(template: SchemaTemplate): ValidationResult;
    private validateSchemaStructure;
    private validateTable;
    private validateField;
    private validateConstraints;
    private validateFieldTypeSpecific;
    private validateRelationships;
    generateValidationSchema(template: SchemaTemplate, format?: 'joi' | 'yup' | 'zod'): string;
    private generateZodSchema;
    private generateZodFieldValidation;
    private generateJoiSchema;
    private generateJoiFieldValidation;
    private generateYupSchema;
    private generateYupFieldValidation;
    private toPascalCase;
}
//# sourceMappingURL=schema-validator.d.ts.map