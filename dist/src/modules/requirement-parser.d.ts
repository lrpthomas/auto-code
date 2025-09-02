import { AppRequirements } from '../types';
export declare class RequirementParser {
    private tokenizer;
    private stemmer;
    private techStackKeywords;
    private featurePatterns;
    constructor();
    initialize(): Promise<void>;
    private initializeTechStackKeywords;
    private initializeFeaturePatterns;
    parse(description: string): Promise<AppRequirements>;
    private generateId;
    private detectTechStack;
    private needsFrontend;
    private needsBackend;
    private needsDatabase;
    private detectFeatures;
    private determineAppType;
    private calculatePriority;
    private estimateTimeline;
    analyze(text: string): Promise<{
        sentiment: number;
        entities: string[];
        intent: string;
        confidence: number;
    }>;
    private extractEntities;
    private determineIntent;
}
//# sourceMappingURL=requirement-parser.d.ts.map