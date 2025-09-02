"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceOptimizer = void 0;
class PerformanceOptimizer {
    template;
    constructor(template) {
        this.template = template;
    }
    analyzePerformance() {
        const suggestions = [];
        // Analyze each table
        for (const table of this.template.tables) {
            suggestions.push(...this.analyzeTablePerformance(table));
        }
        // Analyze relationships
        suggestions.push(...this.analyzeRelationshipPerformance());
        // Calculate overall score
        const score = this.calculatePerformanceScore(suggestions);
        return {
            score,
            suggestions,
            indexAnalysis: this.analyzeIndexes(),
            queryPatterns: this.identifyQueryPatterns()
        };
    }
    analyzeTablePerformance(table) {
        const suggestions = [];
        // Check for missing primary key
        const hasPrimaryKey = table.fields.some(field => field.constraints?.some(constraint => constraint.type === 'primary'));
        if (!hasPrimaryKey) {
            suggestions.push({
                type: 'constraint',
                priority: 'high',
                table: table.name,
                description: 'Add primary key to table',
                impact: 'Improves query performance and data integrity',
                implementation: 'Add an AUTO_INCREMENT id field as primary key'
            });
        }
        // Check for missing indexes on foreign keys
        if (table.relationships) {
            for (const rel of table.relationships) {
                const hasIndex = table.indexes?.some(index => index.fields.includes(rel.foreignKey));
                if (!hasIndex) {
                    suggestions.push({
                        type: 'index',
                        priority: 'high',
                        table: table.name,
                        field: rel.foreignKey,
                        description: `Add index on foreign key ${rel.foreignKey}`,
                        impact: 'Significantly improves JOIN performance',
                        implementation: `CREATE INDEX idx_${table.name}_${rel.foreignKey} ON ${table.name}(${rel.foreignKey})`
                    });
                }
            }
        }
        // Check for email fields without unique constraint
        for (const field of table.fields) {
            if (field.name.toLowerCase().includes('email')) {
                const isUnique = field.constraints?.some(c => c.type === 'unique') ||
                    table.indexes?.some(i => i.unique && i.fields.includes(field.name));
                if (!isUnique) {
                    suggestions.push({
                        type: 'constraint',
                        priority: 'medium',
                        table: table.name,
                        field: field.name,
                        description: `Add unique constraint to email field ${field.name}`,
                        impact: 'Prevents duplicate emails and enables faster lookups',
                        implementation: `ALTER TABLE ${table.name} ADD UNIQUE INDEX idx_unique_${field.name} (${field.name})`
                    });
                }
            }
        }
        // Check for text search fields
        suggestions.push(...this.analyzeTextSearchOptimization(table));
        // Check for date range queries
        suggestions.push(...this.analyzeDateRangeOptimization(table));
        // Check for composite indexes
        suggestions.push(...this.analyzeCompositeIndexes(table));
        return suggestions;
    }
    analyzeTextSearchOptimization(table) {
        const suggestions = [];
        const textFields = table.fields.filter(f => ['string', 'text'].includes(f.type) &&
            ['title', 'name', 'description', 'content'].some(keyword => f.name.toLowerCase().includes(keyword)));
        if (textFields.length > 0) {
            suggestions.push({
                type: 'index',
                priority: 'medium',
                table: table.name,
                field: textFields[0].name,
                description: `Consider full-text search index for ${textFields[0].name}`,
                impact: 'Enables efficient text search queries',
                implementation: `CREATE FULLTEXT INDEX idx_ft_${table.name}_${textFields[0].name} ON ${table.name}(${textFields[0].name})`
            });
        }
        return suggestions;
    }
    analyzeDateRangeOptimization(table) {
        const suggestions = [];
        const dateFields = table.fields.filter(f => ['date', 'datetime', 'timestamp'].includes(f.type));
        for (const dateField of dateFields) {
            const hasIndex = table.indexes?.some(index => index.fields.includes(dateField.name));
            if (!hasIndex && dateField.name.toLowerCase().includes('created')) {
                suggestions.push({
                    type: 'index',
                    priority: 'medium',
                    table: table.name,
                    field: dateField.name,
                    description: `Add index on ${dateField.name} for date range queries`,
                    impact: 'Improves performance of date-based filtering and sorting',
                    implementation: `CREATE INDEX idx_${table.name}_${dateField.name} ON ${table.name}(${dateField.name})`
                });
            }
        }
        return suggestions;
    }
    analyzeCompositeIndexes(table) {
        const suggestions = [];
        // Suggest composite indexes for common query patterns
        const statusField = table.fields.find(f => f.name.toLowerCase().includes('status'));
        const createdField = table.fields.find(f => f.name.toLowerCase().includes('created'));
        if (statusField && createdField) {
            const hasCompositeIndex = table.indexes?.some(index => index.fields.includes(statusField.name) && index.fields.includes(createdField.name));
            if (!hasCompositeIndex) {
                suggestions.push({
                    type: 'index',
                    priority: 'medium',
                    table: table.name,
                    field: `${statusField.name}, ${createdField.name}`,
                    description: `Add composite index on (${statusField.name}, ${createdField.name})`,
                    impact: 'Optimizes queries filtering by status and ordering by created date',
                    implementation: `CREATE INDEX idx_${table.name}_status_created ON ${table.name}(${statusField.name}, ${createdField.name})`
                });
            }
        }
        return suggestions;
    }
    analyzeRelationshipPerformance() {
        const suggestions = [];
        // Check for N+1 query problems
        for (const table of this.template.tables) {
            if (table.relationships && table.relationships.length > 2) {
                suggestions.push({
                    type: 'denormalization',
                    priority: 'low',
                    table: table.name,
                    description: `Consider denormalizing frequently accessed data from ${table.name}`,
                    impact: 'Reduces number of JOINs for read-heavy operations',
                    implementation: 'Add commonly queried fields from related tables as computed columns'
                });
            }
        }
        return suggestions;
    }
    analyzeIndexes() {
        const missing = [];
        const redundant = [];
        const composite = [];
        const covering = [];
        for (const table of this.template.tables) {
            const indexes = table.indexes || [];
            // Find missing indexes on foreign keys
            if (table.relationships) {
                for (const rel of table.relationships) {
                    const hasIndex = indexes.some(index => index.fields.includes(rel.foreignKey));
                    if (!hasIndex) {
                        missing.push(`${table.name}.${rel.foreignKey}`);
                    }
                }
            }
            // Find composite indexes
            for (const index of indexes) {
                if (index.fields.length > 1) {
                    composite.push(`${table.name}.(${index.fields.join(', ')})`);
                }
            }
            // Check for redundant indexes
            for (let i = 0; i < indexes.length; i++) {
                for (let j = i + 1; j < indexes.length; j++) {
                    const index1 = indexes[i];
                    const index2 = indexes[j];
                    // If one index is a prefix of another
                    if (index1.fields.length < index2.fields.length) {
                        const isPrefix = index1.fields.every((field, idx) => index2.fields[idx] === field);
                        if (isPrefix) {
                            redundant.push(`${table.name}.${index1.name} (covered by ${index2.name})`);
                        }
                    }
                }
            }
        }
        return { missing, redundant, composite, covering };
    }
    identifyQueryPatterns() {
        const patterns = [];
        for (const table of this.template.tables) {
            // Common SELECT patterns
            patterns.push({
                type: 'select',
                frequency: 'high',
                table: table.name,
                fields: ['id'],
                description: `Primary key lookup on ${table.name}`
            });
            // Status-based queries
            const statusField = table.fields.find(f => f.name.toLowerCase().includes('status'));
            if (statusField) {
                patterns.push({
                    type: 'select',
                    frequency: 'high',
                    table: table.name,
                    fields: [statusField.name],
                    description: `Filter by ${statusField.name} on ${table.name}`
                });
            }
            // Date range queries
            const createdField = table.fields.find(f => f.name.toLowerCase().includes('created'));
            if (createdField) {
                patterns.push({
                    type: 'select',
                    frequency: 'medium',
                    table: table.name,
                    fields: [createdField.name],
                    description: `Date range queries on ${table.name}`
                });
            }
            // JOIN queries
            if (table.relationships) {
                for (const rel of table.relationships) {
                    patterns.push({
                        type: 'select',
                        frequency: 'medium',
                        table: table.name,
                        fields: [rel.foreignKey],
                        description: `JOIN with ${rel.table} via ${rel.foreignKey}`
                    });
                }
            }
        }
        return patterns;
    }
    calculatePerformanceScore(suggestions) {
        let score = 100;
        for (const suggestion of suggestions) {
            switch (suggestion.priority) {
                case 'high':
                    score -= 15;
                    break;
                case 'medium':
                    score -= 8;
                    break;
                case 'low':
                    score -= 3;
                    break;
            }
        }
        return Math.max(0, score);
    }
    generateOptimizedSchema() {
        const optimizedTemplate = JSON.parse(JSON.stringify(this.template));
        const analysis = this.analyzePerformance();
        // Apply high-priority optimizations automatically
        for (const suggestion of analysis.suggestions) {
            if (suggestion.priority === 'high' && suggestion.type === 'index') {
                this.applyIndexOptimization(optimizedTemplate, suggestion);
            }
        }
        return optimizedTemplate;
    }
    applyIndexOptimization(template, suggestion) {
        const table = template.tables.find(t => t.name === suggestion.table);
        if (!table || !suggestion.field)
            return;
        if (!table.indexes) {
            table.indexes = [];
        }
        // Add the suggested index
        const indexName = `idx_${suggestion.table}_${suggestion.field.replace(', ', '_')}`;
        const fields = suggestion.field.split(', ').map(f => f.trim());
        table.indexes.push({
            name: indexName,
            fields,
            unique: false,
            type: 'btree'
        });
    }
    generatePerformanceReport() {
        const analysis = this.analyzePerformance();
        let report = `# Database Performance Analysis Report\n`;
        report += `Generated: ${new Date().toISOString()}\n`;
        report += `Schema: ${this.template.name}\n\n`;
        report += `## Performance Score: ${analysis.score}/100\n\n`;
        if (analysis.score >= 90) {
            report += `✅ **Excellent** - Your schema is well-optimized!\n\n`;
        }
        else if (analysis.score >= 70) {
            report += `⚠️  **Good** - Minor optimizations recommended\n\n`;
        }
        else if (analysis.score >= 50) {
            report += `⚠️  **Moderate** - Several optimizations needed\n\n`;
        }
        else {
            report += `❌ **Poor** - Significant optimizations required\n\n`;
        }
        report += `## Optimization Suggestions\n\n`;
        // Group suggestions by priority
        const highPriority = analysis.suggestions.filter(s => s.priority === 'high');
        const mediumPriority = analysis.suggestions.filter(s => s.priority === 'medium');
        const lowPriority = analysis.suggestions.filter(s => s.priority === 'low');
        if (highPriority.length > 0) {
            report += `### 🔴 High Priority (${highPriority.length})\n\n`;
            for (const suggestion of highPriority) {
                report += this.formatSuggestion(suggestion);
            }
        }
        if (mediumPriority.length > 0) {
            report += `### 🟡 Medium Priority (${mediumPriority.length})\n\n`;
            for (const suggestion of mediumPriority) {
                report += this.formatSuggestion(suggestion);
            }
        }
        if (lowPriority.length > 0) {
            report += `### 🟢 Low Priority (${lowPriority.length})\n\n`;
            for (const suggestion of lowPriority) {
                report += this.formatSuggestion(suggestion);
            }
        }
        report += `## Index Analysis\n\n`;
        if (analysis.indexAnalysis.missing.length > 0) {
            report += `### Missing Indexes\n`;
            for (const missing of analysis.indexAnalysis.missing) {
                report += `- ${missing}\n`;
            }
            report += `\n`;
        }
        if (analysis.indexAnalysis.redundant.length > 0) {
            report += `### Redundant Indexes\n`;
            for (const redundant of analysis.indexAnalysis.redundant) {
                report += `- ${redundant}\n`;
            }
            report += `\n`;
        }
        if (analysis.indexAnalysis.composite.length > 0) {
            report += `### Composite Indexes\n`;
            for (const composite of analysis.indexAnalysis.composite) {
                report += `- ${composite}\n`;
            }
            report += `\n`;
        }
        report += `## Common Query Patterns\n\n`;
        for (const pattern of analysis.queryPatterns) {
            report += `- **${pattern.type.toUpperCase()}** on ${pattern.table} (${pattern.frequency} frequency): ${pattern.description}\n`;
        }
        return report;
    }
    formatSuggestion(suggestion) {
        let formatted = `#### ${suggestion.table}`;
        if (suggestion.field) {
            formatted += `.${suggestion.field}`;
        }
        formatted += `\n`;
        formatted += `**Type:** ${suggestion.type}\n`;
        formatted += `**Description:** ${suggestion.description}\n`;
        formatted += `**Impact:** ${suggestion.impact}\n`;
        formatted += `**Implementation:**\n\`\`\`sql\n${suggestion.implementation}\n\`\`\`\n\n`;
        return formatted;
    }
}
exports.PerformanceOptimizer = PerformanceOptimizer;
//# sourceMappingURL=performance-optimizer.js.map