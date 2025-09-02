export { generateEcommerceSchema } from './ecommerce-template';
export { generateBlogSchema } from './blog-template';
export { generateSaasSchema } from './saas-template';
export declare const AVAILABLE_TEMPLATES: {
    readonly ecommerce: {
        readonly name: "E-commerce Platform";
        readonly description: "Complete schema for online store with products, orders, users, and payments";
        readonly generator: () => Promise<import("..").SchemaTemplate>;
        readonly tables: readonly ["users", "categories", "products", "orders", "order_items", "carts", "reviews"];
        readonly features: readonly ["User management", "Product catalog", "Shopping cart", "Order processing", "Payment integration", "Reviews and ratings", "Wishlist functionality"];
    };
    readonly blog: {
        readonly name: "Blog Platform";
        readonly description: "Schema for content management with posts, categories, tags, and comments";
        readonly generator: () => Promise<import("..").SchemaTemplate>;
        readonly tables: readonly ["users", "categories", "tags", "posts", "comments", "medias"];
        readonly features: readonly ["Multi-author support", "Category management", "Tag system", "Comment system", "Media management", "SEO optimization", "Content scheduling"];
    };
    readonly saas: {
        readonly name: "SaaS Platform";
        readonly description: "Multi-tenant SaaS application with organizations, subscriptions, and billing";
        readonly generator: () => Promise<import("..").SchemaTemplate>;
        readonly tables: readonly ["organizations", "users", "subscriptions", "invoices", "api_keys", "audit_logs"];
        readonly features: readonly ["Multi-tenancy", "Subscription billing", "API key management", "Webhook system", "Audit logging", "Usage tracking", "Role-based permissions"];
    };
};
export type TemplateType = keyof typeof AVAILABLE_TEMPLATES;
export declare function getTemplateInfo(templateName: string): {
    readonly name: "E-commerce Platform";
    readonly description: "Complete schema for online store with products, orders, users, and payments";
    readonly generator: () => Promise<import("..").SchemaTemplate>;
    readonly tables: readonly ["users", "categories", "products", "orders", "order_items", "carts", "reviews"];
    readonly features: readonly ["User management", "Product catalog", "Shopping cart", "Order processing", "Payment integration", "Reviews and ratings", "Wishlist functionality"];
} | {
    readonly name: "Blog Platform";
    readonly description: "Schema for content management with posts, categories, tags, and comments";
    readonly generator: () => Promise<import("..").SchemaTemplate>;
    readonly tables: readonly ["users", "categories", "tags", "posts", "comments", "medias"];
    readonly features: readonly ["Multi-author support", "Category management", "Tag system", "Comment system", "Media management", "SEO optimization", "Content scheduling"];
} | {
    readonly name: "SaaS Platform";
    readonly description: "Multi-tenant SaaS application with organizations, subscriptions, and billing";
    readonly generator: () => Promise<import("..").SchemaTemplate>;
    readonly tables: readonly ["organizations", "users", "subscriptions", "invoices", "api_keys", "audit_logs"];
    readonly features: readonly ["Multi-tenancy", "Subscription billing", "API key management", "Webhook system", "Audit logging", "Usage tracking", "Role-based permissions"];
};
export declare function listAvailableTemplates(): {
    id: string;
    name: "E-commerce Platform" | "Blog Platform" | "SaaS Platform";
    description: "Complete schema for online store with products, orders, users, and payments" | "Schema for content management with posts, categories, tags, and comments" | "Multi-tenant SaaS application with organizations, subscriptions, and billing";
    tables: 6 | 7;
    features: readonly ["User management", "Product catalog", "Shopping cart", "Order processing", "Payment integration", "Reviews and ratings", "Wishlist functionality"] | readonly ["Multi-author support", "Category management", "Tag system", "Comment system", "Media management", "SEO optimization", "Content scheduling"] | readonly ["Multi-tenancy", "Subscription billing", "API key management", "Webhook system", "Audit logging", "Usage tracking", "Role-based permissions"];
}[];
//# sourceMappingURL=index.d.ts.map