import { SchemaTemplate, TableConfig, FieldConfig, IndexConfig, RelationshipConfig } from '../index';

export function generateBlogSchema(): SchemaTemplate {
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
        name: 'username',
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
        name: 'bio',
        type: 'text',
        nullable: true
      },
      {
        name: 'avatar_url',
        type: 'string',
        nullable: true
      },
      {
        name: 'website',
        type: 'string',
        nullable: true
      },
      {
        name: 'role',
        type: 'string',
        default: 'author',
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
        name: 'idx_users_username',
        fields: ['username'],
        unique: true
      },
      {
        name: 'idx_users_role',
        fields: ['role']
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
        name: 'color',
        type: 'string',
        nullable: true
      },
      {
        name: 'post_count',
        type: 'integer',
        default: 0,
        nullable: false
      },
      {
        name: 'sort_order',
        type: 'integer',
        default: 0,
        nullable: false
      },
      {
        name: 'is_featured',
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
        name: 'idx_categories_slug',
        fields: ['slug'],
        unique: true
      },
      {
        name: 'idx_categories_featured',
        fields: ['is_featured', 'sort_order']
      }
    ]
  };

  const tagsTable: TableConfig = {
    name: 'tags',
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
        constraints: [{ type: 'unique' }],
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
        name: 'post_count',
        type: 'integer',
        default: 0,
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
        name: 'idx_tags_name',
        fields: ['name'],
        unique: true
      },
      {
        name: 'idx_tags_slug',
        fields: ['slug'],
        unique: true
      }
    ]
  };

  const postsTable: TableConfig = {
    name: 'posts',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'author_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'category_id',
        type: 'integer',
        nullable: true
      },
      {
        name: 'title',
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
        name: 'excerpt',
        type: 'text',
        nullable: true
      },
      {
        name: 'content',
        type: 'text',
        nullable: false
      },
      {
        name: 'featured_image',
        type: 'string',
        nullable: true
      },
      {
        name: 'status',
        type: 'string',
        default: 'draft',
        nullable: false
      },
      {
        name: 'is_featured',
        type: 'boolean',
        default: false,
        nullable: false
      },
      {
        name: 'allow_comments',
        type: 'boolean',
        default: true,
        nullable: false
      },
      {
        name: 'view_count',
        type: 'integer',
        default: 0,
        nullable: false
      },
      {
        name: 'comment_count',
        type: 'integer',
        default: 0,
        nullable: false
      },
      {
        name: 'reading_time',
        type: 'integer',
        nullable: true
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
        name: 'published_at',
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
        name: 'idx_posts_author_id',
        fields: ['author_id']
      },
      {
        name: 'idx_posts_category_id',
        fields: ['category_id']
      },
      {
        name: 'idx_posts_slug',
        fields: ['slug'],
        unique: true
      },
      {
        name: 'idx_posts_status',
        fields: ['status']
      },
      {
        name: 'idx_posts_published',
        fields: ['status', 'published_at']
      },
      {
        name: 'idx_posts_featured',
        fields: ['is_featured', 'published_at']
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'users',
        foreignKey: 'author_id',
        onDelete: 'restrict'
      },
      {
        type: 'many-to-one',
        table: 'categories',
        foreignKey: 'category_id',
        onDelete: 'set null'
      }
    ]
  };

  const postTagsTable: TableConfig = {
    name: 'post_tags',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'post_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'tag_id',
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
        name: 'idx_post_tags_post_id',
        fields: ['post_id']
      },
      {
        name: 'idx_post_tags_tag_id',
        fields: ['tag_id']
      },
      {
        name: 'idx_post_tags_unique',
        fields: ['post_id', 'tag_id'],
        unique: true
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'posts',
        foreignKey: 'post_id',
        onDelete: 'cascade'
      },
      {
        type: 'many-to-one',
        table: 'tags',
        foreignKey: 'tag_id',
        onDelete: 'cascade'
      }
    ]
  };

  const commentsTable: TableConfig = {
    name: 'comments',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'post_id',
        type: 'integer',
        nullable: false
      },
      {
        name: 'parent_id',
        type: 'integer',
        nullable: true
      },
      {
        name: 'author_name',
        type: 'string',
        nullable: false
      },
      {
        name: 'author_email',
        type: 'string',
        nullable: false
      },
      {
        name: 'author_website',
        type: 'string',
        nullable: true
      },
      {
        name: 'content',
        type: 'text',
        nullable: false
      },
      {
        name: 'status',
        type: 'string',
        default: 'pending',
        nullable: false
      },
      {
        name: 'ip_address',
        type: 'string',
        nullable: true
      },
      {
        name: 'user_agent',
        type: 'string',
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
        name: 'idx_comments_post_id',
        fields: ['post_id']
      },
      {
        name: 'idx_comments_parent_id',
        fields: ['parent_id']
      },
      {
        name: 'idx_comments_status',
        fields: ['status', 'created_at']
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'posts',
        foreignKey: 'post_id',
        onDelete: 'cascade'
      },
      {
        type: 'one-to-many',
        table: 'comments',
        foreignKey: 'parent_id',
        onDelete: 'cascade'
      }
    ]
  };

  const mediasTable: TableConfig = {
    name: 'medias',
    fields: [
      {
        name: 'id',
        type: 'integer',
        constraints: [{ type: 'primary' }],
        nullable: false
      },
      {
        name: 'filename',
        type: 'string',
        nullable: false
      },
      {
        name: 'original_name',
        type: 'string',
        nullable: false
      },
      {
        name: 'mime_type',
        type: 'string',
        nullable: false
      },
      {
        name: 'file_size',
        type: 'integer',
        nullable: false
      },
      {
        name: 'url',
        type: 'string',
        nullable: false
      },
      {
        name: 'alt_text',
        type: 'string',
        nullable: true
      },
      {
        name: 'caption',
        type: 'text',
        nullable: true
      },
      {
        name: 'dimensions',
        type: 'json',
        nullable: true
      },
      {
        name: 'uploaded_by',
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
        name: 'idx_medias_filename',
        fields: ['filename']
      },
      {
        name: 'idx_medias_mime_type',
        fields: ['mime_type']
      },
      {
        name: 'idx_medias_uploaded_by',
        fields: ['uploaded_by']
      }
    ],
    relationships: [
      {
        type: 'many-to-one',
        table: 'users',
        foreignKey: 'uploaded_by',
        onDelete: 'restrict'
      }
    ]
  };

  return {
    name: 'Blog Platform',
    description: 'Complete database schema for a blog platform with posts, categories, tags, comments, and media management',
    tables: [
      usersTable,
      categoriesTable,
      tagsTable,
      postsTable,
      postTagsTable,
      commentsTable,
      mediasTable
    ]
  };
}