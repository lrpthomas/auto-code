"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementParser = void 0;
const natural = __importStar(require("natural"));
class RequirementParser {
    tokenizer;
    stemmer;
    techStackKeywords;
    featurePatterns;
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.initializeTechStackKeywords();
        this.initializeFeaturePatterns();
    }
    async initialize() {
        // Initialize NLP models and patterns
    }
    initializeTechStackKeywords() {
        this.techStackKeywords = new Map([
            // Frontend
            ['react', { type: 'frontend', value: 'react' }],
            ['vue', { type: 'frontend', value: 'vue' }],
            ['angular', { type: 'frontend', value: 'angular' }],
            ['svelte', { type: 'frontend', value: 'svelte' }],
            ['next.js', { type: 'frontend', value: 'react' }],
            ['nuxt', { type: 'frontend', value: 'vue' }],
            // Backend
            ['node', { type: 'backend', value: 'nodejs' }],
            ['nodejs', { type: 'backend', value: 'nodejs' }],
            ['express', { type: 'backend', value: 'nodejs' }],
            ['python', { type: 'backend', value: 'python' }],
            ['django', { type: 'backend', value: 'python' }],
            ['flask', { type: 'backend', value: 'python' }],
            ['golang', { type: 'backend', value: 'golang' }],
            ['go', { type: 'backend', value: 'golang' }],
            ['java', { type: 'backend', value: 'java' }],
            ['spring', { type: 'backend', value: 'java' }],
            // Database
            ['postgres', { type: 'database', value: 'postgresql' }],
            ['postgresql', { type: 'database', value: 'postgresql' }],
            ['mongo', { type: 'database', value: 'mongodb' }],
            ['mongodb', { type: 'database', value: 'mongodb' }],
            ['sqlite', { type: 'database', value: 'sqlite' }],
            ['mysql', { type: 'database', value: 'mysql' }],
            // Deployment
            ['docker', { type: 'deployment', value: 'docker' }],
            ['kubernetes', { type: 'deployment', value: 'kubernetes' }],
            ['k8s', { type: 'deployment', value: 'kubernetes' }],
            ['vercel', { type: 'deployment', value: 'vercel' }],
            ['aws', { type: 'deployment', value: 'aws' }],
        ]);
    }
    initializeFeaturePatterns() {
        this.featurePatterns = new Map([
            [/user\s+(authentication|auth|login|signup|registration)/i, {
                    name: 'User Authentication',
                    complexity: 'medium',
                    category: 'security'
                }],
            [/real[-\s]?time\s+(chat|messaging|notification)/i, {
                    name: 'Real-time Communication',
                    complexity: 'high',
                    category: 'communication'
                }],
            [/payment\s+(processing|gateway|stripe|paypal)/i, {
                    name: 'Payment Processing',
                    complexity: 'high',
                    category: 'commerce'
                }],
            [/file\s+(upload|storage|management)/i, {
                    name: 'File Management',
                    complexity: 'medium',
                    category: 'storage'
                }],
            [/search\s+(functionality|feature|engine)/i, {
                    name: 'Search Functionality',
                    complexity: 'medium',
                    category: 'search'
                }],
            [/admin\s+(panel|dashboard|interface)/i, {
                    name: 'Admin Dashboard',
                    complexity: 'medium',
                    category: 'admin'
                }],
            [/api\s+(rest|graphql|endpoint)/i, {
                    name: 'API Layer',
                    complexity: 'medium',
                    category: 'api'
                }],
            [/database\s+(crud|operations|management)/i, {
                    name: 'Database Operations',
                    complexity: 'low',
                    category: 'data'
                }],
            [/responsive\s+(design|ui|interface)/i, {
                    name: 'Responsive Design',
                    complexity: 'low',
                    category: 'ui'
                }],
            [/email\s+(notification|sending|system)/i, {
                    name: 'Email System',
                    complexity: 'medium',
                    category: 'communication'
                }],
        ]);
    }
    async parse(description) {
        const id = this.generateId();
        const tokens = this.tokenizer.tokenize(description.toLowerCase()) || [];
        // Detect tech stack
        const techStack = this.detectTechStack(description.toLowerCase());
        // Detect features
        const features = this.detectFeatures(description);
        // Determine app type
        const appType = this.determineAppType(description, features);
        // Calculate priority and timeline
        const priority = this.calculatePriority(features);
        const timeline = this.estimateTimeline(features, appType);
        return {
            id,
            description: description.trim(),
            appType,
            features: features.map(f => f.name),
            techStack,
            timeline,
            priority
        };
    }
    generateId() {
        return `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    detectTechStack(description) {
        const techStack = {};
        for (const [keyword, config] of this.techStackKeywords) {
            if (description.includes(keyword)) {
                techStack[config.type] = config.value;
            }
        }
        // Apply defaults if not specified
        if (this.needsFrontend(description) && !techStack.frontend) {
            techStack.frontend = 'react'; // Default to React
        }
        if (this.needsBackend(description) && !techStack.backend) {
            techStack.backend = 'nodejs'; // Default to Node.js
        }
        if (this.needsDatabase(description) && !techStack.database) {
            techStack.database = 'postgresql'; // Default to PostgreSQL
        }
        if (!techStack.deployment) {
            techStack.deployment = 'docker'; // Default to Docker
        }
        return techStack;
    }
    needsFrontend(description) {
        const frontendKeywords = ['web app', 'website', 'ui', 'interface', 'dashboard', 'frontend', 'client'];
        return frontendKeywords.some(keyword => description.includes(keyword));
    }
    needsBackend(description) {
        const backendKeywords = ['api', 'server', 'backend', 'database', 'auth', 'service'];
        return backendKeywords.some(keyword => description.includes(keyword));
    }
    needsDatabase(description) {
        const databaseKeywords = ['store', 'save', 'database', 'data', 'persist', 'user', 'record'];
        return databaseKeywords.some(keyword => description.includes(keyword));
    }
    detectFeatures(description) {
        const features = [];
        for (const [pattern, feature] of this.featurePatterns) {
            if (pattern.test(description)) {
                features.push(feature);
            }
        }
        // Add basic features if none detected
        if (features.length === 0) {
            features.push({
                name: 'Basic Application Structure',
                complexity: 'low',
                category: 'core'
            });
        }
        return features;
    }
    determineAppType(description, features) {
        if (description.includes('mobile') || description.includes('ios') || description.includes('android')) {
            return 'mobile';
        }
        if (description.includes('api') || description.includes('service') ||
            features.some(f => f.category === 'api')) {
            return 'api';
        }
        if (features.some(f => f.category === 'ui' || f.category === 'frontend') &&
            features.some(f => f.category === 'api' || f.category === 'data')) {
            return 'fullstack';
        }
        return 'web';
    }
    calculatePriority(features) {
        const complexityScore = features.reduce((score, feature) => {
            switch (feature.complexity) {
                case 'high': return score + 3;
                case 'medium': return score + 2;
                case 'low': return score + 1;
                default: return score;
            }
        }, 0);
        if (complexityScore >= 10)
            return 'critical';
        if (complexityScore >= 6)
            return 'high';
        if (complexityScore >= 3)
            return 'medium';
        return 'low';
    }
    estimateTimeline(features, appType) {
        let baseTime = 120; // 2 minutes base
        // Add time based on app type
        switch (appType) {
            case 'fullstack':
                baseTime += 180;
                break;
            case 'api':
                baseTime += 60;
                break;
            case 'mobile':
                baseTime += 240;
                break;
            case 'web':
                baseTime += 120;
                break;
        }
        // Add time based on features
        const featureTime = features.reduce((time, feature) => {
            switch (feature.complexity) {
                case 'high': return time + 90;
                case 'medium': return time + 45;
                case 'low': return time + 20;
                default: return time;
            }
        }, 0);
        return Math.min(baseTime + featureTime, 300); // Cap at 5 minutes
    }
    async analyze(text) {
        // Basic sentiment analysis
        const sentiment = natural.SentimentAnalyzer.getSentiment(this.tokenizer.tokenize(text) || []);
        // Extract entities (simplified)
        const entities = this.extractEntities(text);
        // Determine intent
        const intent = this.determineIntent(text);
        return {
            sentiment: sentiment || 0,
            entities,
            intent,
            confidence: 0.8 // Simplified confidence score
        };
    }
    extractEntities(text) {
        const entities = [];
        // Extract tech stack entities
        for (const [keyword] of this.techStackKeywords) {
            if (text.toLowerCase().includes(keyword)) {
                entities.push(keyword);
            }
        }
        return entities;
    }
    determineIntent(text) {
        if (text.includes('build') || text.includes('create') || text.includes('make')) {
            return 'create_app';
        }
        if (text.includes('modify') || text.includes('update') || text.includes('change')) {
            return 'modify_app';
        }
        if (text.includes('deploy') || text.includes('launch') || text.includes('publish')) {
            return 'deploy_app';
        }
        return 'create_app'; // Default intent
    }
}
exports.RequirementParser = RequirementParser;
//# sourceMappingURL=requirement-parser.js.map