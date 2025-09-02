"use strict";
// Database Template Exports
// This file exports all available database templates for the generator system
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
exports.AVAILABLE_TEMPLATES = exports.generateSaasSchema = exports.generateBlogSchema = exports.generateEcommerceSchema = void 0;
exports.getTemplateInfo = getTemplateInfo;
exports.listAvailableTemplates = listAvailableTemplates;
var ecommerce_template_1 = require("./ecommerce-template");
Object.defineProperty(exports, "generateEcommerceSchema", { enumerable: true, get: function () { return ecommerce_template_1.generateEcommerceSchema; } });
var blog_template_1 = require("./blog-template");
Object.defineProperty(exports, "generateBlogSchema", { enumerable: true, get: function () { return blog_template_1.generateBlogSchema; } });
var saas_template_1 = require("./saas-template");
Object.defineProperty(exports, "generateSaasSchema", { enumerable: true, get: function () { return saas_template_1.generateSaasSchema; } });
// Template registry for programmatic access
exports.AVAILABLE_TEMPLATES = {
    ecommerce: {
        name: 'E-commerce Platform',
        description: 'Complete schema for online store with products, orders, users, and payments',
        generator: () => Promise.resolve().then(() => __importStar(require('./ecommerce-template'))).then(m => m.generateEcommerceSchema()),
        tables: ['users', 'categories', 'products', 'orders', 'order_items', 'carts', 'reviews'],
        features: [
            'User management',
            'Product catalog',
            'Shopping cart',
            'Order processing',
            'Payment integration',
            'Reviews and ratings',
            'Wishlist functionality'
        ]
    },
    blog: {
        name: 'Blog Platform',
        description: 'Schema for content management with posts, categories, tags, and comments',
        generator: () => Promise.resolve().then(() => __importStar(require('./blog-template'))).then(m => m.generateBlogSchema()),
        tables: ['users', 'categories', 'tags', 'posts', 'comments', 'medias'],
        features: [
            'Multi-author support',
            'Category management',
            'Tag system',
            'Comment system',
            'Media management',
            'SEO optimization',
            'Content scheduling'
        ]
    },
    saas: {
        name: 'SaaS Platform',
        description: 'Multi-tenant SaaS application with organizations, subscriptions, and billing',
        generator: () => Promise.resolve().then(() => __importStar(require('./saas-template'))).then(m => m.generateSaasSchema()),
        tables: ['organizations', 'users', 'subscriptions', 'invoices', 'api_keys', 'audit_logs'],
        features: [
            'Multi-tenancy',
            'Subscription billing',
            'API key management',
            'Webhook system',
            'Audit logging',
            'Usage tracking',
            'Role-based permissions'
        ]
    }
};
// Helper function to get template metadata
function getTemplateInfo(templateName) {
    const template = exports.AVAILABLE_TEMPLATES[templateName];
    if (!template) {
        throw new Error(`Template '${templateName}' not found. Available templates: ${Object.keys(exports.AVAILABLE_TEMPLATES).join(', ')}`);
    }
    return template;
}
// Helper function to list all available templates
function listAvailableTemplates() {
    return Object.entries(exports.AVAILABLE_TEMPLATES).map(([key, template]) => ({
        id: key,
        name: template.name,
        description: template.description,
        tables: template.tables.length,
        features: template.features
    }));
}
//# sourceMappingURL=index.js.map