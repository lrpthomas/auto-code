import { SchemaTemplate } from '../index';
export interface OptimizationSuggestion {
    type: 'index' | 'constraint' | 'normalization' | 'denormalization' | 'partitioning';
    priority: 'high' | 'medium' | 'low';
    table: string;
    field?: string;
    description: string;
    impact: string;
    implementation: string;
}
export interface PerformanceAnalysis {
    score: number;
    suggestions: OptimizationSuggestion[];
    indexAnalysis: IndexAnalysis;
    queryPatterns: QueryPattern[];
}
export interface IndexAnalysis {
    missing: string[];
    redundant: string[];
    composite: string[];
    covering: string[];
}
export interface QueryPattern {
    type: 'select' | 'insert' | 'update' | 'delete';
    frequency: 'high' | 'medium' | 'low';
    table: string;
    fields: string[];
    description: string;
}
export declare class PerformanceOptimizer {
    private template;
    constructor(template: SchemaTemplate);
    analyzePerformance(): PerformanceAnalysis;
    private analyzeTablePerformance;
    private analyzeTextSearchOptimization;
    private analyzeDateRangeOptimization;
    private analyzeCompositeIndexes;
    private analyzeRelationshipPerformance;
    private analyzeIndexes;
    private identifyQueryPatterns;
    private calculatePerformanceScore;
    generateOptimizedSchema(): SchemaTemplate;
    private applyIndexOptimization;
    generatePerformanceReport(): string;
    private formatSuggestion;
}
//# sourceMappingURL=performance-optimizer.d.ts.map