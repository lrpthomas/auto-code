"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSaasSchema = generateSaasSchema;
function generateSaasSchema() {
    const organizationsTable = {
        name: 'organizations',
        fields: [
            {
                name: 'id',
                type: 'integer',
                constraints: [{ type: 'primary' }],
                nullable: false
            },
            {
                name: 'name',
                type: 'string',
                nullable: false
            },
            {
                name: 'slug',
                type: 'string',
                constraints: [{ type: 'unique' }],
                nullable: false
            },
            {
                name: 'domain',
                type: 'string',
                nullable: true
            },
            {
                name: 'logo_url',
                type: 'string',
                nullable: true
            },
            {
                name: 'settings',
                type: 'json',
                nullable: true
            },
            {
                name: 'billing_email',
                type: 'string',
                nullable: false
            },
            {
                name: 'subscription_status',
                type: 'string',
                default: 'trial',
                nullable: false
            },
            {
                name: 'trial_ends_at',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'is_active',
                type: 'boolean',
                default: true,
                nullable: false
            },
            {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            },
            {
                name: 'updated_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            }
        ],
        indexes: [
            {
                name: 'idx_organizations_slug',
                fields: ['slug'],
                unique: true
            },
            {
                name: 'idx_organizations_domain',
                fields: ['domain'],
                unique: true
            },
            {
                name: 'idx_organizations_subscription',
                fields: ['subscription_status']
            }
        ]
    };
    const usersTable = {
        name: 'users',
        fields: [
            {
                name: 'id',
                type: 'integer',
                constraints: [{ type: 'primary' }],
                nullable: false
            },
            {
                name: 'email',
                type: 'string',
                constraints: [{ type: 'unique' }],
                nullable: false
            },
            {
                name: 'password_hash',
                type: 'string',
                nullable: true
            },
            {
                name: 'first_name',
                type: 'string',
                nullable: false
            },
            {
                name: 'last_name',
                type: 'string',
                nullable: false
            },
            {
                name: 'avatar_url',
                type: 'string',
                nullable: true
            },
            {
                name: 'timezone',
                type: 'string',
                default: 'UTC',
                nullable: false
            },
            {
                name: 'locale',
                type: 'string',
                default: 'en',
                nullable: false
            },
            {
                name: 'is_active',
                type: 'boolean',
                default: true,
                nullable: false
            },
            {
                name: 'email_verified',
                type: 'boolean',
                default: false,
                nullable: false
            },
            {
                name: 'two_factor_enabled',
                type: 'boolean',
                default: false,
                nullable: false
            },
            {
                name: 'two_factor_secret',
                type: 'string',
                nullable: true
            },
            {
                name: 'last_login_at',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            },
            {
                name: 'updated_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            }
        ],
        indexes: [
            {
                name: 'idx_users_email',
                fields: ['email'],
                unique: true
            },
            {
                name: 'idx_users_active',
                fields: ['is_active']
            }
        ]
    };
    const organizationUsersTable = {
        name: 'organization_users',
        fields: [
            {
                name: 'id',
                type: 'integer',
                constraints: [{ type: 'primary' }],
                nullable: false
            },
            {
                name: 'organization_id',
                type: 'integer',
                nullable: false
            },
            {
                name: 'user_id',
                type: 'integer',
                nullable: false
            },
            {
                name: 'role',
                type: 'string',
                default: 'member',
                nullable: false
            },
            {
                name: 'permissions',
                type: 'json',
                nullable: true
            },
            {
                name: 'invited_by',
                type: 'integer',
                nullable: true
            },
            {
                name: 'invited_at',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'joined_at',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'is_active',
                type: 'boolean',
                default: true,
                nullable: false
            },
            {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            }
        ],
        indexes: [
            {
                name: 'idx_org_users_org_id',
                fields: ['organization_id']
            },
            {
                name: 'idx_org_users_user_id',
                fields: ['user_id']
            },
            {
                name: 'idx_org_users_unique',
                fields: ['organization_id', 'user_id'],
                unique: true
            },
            {
                name: 'idx_org_users_role',
                fields: ['organization_id', 'role']
            }
        ],
        relationships: [
            {
                type: 'many-to-one',
                table: 'organizations',
                foreignKey: 'organization_id',
                onDelete: 'cascade'
            },
            {
                type: 'many-to-one',
                table: 'users',
                foreignKey: 'user_id',
                onDelete: 'cascade'
            }
        ]
    };
    const subscriptionsTable = {
        name: 'subscriptions',
        fields: [
            {
                name: 'id',
                type: 'integer',
                constraints: [{ type: 'primary' }],
                nullable: false
            },
            {
                name: 'organization_id',
                type: 'integer',
                nullable: false
            },
            {
                name: 'plan_id',
                type: 'string',
                nullable: false
            },
            {
                name: 'stripe_subscription_id',
                type: 'string',
                nullable: true
            },
            {
                name: 'status',
                type: 'string',
                nullable: false
            },
            {
                name: 'current_period_start',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'current_period_end',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'canceled_at',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'trial_start',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'trial_end',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'metadata',
                type: 'json',
                nullable: true
            },
            {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            },
            {
                name: 'updated_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            }
        ],
        indexes: [
            {
                name: 'idx_subscriptions_org_id',
                fields: ['organization_id']
            },
            {
                name: 'idx_subscriptions_stripe_id',
                fields: ['stripe_subscription_id'],
                unique: true
            },
            {
                name: 'idx_subscriptions_status',
                fields: ['status']
            }
        ],
        relationships: [
            {
                type: 'one-to-one',
                table: 'organizations',
                foreignKey: 'organization_id',
                onDelete: 'cascade'
            }
        ]
    };
    const invoicesTable = {
        name: 'invoices',
        fields: [
            {
                name: 'id',
                type: 'integer',
                constraints: [{ type: 'primary' }],
                nullable: false
            },
            {
                name: 'organization_id',
                type: 'integer',
                nullable: false
            },
            {
                name: 'subscription_id',
                type: 'integer',
                nullable: true
            },
            {
                name: 'stripe_invoice_id',
                type: 'string',
                nullable: true
            },
            {
                name: 'number',
                type: 'string',
                nullable: false
            },
            {
                name: 'status',
                type: 'string',
                nullable: false
            },
            {
                name: 'amount',
                type: 'decimal',
                nullable: false
            },
            {
                name: 'currency',
                type: 'string',
                default: 'USD',
                nullable: false
            },
            {
                name: 'tax_amount',
                type: 'decimal',
                default: 0,
                nullable: false
            },
            {
                name: 'total_amount',
                type: 'decimal',
                nullable: false
            },
            {
                name: 'invoice_pdf',
                type: 'string',
                nullable: true
            },
            {
                name: 'due_date',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'paid_at',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            }
        ],
        indexes: [
            {
                name: 'idx_invoices_org_id',
                fields: ['organization_id']
            },
            {
                name: 'idx_invoices_subscription_id',
                fields: ['subscription_id']
            },
            {
                name: 'idx_invoices_stripe_id',
                fields: ['stripe_invoice_id'],
                unique: true
            },
            {
                name: 'idx_invoices_status',
                fields: ['status']
            },
            {
                name: 'idx_invoices_due_date',
                fields: ['due_date']
            }
        ],
        relationships: [
            {
                type: 'many-to-one',
                table: 'organizations',
                foreignKey: 'organization_id',
                onDelete: 'cascade'
            },
            {
                type: 'many-to-one',
                table: 'subscriptions',
                foreignKey: 'subscription_id',
                onDelete: 'set null'
            }
        ]
    };
    const apiKeysTable = {
        name: 'api_keys',
        fields: [
            {
                name: 'id',
                type: 'integer',
                constraints: [{ type: 'primary' }],
                nullable: false
            },
            {
                name: 'organization_id',
                type: 'integer',
                nullable: false
            },
            {
                name: 'user_id',
                type: 'integer',
                nullable: false
            },
            {
                name: 'name',
                type: 'string',
                nullable: false
            },
            {
                name: 'key_hash',
                type: 'string',
                nullable: false
            },
            {
                name: 'key_preview',
                type: 'string',
                nullable: false
            },
            {
                name: 'permissions',
                type: 'json',
                nullable: true
            },
            {
                name: 'is_active',
                type: 'boolean',
                default: true,
                nullable: false
            },
            {
                name: 'last_used_at',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'expires_at',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            }
        ],
        indexes: [
            {
                name: 'idx_api_keys_org_id',
                fields: ['organization_id']
            },
            {
                name: 'idx_api_keys_user_id',
                fields: ['user_id']
            },
            {
                name: 'idx_api_keys_hash',
                fields: ['key_hash'],
                unique: true
            },
            {
                name: 'idx_api_keys_active',
                fields: ['is_active']
            }
        ],
        relationships: [
            {
                type: 'many-to-one',
                table: 'organizations',
                foreignKey: 'organization_id',
                onDelete: 'cascade'
            },
            {
                type: 'many-to-one',
                table: 'users',
                foreignKey: 'user_id',
                onDelete: 'cascade'
            }
        ]
    };
    const webhooksTable = {
        name: 'webhooks',
        fields: [
            {
                name: 'id',
                type: 'integer',
                constraints: [{ type: 'primary' }],
                nullable: false
            },
            {
                name: 'organization_id',
                type: 'integer',
                nullable: false
            },
            {
                name: 'url',
                type: 'string',
                nullable: false
            },
            {
                name: 'events',
                type: 'json',
                nullable: false
            },
            {
                name: 'secret',
                type: 'string',
                nullable: true
            },
            {
                name: 'is_active',
                type: 'boolean',
                default: true,
                nullable: false
            },
            {
                name: 'failure_count',
                type: 'integer',
                default: 0,
                nullable: false
            },
            {
                name: 'last_delivery_at',
                type: 'timestamp',
                nullable: true
            },
            {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            },
            {
                name: 'updated_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            }
        ],
        indexes: [
            {
                name: 'idx_webhooks_org_id',
                fields: ['organization_id']
            },
            {
                name: 'idx_webhooks_active',
                fields: ['is_active']
            }
        ],
        relationships: [
            {
                type: 'many-to-one',
                table: 'organizations',
                foreignKey: 'organization_id',
                onDelete: 'cascade'
            }
        ]
    };
    const auditLogsTable = {
        name: 'audit_logs',
        fields: [
            {
                name: 'id',
                type: 'integer',
                constraints: [{ type: 'primary' }],
                nullable: false
            },
            {
                name: 'organization_id',
                type: 'integer',
                nullable: false
            },
            {
                name: 'user_id',
                type: 'integer',
                nullable: true
            },
            {
                name: 'action',
                type: 'string',
                nullable: false
            },
            {
                name: 'resource_type',
                type: 'string',
                nullable: false
            },
            {
                name: 'resource_id',
                type: 'string',
                nullable: true
            },
            {
                name: 'metadata',
                type: 'json',
                nullable: true
            },
            {
                name: 'ip_address',
                type: 'string',
                nullable: true
            },
            {
                name: 'user_agent',
                type: 'text',
                nullable: true
            },
            {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            }
        ],
        indexes: [
            {
                name: 'idx_audit_logs_org_id',
                fields: ['organization_id']
            },
            {
                name: 'idx_audit_logs_user_id',
                fields: ['user_id']
            },
            {
                name: 'idx_audit_logs_action',
                fields: ['action']
            },
            {
                name: 'idx_audit_logs_resource',
                fields: ['resource_type', 'resource_id']
            },
            {
                name: 'idx_audit_logs_created_at',
                fields: ['created_at']
            }
        ],
        relationships: [
            {
                type: 'many-to-one',
                table: 'organizations',
                foreignKey: 'organization_id',
                onDelete: 'cascade'
            },
            {
                type: 'many-to-one',
                table: 'users',
                foreignKey: 'user_id',
                onDelete: 'set null'
            }
        ]
    };
    const usageMetricsTable = {
        name: 'usage_metrics',
        fields: [
            {
                name: 'id',
                type: 'integer',
                constraints: [{ type: 'primary' }],
                nullable: false
            },
            {
                name: 'organization_id',
                type: 'integer',
                nullable: false
            },
            {
                name: 'metric_type',
                type: 'string',
                nullable: false
            },
            {
                name: 'value',
                type: 'integer',
                nullable: false
            },
            {
                name: 'period_start',
                type: 'timestamp',
                nullable: false
            },
            {
                name: 'period_end',
                type: 'timestamp',
                nullable: false
            },
            {
                name: 'metadata',
                type: 'json',
                nullable: true
            },
            {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                nullable: false
            }
        ],
        indexes: [
            {
                name: 'idx_usage_metrics_org_id',
                fields: ['organization_id']
            },
            {
                name: 'idx_usage_metrics_type',
                fields: ['metric_type']
            },
            {
                name: 'idx_usage_metrics_period',
                fields: ['organization_id', 'metric_type', 'period_start']
            }
        ],
        relationships: [
            {
                type: 'many-to-one',
                table: 'organizations',
                foreignKey: 'organization_id',
                onDelete: 'cascade'
            }
        ]
    };
    return {
        name: 'SaaS Platform',
        description: 'Complete database schema for a multi-tenant SaaS platform with organizations, subscriptions, billing, and API management',
        tables: [
            organizationsTable,
            usersTable,
            organizationUsersTable,
            subscriptionsTable,
            invoicesTable,
            apiKeysTable,
            webhooksTable,
            auditLogsTable,
            usageMetricsTable
        ]
    };
}
//# sourceMappingURL=saas-template.js.map