"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidator = void 0;
class SchemaValidator {
    rules;
    constructor() {
        this.rules = this.initializeDefaultRules();
    }
    initializeDefaultRules() {
        return [
            {
                name: 'required',
                message: 'Field is required',
                validate: (value, field) => {
                    if (!field.nullable && field.default === undefined) {
                        return value !== null && value !== undefined && value !== '';
                    }
                    return true;
                }
            },
            {
                name: 'email',
                message: 'Must be a valid email address',
                validate: (value, field) => {
                    if (field.name.toLowerCase().includes('email') && value) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        return emailRegex.test(value);
                    }
                    return true;
                }
            },
            {
                name: 'url',
                message: 'Must be a valid URL',
                validate: (value, field) => {
                    if (field.name.toLowerCase().includes('url') && value) {
                        try {
                            new URL(value);
                            return true;
                        }
                        catch {
                            return false;
                        }
                    }
                    return true;
                }
            },
            {
                name: 'positive_number',
                message: 'Must be a positive number',
                validate: (value, field) => {
                    if (['integer', 'bigint', 'decimal'].includes(field.type) && value !== null) {
                        return value >= 0;
                    }
                    return true;
                }
            },
            {
                name: 'string_length',
                message: 'String length exceeds maximum allowed',
                validate: (value, field) => {
                    if (field.type === 'string' && value) {
                        return value.length <= 255;
                    }
                    return true;
                }
            }
        ];
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    validateSchema(template) {
        const errors = [];
        const warnings = [];
        // Validate schema structure
        this.validateSchemaStructure(template, errors, warnings);
        // Validate each table
        for (const table of template.tables) {
            this.validateTable(table, errors, warnings);
            // Validate relationships
            if (table.relationships) {
                this.validateRelationships(table, template.tables, errors, warnings);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    validateSchemaStructure(template, errors, warnings) {
        // Check for duplicate table names
        const tableNames = template.tables.map(t => t.name.toLowerCase());
        const duplicates = tableNames.filter((name, index) => tableNames.indexOf(name) !== index);
        for (const duplicate of duplicates) {
            errors.push({
                type: 'error',
                field: '',
                table: duplicate,
                rule: 'duplicate_table',
                message: `Duplicate table name: ${duplicate}`
            });
        }
        // Check for naming conventions
        for (const table of template.tables) {
            if (!/^[a-z][a-z0-9_]*$/.test(table.name)) {
                warnings.push({
                    type: 'warning',
                    table: table.name,
                    rule: 'naming_convention',
                    message: 'Table name should be lowercase with underscores'
                });
            }
        }
    }
    validateTable(table, errors, warnings) {
        // Check for primary key
        const hasPrimaryKey = table.fields.some(field => field.constraints?.some(constraint => constraint.type === 'primary'));
        if (!hasPrimaryKey) {
            warnings.push({
                type: 'warning',
                table: table.name,
                rule: 'no_primary_key',
                message: 'Table should have a primary key'
            });
        }
        // Check for duplicate field names
        const fieldNames = table.fields.map(f => f.name.toLowerCase());
        const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
        for (const duplicate of duplicates) {
            errors.push({
                type: 'error',
                field: duplicate,
                table: table.name,
                rule: 'duplicate_field',
                message: `Duplicate field name: ${duplicate}`
            });
        }
        // Validate each field
        for (const field of table.fields) {
            this.validateField(field, table, errors, warnings);
        }
        // Check for timestamps
        const hasCreatedAt = table.fields.some(f => f.name.toLowerCase().includes('created') && ['date', 'datetime', 'timestamp'].includes(f.type));
        const hasUpdatedAt = table.fields.some(f => f.name.toLowerCase().includes('updated') && ['date', 'datetime', 'timestamp'].includes(f.type));
        if (!hasCreatedAt) {
            warnings.push({
                type: 'warning',
                table: table.name,
                rule: 'no_created_timestamp',
                message: 'Consider adding a created_at timestamp field'
            });
        }
        if (!hasUpdatedAt) {
            warnings.push({
                type: 'warning',
                table: table.name,
                rule: 'no_updated_timestamp',
                message: 'Consider adding an updated_at timestamp field'
            });
        }
    }
    validateField(field, table, errors, warnings) {
        // Check field naming convention
        if (!/^[a-z][a-z0-9_]*$/.test(field.name)) {
            warnings.push({
                type: 'warning',
                field: field.name,
                table: table.name,
                rule: 'field_naming_convention',
                message: 'Field name should be lowercase with underscores'
            });
        }
        // Check for reserved words
        const reservedWords = ['user', 'order', 'group', 'select', 'from', 'where', 'insert', 'update', 'delete'];
        if (reservedWords.includes(field.name.toLowerCase())) {
            warnings.push({
                type: 'warning',
                field: field.name,
                table: table.name,
                rule: 'reserved_word',
                message: `Field name "${field.name}" is a reserved word`
            });
        }
        // Validate field type
        const validTypes = ['string', 'text', 'integer', 'bigint', 'decimal', 'boolean', 'date', 'datetime', 'timestamp', 'json', 'uuid'];
        if (!validTypes.includes(field.type)) {
            errors.push({
                type: 'error',
                field: field.name,
                table: table.name,
                rule: 'invalid_type',
                message: `Invalid field type: ${field.type}`
            });
        }
        // Validate constraints
        if (field.constraints) {
            this.validateConstraints(field, table, errors, warnings);
        }
        // Type-specific validations
        this.validateFieldTypeSpecific(field, table, errors, warnings);
    }
    validateConstraints(field, table, errors, warnings) {
        const constraints = field.constraints;
        // Check for multiple primary keys
        const primaryConstraints = constraints.filter(c => c.type === 'primary');
        if (primaryConstraints.length > 1) {
            errors.push({
                type: 'error',
                field: field.name,
                table: table.name,
                rule: 'multiple_primary_keys',
                message: 'Field cannot have multiple primary key constraints'
            });
        }
        // Validate foreign key references
        const foreignKeyConstraints = constraints.filter(c => c.type === 'foreign');
        for (const constraint of foreignKeyConstraints) {
            if (!constraint.references) {
                errors.push({
                    type: 'error',
                    field: field.name,
                    table: table.name,
                    rule: 'invalid_foreign_key',
                    message: 'Foreign key constraint must specify references'
                });
            }
        }
        // Validate check constraints
        const checkConstraints = constraints.filter(c => c.type === 'check');
        for (const constraint of checkConstraints) {
            if (!constraint.value) {
                errors.push({
                    type: 'error',
                    field: field.name,
                    table: table.name,
                    rule: 'invalid_check_constraint',
                    message: 'Check constraint must specify a value'
                });
            }
        }
    }
    validateFieldTypeSpecific(field, table, errors, warnings) {
        switch (field.type) {
            case 'string':
                // Check if string fields that look like emails have email validation
                if (field.name.toLowerCase().includes('email')) {
                    const hasEmailValidation = field.constraints?.some(c => c.type === 'check' &&
                        c.value?.toString().includes('@'));
                    if (!hasEmailValidation) {
                        warnings.push({
                            type: 'warning',
                            field: field.name,
                            table: table.name,
                            rule: 'email_validation',
                            message: 'Email field should have email validation'
                        });
                    }
                }
                break;
            case 'decimal':
                // Warn about precision and scale
                warnings.push({
                    type: 'warning',
                    field: field.name,
                    table: table.name,
                    rule: 'decimal_precision',
                    message: 'Consider specifying precision and scale for decimal fields'
                });
                break;
            case 'json':
                // Warn about indexing JSON fields
                warnings.push({
                    type: 'warning',
                    field: field.name,
                    table: table.name,
                    rule: 'json_indexing',
                    message: 'JSON fields may need specialized indexing for queries'
                });
                break;
        }
    }
    validateRelationships(table, allTables, errors, warnings) {
        for (const relationship of table.relationships) {
            // Check if referenced table exists
            const referencedTable = allTables.find(t => t.name === relationship.table);
            if (!referencedTable) {
                errors.push({
                    type: 'error',
                    field: relationship.foreignKey,
                    table: table.name,
                    rule: 'invalid_relationship',
                    message: `Referenced table "${relationship.table}" does not exist`
                });
                continue;
            }
            // Check if foreign key field exists
            const foreignKeyField = table.fields.find(f => f.name === relationship.foreignKey);
            if (!foreignKeyField) {
                errors.push({
                    type: 'error',
                    field: relationship.foreignKey,
                    table: table.name,
                    rule: 'missing_foreign_key_field',
                    message: `Foreign key field "${relationship.foreignKey}" does not exist`
                });
            }
            // Check for proper indexing on foreign keys
            const hasIndex = table.indexes?.some(index => index.fields.includes(relationship.foreignKey));
            if (!hasIndex) {
                warnings.push({
                    type: 'warning',
                    field: relationship.foreignKey,
                    table: table.name,
                    rule: 'foreign_key_index',
                    message: 'Foreign key fields should be indexed for performance'
                });
            }
            // Validate cascade options
            if (relationship.onDelete && !['cascade', 'restrict', 'set null'].includes(relationship.onDelete)) {
                errors.push({
                    type: 'error',
                    field: relationship.foreignKey,
                    table: table.name,
                    rule: 'invalid_cascade_option',
                    message: `Invalid onDelete option: ${relationship.onDelete}`
                });
            }
            if (relationship.onUpdate && !['cascade', 'restrict', 'set null'].includes(relationship.onUpdate)) {
                errors.push({
                    type: 'error',
                    field: relationship.foreignKey,
                    table: table.name,
                    rule: 'invalid_cascade_option',
                    message: `Invalid onUpdate option: ${relationship.onUpdate}`
                });
            }
        }
    }
    generateValidationSchema(template, format = 'zod') {
        switch (format) {
            case 'joi':
                return this.generateJoiSchema(template);
            case 'yup':
                return this.generateYupSchema(template);
            case 'zod':
            default:
                return this.generateZodSchema(template);
        }
    }
    generateZodSchema(template) {
        let schema = `// Zod Validation Schemas for ${template.name}\n`;
        schema += `// Generated: ${new Date().toISOString()}\n\n`;
        schema += `import { z } from 'zod';\n\n`;
        for (const table of template.tables) {
            const schemaName = `${this.toPascalCase(table.name)}Schema`;
            schema += `// ${table.name} validation schema\n`;
            schema += `export const ${schemaName} = z.object({\n`;
            for (const field of table.fields) {
                schema += `  ${field.name}: ${this.generateZodFieldValidation(field)},\n`;
            }
            schema += `});\n\n`;
            // Generate create schema (without id and timestamps)
            const createSchemaName = `Create${this.toPascalCase(table.name)}Schema`;
            schema += `export const ${createSchemaName} = ${schemaName}.omit({\n`;
            const omitFields = [];
            if (table.fields.some(f => f.name === 'id'))
                omitFields.push('id');
            if (table.fields.some(f => f.name.includes('created')))
                omitFields.push('createdAt');
            if (table.fields.some(f => f.name.includes('updated')))
                omitFields.push('updatedAt');
            schema += `  ${omitFields.join(': true,\n  ')}: true\n`;
            schema += `});\n\n`;
            // Generate update schema (all fields optional)
            const updateSchemaName = `Update${this.toPascalCase(table.name)}Schema`;
            schema += `export const ${updateSchemaName} = ${createSchemaName}.partial();\n\n`;
            // Generate TypeScript types
            schema += `export type ${this.toPascalCase(table.name)} = z.infer<typeof ${schemaName}>;\n`;
            schema += `export type Create${this.toPascalCase(table.name)} = z.infer<typeof ${createSchemaName}>;\n`;
            schema += `export type Update${this.toPascalCase(table.name)} = z.infer<typeof ${updateSchemaName}>;\n\n`;
        }
        return schema;
    }
    generateZodFieldValidation(field) {
        let validation = '';
        switch (field.type) {
            case 'string':
                validation = 'z.string()';
                if (field.name.toLowerCase().includes('email')) {
                    validation += '.email("Invalid email format")';
                }
                if (field.name.toLowerCase().includes('url')) {
                    validation += '.url("Invalid URL format")';
                }
                validation += '.min(1, "Field is required").max(255, "Maximum 255 characters")';
                break;
            case 'text':
                validation = 'z.string().min(1, "Field is required")';
                break;
            case 'integer':
            case 'bigint':
                validation = 'z.number().int("Must be an integer")';
                if (field.name.toLowerCase().includes('age') || field.name.toLowerCase().includes('count')) {
                    validation += '.min(0, "Must be positive")';
                }
                break;
            case 'decimal':
                validation = 'z.number()';
                if (field.name.toLowerCase().includes('price') || field.name.toLowerCase().includes('amount')) {
                    validation += '.min(0, "Must be positive")';
                }
                break;
            case 'boolean':
                validation = 'z.boolean()';
                break;
            case 'date':
            case 'datetime':
            case 'timestamp':
                validation = 'z.date()';
                break;
            case 'json':
                validation = 'z.record(z.any())';
                break;
            case 'uuid':
                validation = 'z.string().uuid("Invalid UUID format")';
                break;
            default:
                validation = 'z.string()';
        }
        // Make field optional if nullable or has default
        if (field.nullable || field.default !== undefined) {
            validation += '.optional()';
        }
        // Add null handling if nullable
        if (field.nullable) {
            validation += '.nullable()';
        }
        return validation;
    }
    generateJoiSchema(template) {
        let schema = `// Joi Validation Schemas for ${template.name}\n`;
        schema += `// Generated: ${new Date().toISOString()}\n\n`;
        schema += `import Joi from 'joi';\n\n`;
        for (const table of template.tables) {
            const schemaName = `${table.name}Schema`;
            schema += `// ${table.name} validation schema\n`;
            schema += `export const ${schemaName} = Joi.object({\n`;
            for (const field of table.fields) {
                schema += `  ${field.name}: ${this.generateJoiFieldValidation(field)},\n`;
            }
            schema += `});\n\n`;
        }
        return schema;
    }
    generateJoiFieldValidation(field) {
        let validation = '';
        switch (field.type) {
            case 'string':
                validation = 'Joi.string()';
                if (field.name.toLowerCase().includes('email')) {
                    validation += '.email()';
                }
                validation += '.max(255)';
                break;
            case 'text':
                validation = 'Joi.string()';
                break;
            case 'integer':
            case 'bigint':
                validation = 'Joi.number().integer()';
                break;
            case 'decimal':
                validation = 'Joi.number()';
                break;
            case 'boolean':
                validation = 'Joi.boolean()';
                break;
            case 'date':
            case 'datetime':
            case 'timestamp':
                validation = 'Joi.date()';
                break;
            case 'json':
                validation = 'Joi.object()';
                break;
            case 'uuid':
                validation = 'Joi.string().uuid()';
                break;
            default:
                validation = 'Joi.string()';
        }
        if (!field.nullable && field.default === undefined) {
            validation += '.required()';
        }
        else {
            validation += '.optional()';
        }
        return validation;
    }
    generateYupSchema(template) {
        let schema = `// Yup Validation Schemas for ${template.name}\n`;
        schema += `// Generated: ${new Date().toISOString()}\n\n`;
        schema += `import * as yup from 'yup';\n\n`;
        for (const table of template.tables) {
            const schemaName = `${table.name}Schema`;
            schema += `// ${table.name} validation schema\n`;
            schema += `export const ${schemaName} = yup.object({\n`;
            for (const field of table.fields) {
                schema += `  ${field.name}: ${this.generateYupFieldValidation(field)},\n`;
            }
            schema += `});\n\n`;
        }
        return schema;
    }
    generateYupFieldValidation(field) {
        let validation = '';
        switch (field.type) {
            case 'string':
                validation = 'yup.string()';
                if (field.name.toLowerCase().includes('email')) {
                    validation += '.email("Invalid email format")';
                }
                validation += '.max(255, "Maximum 255 characters")';
                break;
            case 'text':
                validation = 'yup.string()';
                break;
            case 'integer':
            case 'bigint':
                validation = 'yup.number().integer("Must be an integer")';
                break;
            case 'decimal':
                validation = 'yup.number()';
                break;
            case 'boolean':
                validation = 'yup.boolean()';
                break;
            case 'date':
            case 'datetime':
            case 'timestamp':
                validation = 'yup.date()';
                break;
            case 'json':
                validation = 'yup.object()';
                break;
            case 'uuid':
                validation = 'yup.string().uuid("Invalid UUID format")';
                break;
            default:
                validation = 'yup.string()';
        }
        if (!field.nullable && field.default === undefined) {
            validation += '.required("Field is required")';
        }
        else {
            validation += '.notRequired()';
        }
        if (field.nullable) {
            validation += '.nullable()';
        }
        return validation;
    }
    toPascalCase(str) {
        return str.replace(/(^|_)(.)/g, (_, __, char) => char.toUpperCase());
    }
}
exports.SchemaValidator = SchemaValidator;
//# sourceMappingURL=schema-validator.js.map