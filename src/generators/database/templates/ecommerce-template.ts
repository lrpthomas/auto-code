import { SchemaTemplate, TableConfig, FieldConfig, IndexConfig, RelationshipConfig } from '../index';

export function generateEcommerceSchema(): SchemaTemplate {
  const usersTable: TableConfig = {
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
        nullable: false
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
        name: 'phone',
        type: 'string',
        nullable: true
      },
      {
        name: 'date_of_birth',
        type: 'date',
        nullable: true
      },
      {
        name: 'email_verified',
        type: 'boolean',
        default: false,
        nullable: false
      },
      {
        name: 'status',
        type: 'string',
        default: 'active',
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
        name: 'idx_users_email',
        fields: ['email'],
        unique: true
      },
      {
        name: 'idx_users_status',
        fields: ['status']
      },
      {
        name: 'idx_users_created_at',
        fields: ['created_at']
      }
    ]
  };

  const categoriesTable: TableConfig = {
    name: 'categories',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'parent_id',
        type: 'integer',
        nullable: true
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
        name: 'description',
        type: 'text',
        nullable: true
      },
      {
        name: 'image_url',
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
        name: 'sort_order',
        type: 'integer',
        default: 0,
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
        name: 'idx_categories_slug',
        fields: ['slug'],
        unique: true
      },
      {
        name: 'idx_categories_parent_id',
        fields: ['parent_id']
      },
      {
        name: 'idx_categories_active_sort',
        fields: ['is_active', 'sort_order']
      }
    ],
    relationships: [
      {
        type: 'one-to-many',
        table: 'categories',
        foreignKey: 'parent_id',
        onDelete: 'set null'
      }
    ]
  };

  const productsTable: TableConfig = {
    name: 'products',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'category_id',
        type: 'integer',
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
        name: 'description',
        type: 'text',
        nullable: true
      },
      {
        name: 'short_description',
        type: 'string',
        nullable: true
      },
      {
        name: 'sku',
        type: 'string',
        constraints: [{ type: 'unique' }],
        nullable: false
      },
      {
        name: 'price',
        type: 'decimal',
        nullable: false
      },
      {
        name: 'compare_price',
        type: 'decimal',
        nullable: true
      },
      {
        name: 'cost_price',
        type: 'decimal',
        nullable: true
      },
      {
        name: 'weight',
        type: 'decimal',
        nullable: true
      },
      {
        name: 'dimensions',
        type: 'json',
        nullable: true
      },
      {
        name: 'stock_quantity',
        type: 'integer',
        default: 0,
        nullable: false
      },
      {
        name: 'track_inventory',
        type: 'boolean',
        default: true,
        nullable: false
      },
      {
        name: 'allow_backorders',
        type: 'boolean',
        default: false,
        nullable: false
      },
      {
        name: 'is_digital',
        type: 'boolean',
        default: false,
        nullable: false
      },
      {
        name: 'requires_shipping',
        type: 'boolean',
        default: true,
        nullable: false
      },
      {
        name: 'is_featured',
        type: 'boolean',
        default: false,
        nullable: false
      },
      {
        name: 'is_active',
        type: 'boolean',
        default: true,
        nullable: false
      },
      {
        name: 'meta_title',
        type: 'string',
        nullable: true
      },
      {
        name: 'meta_description',
        type: 'text',
        nullable: true
      },
      {
        name: 'tags',
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
        name: 'idx_products_category_id',
        fields: ['category_id']
      },
      {
        name: 'idx_products_slug',
        fields: ['slug'],
        unique: true
      },
      {
        name: 'idx_products_sku',
        fields: ['sku'],
        unique: true
      },
      {
        name: 'idx_products_active_featured',
        fields: ['is_active', 'is_featured']
      },
      {
        name: 'idx_products_price',
        fields: ['price']
      },
      {
        name: 'idx_products_stock',
        fields: ['stock_quantity']
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'categories',
        foreignKey: 'category_id',
        onDelete: 'restrict'
      }
    ]
  };

  const productImagesTable: TableConfig = {
    name: 'product_images',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'product_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'image_url',
        type: 'string',
        nullable: false
      },
      {
        name: 'alt_text',
        type: 'string',
        nullable: true
      },
      {
        name: 'sort_order',
        type: 'integer',
        default: 0,
        nullable: false
      },
      {
        name: 'is_primary',
        type: 'boolean',
        default: false,
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
        name: 'idx_product_images_product_id',
        fields: ['product_id']
      },
      {
        name: 'idx_product_images_primary',
        fields: ['product_id', 'is_primary']
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'products',
        foreignKey: 'product_id',
        onDelete: 'cascade'
      }
    ]
  };

  const addressesTable: TableConfig = {
    name: 'addresses',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'user_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'type',
        type: 'string',
        nullable: false
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
        name: 'company',
        type: 'string',
        nullable: true
      },
      {
        name: 'address_line_1',
        type: 'string',
        nullable: false
      },
      {
        name: 'address_line_2',
        type: 'string',
        nullable: true
      },
      {
        name: 'city',
        type: 'string',
        nullable: false
      },
      {
        name: 'state',
        type: 'string',
        nullable: false
      },
      {
        name: 'postal_code',
        type: 'string',
        nullable: false
      },
      {
        name: 'country',
        type: 'string',
        nullable: false
      },
      {
        name: 'phone',
        type: 'string',
        nullable: true
      },
      {
        name: 'is_default',
        type: 'boolean',
        default: false,
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
        name: 'idx_addresses_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_addresses_type',
        fields: ['user_id', 'type']
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'users',
        foreignKey: 'user_id',
        onDelete: 'cascade'
      }
    ]
  };

  const ordersTable: TableConfig = {
    name: 'orders',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'user_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'order_number',
        type: 'string',
        constraints: [{ type: 'unique' }],
        nullable: false
      },
      {
        name: 'status',
        type: 'string',
        default: 'pending',
        nullable: false
      },
      {
        name: 'currency',
        type: 'string',
        default: 'USD',
        nullable: false
      },
      {
        name: 'subtotal',
        type: 'decimal',
        nullable: false
      },
      {
        name: 'tax_amount',
        type: 'decimal',
        default: 0,
        nullable: false
      },
      {
        name: 'shipping_amount',
        type: 'decimal',
        default: 0,
        nullable: false
      },
      {
        name: 'discount_amount',
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
        name: 'billing_address',
        type: 'json',
        nullable: false
      },
      {
        name: 'shipping_address',
        type: 'json',
        nullable: true
      },
      {
        name: 'payment_method',
        type: 'string',
        nullable: true
      },
      {
        name: 'payment_status',
        type: 'string',
        default: 'pending',
        nullable: false
      },
      {
        name: 'notes',
        type: 'text',
        nullable: true
      },
      {
        name: 'shipped_at',
        type: 'timestamp',
        nullable: true
      },
      {
        name: 'delivered_at',
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
        name: 'idx_orders_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_orders_number',
        fields: ['order_number'],
        unique: true
      },
      {
        name: 'idx_orders_status',
        fields: ['status']
      },
      {
        name: 'idx_orders_payment_status',
        fields: ['payment_status']
      },
      {
        name: 'idx_orders_created_at',
        fields: ['created_at']
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'users',
        foreignKey: 'user_id',
        onDelete: 'restrict'
      }
    ]
  };

  const orderItemsTable: TableConfig = {
    name: 'order_items',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'order_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'product_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'product_name',
        type: 'string',
        nullable: false
      },
      {
        name: 'product_sku',
        type: 'string',
        nullable: false
      },
      {
        name: 'quantity',
        type: 'integer',
        nullable: false
      },
      {
        name: 'unit_price',
        type: 'decimal',
        nullable: false
      },
      {
        name: 'total_price',
        type: 'decimal',
        nullable: false
      },
      {
        name: 'product_data',
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
        name: 'idx_order_items_order_id',
        fields: ['order_id']
      },
      {
        name: 'idx_order_items_product_id',
        fields: ['product_id']
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'orders',
        foreignKey: 'order_id',
        onDelete: 'cascade'
      },
      {
        type: 'many-to-one',
        table: 'products',
        foreignKey: 'product_id',
        onDelete: 'restrict'
      }
    ]
  };

  const cartsTable: TableConfig = {
    name: 'carts',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'user_id',
        type: 'integer',
        nullable: true
      },
      {
        name: 'session_id',
        type: 'string',
        nullable: true
      },
      {
        name: 'product_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'quantity',
        type: 'integer',
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
        name: 'idx_carts_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_carts_session_id',
        fields: ['session_id']
      },
      {
        name: 'idx_carts_product_id',
        fields: ['product_id']
      },
      {
        name: 'idx_carts_user_product',
        fields: ['user_id', 'product_id'],
        unique: true
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'users',
        foreignKey: 'user_id',
        onDelete: 'cascade'
      },
      {
        type: 'many-to-one',
        table: 'products',
        foreignKey: 'product_id',
        onDelete: 'cascade'
      }
    ]
  };

  const wishlistsTable: TableConfig = {
    name: 'wishlists',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'user_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'product_id',
        type: 'integer',
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
        name: 'idx_wishlists_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_wishlists_product_id',
        fields: ['product_id']
      },
      {
        name: 'idx_wishlists_user_product',
        fields: ['user_id', 'product_id'],
        unique: true
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'users',
        foreignKey: 'user_id',
        onDelete: 'cascade'
      },
      {
        type: 'many-to-one',
        table: 'products',
        foreignKey: 'product_id',
        onDelete: 'cascade'
      }
    ]
  };

  const reviewsTable: TableConfig = {
    name: 'reviews',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'product_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'user_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'order_id',
        type: 'integer',
        nullable: true
      },
      {
        name: 'rating',
        type: 'integer',
        constraints: [{ type: 'check', value: 'rating >= 1 AND rating <= 5' }],
        nullable: false
      },
      {
        name: 'title',
        type: 'string',
        nullable: true
      },
      {
        name: 'content',
        type: 'text',
        nullable: true
      },
      {
        name: 'is_verified',
        type: 'boolean',
        default: false,
        nullable: false
      },
      {
        name: 'is_approved',
        type: 'boolean',
        default: false,
        nullable: false
      },
      {
        name: 'helpful_votes',
        type: 'integer',
        default: 0,
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
        name: 'idx_reviews_product_id',
        fields: ['product_id']
      },
      {
        name: 'idx_reviews_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_reviews_rating',
        fields: ['product_id', 'rating']
      },
      {
        name: 'idx_reviews_approved',
        fields: ['is_approved', 'created_at']
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'products',
        foreignKey: 'product_id',
        onDelete: 'cascade'
      },
      {
        type: 'many-to-one',
        table: 'users',
        foreignKey: 'user_id',
        onDelete: 'cascade'
      },
      {
        type: 'many-to-one',
        table: 'orders',
        foreignKey: 'order_id',
        onDelete: 'set null'
      }
    ]
  };

  return {
    name: 'E-commerce Platform',
    description: 'Complete database schema for an e-commerce platform with users, products, orders, and reviews',
    tables: [
      usersTable,
      categoriesTable,
      productsTable,
      productImagesTable,
      addressesTable,
      ordersTable,
      orderItemsTable,
      cartsTable,
      wishlistsTable,
      reviewsTable
    ]
  };
}