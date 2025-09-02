// Database Template Exports
// This file exports all available database templates for the generator system

export { generateEcommerceSchema } from './ecommerce-template';
export { generateBlogSchema } from './blog-template';
export { generateSaasSchema } from './saas-template';

// Template registry for programmatic access
export const AVAILABLE_TEMPLATES = {
  ecommerce: {
    name: 'E-commerce Platform',
    description: 'Complete schema for online store with products, orders, users, and payments',
    generator: () => import('./ecommerce-template').then(m => m.generateEcommerceSchema()),
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
    generator: () => import('./blog-template').then(m => m.generateBlogSchema()),
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
    generator: () => import('./saas-template').then(m => m.generateSaasSchema()),
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
} as const;

export type TemplateType = keyof typeof AVAILABLE_TEMPLATES;

// Helper function to get template metadata
export function getTemplateInfo(templateName: string) {
  const template = AVAILABLE_TEMPLATES[templateName as TemplateType];
  if (!template) {
    throw new Error(`Template '${templateName}' not found. Available templates: ${Object.keys(AVAILABLE_TEMPLATES).join(', ')}`);
  }
  return template;
}

// Helper function to list all available templates
export function listAvailableTemplates() {
  return Object.entries(AVAILABLE_TEMPLATES).map(([key, template]) => ({
    id: key,
    name: template.name,
    description: template.description,
    tables: template.tables.length,
    features: template.features
  }));
}