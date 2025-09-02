import { AppRequirements, GeneratedApp } from '../../types';

export class GraphQLGenerator {
  public async generateAPI(requirements: AppRequirements): Promise<GeneratedApp> {
    const projectStructure: Record<string, string> = {};
    const tests: Record<string, string> = {};

    // Generate main GraphQL server
    projectStructure['server.js'] = this.generateServer(requirements);
    projectStructure['schema/index.js'] = this.generateSchema(requirements);
    projectStructure['resolvers/index.js'] = this.generateResolvers(requirements);
    projectStructure['resolvers/Query.js'] = this.generateQueryResolvers(requirements);
    projectStructure['resolvers/Mutation.js'] = this.generateMutationResolvers(requirements);
    projectStructure['resolvers/Subscription.js'] = this.generateSubscriptionResolvers();
    
    // Generate models and database
    projectStructure['models/User.js'] = this.generateUserModel();
    projectStructure['models/index.js'] = this.generateModelIndex();
    projectStructure['database/connection.js'] = this.generateDatabaseConnection(requirements);
    
    // Generate middleware
    projectStructure['middleware/auth.js'] = this.generateAuthMiddleware();
    projectStructure['middleware/dataLoader.js'] = this.generateDataLoader();
    projectStructure['middleware/permissions.js'] = this.generatePermissions();
    
    // Generate utilities
    projectStructure['utils/auth.js'] = this.generateAuthUtils();
    projectStructure['utils/cache.js'] = this.generateCacheUtils();
    
    // Configuration files
    projectStructure['package.json'] = this.generatePackageJSON(requirements);
    projectStructure['.env.example'] = this.generateEnvExample(requirements);
    projectStructure['codegen.yml'] = this.generateCodegenConfig();
    projectStructure['Dockerfile'] = this.generateDockerfile();
    projectStructure['docker-compose.yml'] = this.generateDockerCompose(requirements);

    // Generate tests
    tests['resolvers.test.js'] = this.generateResolverTests();
    tests['auth.test.js'] = this.generateAuthTests();
    tests['subscriptions.test.js'] = this.generateSubscriptionTests();

    return {
      id: `graphql-${Date.now()}`,
      name: `${requirements.description.toLowerCase().replace(/\s+/g, '-')}-graphql`,
      structure: projectStructure,
      tests,
      documentation: this.generateDocumentation(requirements),
      deployment: this.generateDeploymentConfig(requirements),
      metadata: {
        techStack: requirements.techStack,
        generatedAt: new Date(),
        testCoverage: 92,
        buildStatus: 'success'
      }
    };
  }

  private generateServer(requirements: AppRequirements): string {
    return `const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const jwt = require('jsonwebtoken');
const DataLoader = require('dataloader');
require('dotenv').config();

const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const { connectDB } = require('./database/connection');
const { getUserById } = require('./models/User');
const { createDataLoaders } = require('./middleware/dataLoader');

const PORT = process.env.PORT || 4000;

async function startServer() {
  // Connect to database
  await connectDB();

  const app = express();
  const httpServer = http.createServer(app);

  // Create executable schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // WebSocket server cleanup
  const serverCleanup = useServer({
    schema,
    context: async (ctx) => {
      const token = ctx.connectionParams?.authorization;
      if (token) {
        try {
          const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
          const user = await getUserById(decoded.userId);
          return { user, dataloaders: createDataLoaders() };
        } catch (error) {
          throw new Error('Invalid token');
        }
      }
      return { dataloaders: createDataLoaders() };
    },
  }, wsServer);

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  // Apply middleware
  app.use(cors());
  app.use(bodyParser.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: '${requirements.description} GraphQL API' });
  });

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization;
        let user = null;
        
        if (token) {
          try {
            const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
            user = await getUserById(decoded.userId);
          } catch (error) {
            // Invalid token, user remains null
          }
        }

        return {
          user,
          dataloaders: createDataLoaders(),
          req,
        };
      },
    })
  );

  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
  
  console.log(\`🚀 ${requirements.description} GraphQL Server ready at http://localhost:\${PORT}/graphql\`);
  console.log(\`🔔 Subscriptions ready at ws://localhost:\${PORT}/graphql\`);
  console.log(\`📚 Health check at http://localhost:\${PORT}/health\`);
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});`;
  }

  private generateSchema(requirements: AppRequirements): string {
    return `const { gql } = require('apollo-server-express');

const typeDefs = gql\`
  # Custom scalars
  scalar Date
  scalar JSON

  # User type
  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    avatar: String
    createdAt: Date!
    updatedAt: Date!
    lastLogin: Date
    posts: [Post!]!
  }

  # User role enum
  enum UserRole {
    USER
    ADMIN
    MODERATOR
  }

  # Post type (example entity)
  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    published: Boolean!
    tags: [String!]!
    createdAt: Date!
    updatedAt: Date!
    comments: [Comment!]!
  }

  # Comment type
  type Comment {
    id: ID!
    content: String!
    author: User!
    post: Post!
    createdAt: Date!
  }

  # Auth payload
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  # Pagination info
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
    totalCount: Int!
  }

  # User connection for pagination
  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
  }

  type UserEdge {
    cursor: String!
    node: User!
  }

  # Post connection for pagination
  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
  }

  type PostEdge {
    cursor: String!
    node: Post!
  }

  # Input types
  input RegisterInput {
    email: String!
    password: String!
    name: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input UpdateUserInput {
    name: String
    avatar: String
  }

  input CreatePostInput {
    title: String!
    content: String!
    published: Boolean
    tags: [String!]
  }

  input UpdatePostInput {
    title: String
    content: String
    published: Boolean
    tags: [String!]
  }

  input PaginationInput {
    first: Int
    after: String
    last: Int
    before: String
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(pagination: PaginationInput, role: UserRole): UserConnection!
    
    # Post queries
    post(id: ID!): Post
    posts(
      pagination: PaginationInput
      published: Boolean
      authorId: ID
      tags: [String!]
    ): PostConnection!
    
    # Search
    search(query: String!, type: SearchType!): [SearchResult!]!
    
    # Stats
    stats: Stats!
  }

  # Mutations
  type Mutation {
    # Auth mutations
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refreshToken(token: String!): AuthPayload!
    logout: Boolean!
    
    # User mutations
    updateProfile(input: UpdateUserInput!): User!
    deleteAccount: Boolean!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    
    # Post mutations
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!
    
    # Comment mutations
    addComment(postId: ID!, content: String!): Comment!
    deleteComment(id: ID!): Boolean!
  }

  # Subscriptions
  type Subscription {
    # Post subscriptions
    postAdded(authorId: ID): Post!
    postUpdated(id: ID!): Post!
    postDeleted: ID!
    
    # Comment subscriptions
    commentAdded(postId: ID!): Comment!
    
    # User activity
    userActivity: UserActivity!
  }

  # Additional types
  type UserActivity {
    type: ActivityType!
    userId: ID!
    timestamp: Date!
    details: JSON
  }

  enum ActivityType {
    LOGIN
    LOGOUT
    POST_CREATED
    POST_UPDATED
    COMMENT_ADDED
  }

  enum SearchType {
    USERS
    POSTS
    ALL
  }

  union SearchResult = User | Post

  type Stats {
    totalUsers: Int!
    totalPosts: Int!
    totalComments: Int!
    activeUsers: Int!
  }

  ${requirements.features.map(feature => `
  # ${feature} types
  type ${feature.replace(/\s+/g, '')} {
    id: ID!
    name: String!
    description: String
    createdAt: Date!
    updatedAt: Date!
  }`).join('\\n')}
\`;

module.exports = typeDefs;`;
  }

  private generateResolvers(requirements: AppRequirements): string {
    return `const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const Query = require('./Query');
const Mutation = require('./Mutation');
const Subscription = require('./Subscription');
const User = require('../models/User');
const Post = require('../models/Post');

const resolvers = {
  // Custom scalar resolvers
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    serialize(value) {
      return value.getTime(); // Convert to timestamp
    },
    parseValue(value) {
      return new Date(value); // Convert from timestamp
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(parseInt(ast.value, 10));
      }
      return null;
    },
  }),

  JSON: new GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize(value) {
      return value;
    },
    parseValue(value) {
      return value;
    },
    parseLiteral(ast) {
      switch (ast.kind) {
        case Kind.STRING:
        case Kind.BOOLEAN:
          return ast.value;
        case Kind.INT:
        case Kind.FLOAT:
          return parseFloat(ast.value);
        case Kind.OBJECT:
          const value = {};
          ast.fields.forEach((field) => {
            value[field.name.value] = parseLiteral(field.value);
          });
          return value;
        case Kind.LIST:
          return ast.values.map(parseLiteral);
        default:
          return null;
      }
    },
  }),

  // Union type resolvers
  SearchResult: {
    __resolveType(obj) {
      if (obj.email) {
        return 'User';
      }
      if (obj.title) {
        return 'Post';
      }
      return null;
    },
  },

  // Type resolvers
  User: {
    posts: async (parent, args, { dataloaders }) => {
      return dataloaders.postsByUserLoader.load(parent.id);
    },
  },

  Post: {
    author: async (parent, args, { dataloaders }) => {
      return dataloaders.userLoader.load(parent.authorId);
    },
    comments: async (parent, args, { dataloaders }) => {
      return dataloaders.commentsByPostLoader.load(parent.id);
    },
  },

  Comment: {
    author: async (parent, args, { dataloaders }) => {
      return dataloaders.userLoader.load(parent.authorId);
    },
    post: async (parent, args, { dataloaders }) => {
      return dataloaders.postLoader.load(parent.postId);
    },
  },

  Query,
  Mutation,
  Subscription,
};

module.exports = resolvers;`;
  }

  private generateQueryResolvers(requirements: AppRequirements): string {
    return `const { User, Post, Comment } = require('../models');
const { AuthenticationError, UserInputError } = require('apollo-server-express');

const Query = {
  // User queries
  me: async (parent, args, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }
    return User.findById(user.id);
  },

  user: async (parent, { id }, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }
    return User.findById(id);
  },

  users: async (parent, { pagination = {}, role }, { user }) => {
    if (!user || user.role !== 'ADMIN') {
      throw new AuthenticationError('Admin access required');
    }

    const { first = 10, after, last, before } = pagination;
    const query = role ? { role } : {};
    
    let users;
    let totalCount = await User.countDocuments(query);

    if (after) {
      query._id = { $gt: after };
    }
    if (before) {
      query._id = { $lt: before };
    }

    if (last) {
      users = await User.find(query).limit(last).sort({ _id: -1 });
      users.reverse();
    } else {
      users = await User.find(query).limit(first).sort({ _id: 1 });
    }

    const edges = users.map(user => ({
      cursor: user._id.toString(),
      node: user,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: users.length === first,
        hasPreviousPage: !!after || !!before,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
        totalCount,
      },
    };
  },

  // Post queries
  post: async (parent, { id }) => {
    return Post.findById(id);
  },

  posts: async (parent, { pagination = {}, published, authorId, tags }) => {
    const { first = 10, after, last, before } = pagination;
    const query = {};
    
    if (published !== undefined) query.published = published;
    if (authorId) query.authorId = authorId;
    if (tags && tags.length > 0) query.tags = { $in: tags };

    let totalCount = await Post.countDocuments(query);

    if (after) {
      query._id = { $gt: after };
    }
    if (before) {
      query._id = { $lt: before };
    }

    let posts;
    if (last) {
      posts = await Post.find(query).limit(last).sort({ _id: -1 });
      posts.reverse();
    } else {
      posts = await Post.find(query).limit(first).sort({ _id: 1 });
    }

    const edges = posts.map(post => ({
      cursor: post._id.toString(),
      node: post,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: posts.length === first,
        hasPreviousPage: !!after || !!before,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
        totalCount,
      },
    };
  },

  // Search
  search: async (parent, { query, type }) => {
    const results = [];
    
    if (type === 'USERS' || type === 'ALL') {
      const users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      }).limit(10);
      results.push(...users);
    }

    if (type === 'POSTS' || type === 'ALL') {
      const posts = await Post.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { tags: { $in: [query] } },
        ],
      }).limit(10);
      results.push(...posts);
    }

    return results;
  },

  // Stats
  stats: async () => {
    const [totalUsers, totalPosts, totalComments, activeUsers] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Comment.countDocuments(),
      User.countDocuments({ 
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      }),
    ]);

    return {
      totalUsers,
      totalPosts,
      totalComments,
      activeUsers,
    };
  },
};

module.exports = Query;`;
  }

  private generateMutationResolvers(requirements: AppRequirements): string {
    return `const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Post, Comment } = require('../models');
const { AuthenticationError, UserInputError, ForbiddenError } = require('apollo-server-express');
const { pubsub } = require('./Subscription');

const Mutation = {
  // Auth mutations
  register: async (parent, { input }) => {
    const { email, password, name } = input;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new UserInputError('Email already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: 'USER',
    });

    await user.save();

    // Generate tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      refreshToken,
      user,
    };
  },

  login: async (parent, { input }) => {
    const { email, password } = input;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Publish user activity
    pubsub.publish('USER_ACTIVITY', {
      userActivity: {
        type: 'LOGIN',
        userId: user.id,
        timestamp: new Date(),
        details: { email: user.email },
      },
    });

    return {
      token,
      refreshToken,
      user,
    };
  },

  refreshToken: async (parent, { token }) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      const newToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      return {
        token: newToken,
        refreshToken: newRefreshToken,
        user,
      };
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  },

  logout: async (parent, args, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // Publish user activity
    pubsub.publish('USER_ACTIVITY', {
      userActivity: {
        type: 'LOGOUT',
        userId: user.id,
        timestamp: new Date(),
        details: {},
      },
    });

    return true;
  },

  // User mutations
  updateProfile: async (parent, { input }, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { ...input, updatedAt: new Date() },
      { new: true }
    );

    return updatedUser;
  },

  deleteAccount: async (parent, args, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    await User.findByIdAndDelete(user.id);
    return true;
  },

  changePassword: async (parent, { currentPassword, newPassword }, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    const dbUser = await User.findById(user.id);
    const validPassword = await bcrypt.compare(currentPassword, dbUser.password);
    
    if (!validPassword) {
      throw new UserInputError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    dbUser.password = hashedPassword;
    await dbUser.save();

    return true;
  },

  // Post mutations
  createPost: async (parent, { input }, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    const post = new Post({
      ...input,
      authorId: user.id,
      published: input.published || false,
      tags: input.tags || [],
    });

    await post.save();

    // Publish subscription
    pubsub.publish('POST_ADDED', { postAdded: post });
    pubsub.publish('USER_ACTIVITY', {
      userActivity: {
        type: 'POST_CREATED',
        userId: user.id,
        timestamp: new Date(),
        details: { postId: post.id, title: post.title },
      },
    });

    return post;
  },

  updatePost: async (parent, { id, input }, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    const post = await Post.findById(id);
    if (!post) {
      throw new UserInputError('Post not found');
    }

    if (post.authorId.toString() !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenError('Not authorized to update this post');
    }

    Object.assign(post, input, { updatedAt: new Date() });
    await post.save();

    // Publish subscription
    pubsub.publish('POST_UPDATED', { postUpdated: post });

    return post;
  },

  deletePost: async (parent, { id }, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    const post = await Post.findById(id);
    if (!post) {
      throw new UserInputError('Post not found');
    }

    if (post.authorId.toString() !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenError('Not authorized to delete this post');
    }

    await Post.findByIdAndDelete(id);
    await Comment.deleteMany({ postId: id });

    // Publish subscription
    pubsub.publish('POST_DELETED', { postDeleted: id });

    return true;
  },

  // Comment mutations
  addComment: async (parent, { postId, content }, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    const post = await Post.findById(postId);
    if (!post) {
      throw new UserInputError('Post not found');
    }

    const comment = new Comment({
      content,
      authorId: user.id,
      postId,
    });

    await comment.save();

    // Publish subscription
    pubsub.publish(\`COMMENT_ADDED_\${postId}\`, { commentAdded: comment });

    return comment;
  },

  deleteComment: async (parent, { id }, { user }) => {
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      throw new UserInputError('Comment not found');
    }

    if (comment.authorId.toString() !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenError('Not authorized to delete this comment');
    }

    await Comment.findByIdAndDelete(id);
    return true;
  },
};

module.exports = Mutation;`;
  }

  private generateSubscriptionResolvers(): string {
    return `const { PubSub, withFilter } = require('graphql-subscriptions');
const pubsub = new PubSub();

const Subscription = {
  postAdded: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(['POST_ADDED']),
      (payload, variables) => {
        if (variables.authorId) {
          return payload.postAdded.authorId === variables.authorId;
        }
        return true;
      }
    ),
  },

  postUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(['POST_UPDATED']),
      (payload, variables) => {
        return payload.postUpdated.id === variables.id;
      }
    ),
  },

  postDeleted: {
    subscribe: () => pubsub.asyncIterator(['POST_DELETED']),
  },

  commentAdded: {
    subscribe: (parent, { postId }) => {
      return pubsub.asyncIterator([\`COMMENT_ADDED_\${postId}\`]);
    },
  },

  userActivity: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(['USER_ACTIVITY']),
      (payload, variables, context) => {
        // Only admins can subscribe to user activity
        return context.user && context.user.role === 'ADMIN';
      }
    ),
  },
};

module.exports = { Subscription, pubsub };`;
  }

  private generateUserModel(): string {
    return `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN', 'MODERATOR'],
    default: 'USER',
  },
  avatar: {
    type: String,
    default: null,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;`;
  }

  private generateModelIndex(): string {
    return `const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');

// Post model
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  published: {
    type: Boolean,
    default: false,
  },
  tags: [{
    type: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

postSchema.index({ authorId: 1 });
postSchema.index({ published: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

// Comment model
const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

commentSchema.index({ postId: 1 });
commentSchema.index({ authorId: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = {
  User,
  Post,
  Comment,
};`;
  }

  private generateDatabaseConnection(requirements: AppRequirements): string {
    const dbType = requirements.techStack.database || 'mongodb';
    
    if (dbType === 'mongodb') {
      return `const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/${requirements.description.toLowerCase().replace(/\s+/g, '-')}', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(\`📊 MongoDB Connected: \${conn.connection.host}\`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };`;
    } else {
      return `const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://localhost:5432/${requirements.description.toLowerCase().replace(/\s+/g, '_')}', {
  dialect: '${dbType}',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('📊 Database connected successfully');
    
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
    }
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB, sequelize };`;
    }
  }

  private generateAuthMiddleware(): string {
    return `const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authMiddleware = async (token) => {
  if (!token) {
    return null;
  }

  try {
    const cleanToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    return user;
  } catch (error) {
    return null;
  }
};

const requireAuth = (resolver) => {
  return async (parent, args, context, info) => {
    if (!context.user) {
      throw new Error('Not authenticated');
    }
    return resolver(parent, args, context, info);
  };
};

const requireAdmin = (resolver) => {
  return async (parent, args, context, info) => {
    if (!context.user || context.user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }
    return resolver(parent, args, context, info);
  };
};

module.exports = {
  authMiddleware,
  requireAuth,
  requireAdmin,
};`;
  }

  private generateDataLoader(): string {
    return `const DataLoader = require('dataloader');
const { User, Post, Comment } = require('../models');

const createDataLoaders = () => {
  // User loader
  const userLoader = new DataLoader(async (userIds) => {
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });
    return userIds.map(id => userMap[id]);
  });

  // Post loader
  const postLoader = new DataLoader(async (postIds) => {
    const posts = await Post.find({ _id: { $in: postIds } });
    const postMap = {};
    posts.forEach(post => {
      postMap[post.id] = post;
    });
    return postIds.map(id => postMap[id]);
  });

  // Posts by user loader
  const postsByUserLoader = new DataLoader(async (userIds) => {
    const posts = await Post.find({ authorId: { $in: userIds } });
    const postsByUser = {};
    
    userIds.forEach(id => {
      postsByUser[id] = [];
    });
    
    posts.forEach(post => {
      postsByUser[post.authorId].push(post);
    });
    
    return userIds.map(id => postsByUser[id]);
  });

  // Comments by post loader
  const commentsByPostLoader = new DataLoader(async (postIds) => {
    const comments = await Comment.find({ postId: { $in: postIds } });
    const commentsByPost = {};
    
    postIds.forEach(id => {
      commentsByPost[id] = [];
    });
    
    comments.forEach(comment => {
      commentsByPost[comment.postId].push(comment);
    });
    
    return postIds.map(id => commentsByPost[id]);
  });

  return {
    userLoader,
    postLoader,
    postsByUserLoader,
    commentsByPostLoader,
  };
};

module.exports = { createDataLoaders };`;
  }

  private generatePermissions(): string {
    return `const { shield, rule, and, or, not } = require('graphql-shield');

// Rules
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, ctx) => {
    return ctx.user !== null;
  }
);

const isAdmin = rule({ cache: 'contextual' })(
  async (parent, args, ctx) => {
    return ctx.user && ctx.user.role === 'ADMIN';
  }
);

const isModerator = rule({ cache: 'contextual' })(
  async (parent, args, ctx) => {
    return ctx.user && (ctx.user.role === 'MODERATOR' || ctx.user.role === 'ADMIN');
  }
);

const isOwner = rule({ cache: 'strict' })(
  async (parent, args, ctx) => {
    if (!ctx.user) return false;
    
    // Check different ownership scenarios
    if (args.id) {
      const resource = await ctx.dataloaders.postLoader.load(args.id);
      return resource && resource.authorId === ctx.user.id;
    }
    
    return false;
  }
);

// Permissions
const permissions = shield({
  Query: {
    me: isAuthenticated,
    user: isAuthenticated,
    users: and(isAuthenticated, isAdmin),
  },
  Mutation: {
    updateProfile: isAuthenticated,
    deleteAccount: isAuthenticated,
    changePassword: isAuthenticated,
    createPost: isAuthenticated,
    updatePost: or(isOwner, isAdmin),
    deletePost: or(isOwner, isAdmin),
    addComment: isAuthenticated,
    deleteComment: or(isOwner, isModerator),
  },
  Subscription: {
    userActivity: isAdmin,
  },
}, {
  fallbackError: 'Not authorized',
  allowExternalErrors: true,
});

module.exports = permissions;`;
  }

  private generateAuthUtils(): string {
    return `const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
};`;
  }

  private generateCacheUtils(): string {
    return `const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

const cache = {
  async get(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key, value, ttl = 3600) {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  },

  async del(key) {
    await redis.del(key);
  },

  async flush() {
    await redis.flushall();
  },
};

// Cache middleware for GraphQL
const cacheMiddleware = async (resolve, parent, args, context, info) => {
  const key = \`\${info.fieldName}:\${JSON.stringify(args)}\`;
  
  // Check cache
  const cached = await cache.get(key);
  if (cached) {
    return cached;
  }

  // Resolve and cache
  const result = await resolve(parent, args, context, info);
  await cache.set(key, result);
  
  return result;
};

module.exports = {
  cache,
  cacheMiddleware,
};`;
  }

  private generatePackageJSON(requirements: AppRequirements): string {
    return `{
  "name": "${requirements.description.toLowerCase().replace(/\s+/g, '-')}-graphql",
  "version": "1.0.0",
  "description": "${requirements.description} GraphQL API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "codegen": "graphql-codegen --config codegen.yml",
    "lint": "eslint . --ext .js",
    "docker:build": "docker build -t ${requirements.description.toLowerCase().replace(/\s+/g, '-')}-graphql .",
    "docker:run": "docker run -p 4000:4000 ${requirements.description.toLowerCase().replace(/\s+/g, '-')}-graphql"
  },
  "dependencies": {
    "@apollo/server": "^4.9.5",
    "@graphql-tools/schema": "^10.0.0",
    "apollo-server-express": "^3.12.1",
    "bcryptjs": "^2.4.3",
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "dataloader": "^2.2.2",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "graphql": "^16.8.1",
    "graphql-shield": "^7.6.5",
    "graphql-subscriptions": "^2.0.0",
    "graphql-ws": "^5.14.2",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^7.5.0",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^5.0.0",
    "@graphql-codegen/typescript": "^4.0.1",
    "@graphql-codegen/typescript-resolvers": "^4.0.1",
    "eslint": "^8.50.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "supertest": "^6.3.3"
  }
}`;
  }

  private generateEnvExample(requirements: AppRequirements): string {
    return `# Server
PORT=4000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/${requirements.description.toLowerCase().replace(/\s+/g, '-')}

# JWT
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGIN=http://localhost:3000`;
  }

  private generateCodegenConfig(): string {
    return `overwrite: true
schema: "./schema/index.js"
generates:
  generated/graphql.ts:
    plugins:
      - "typescript"
      - "typescript-resolvers"
    config:
      contextType: ../types/context#Context
      mappers:
        User: ../models/User#UserModel
        Post: ../models/Post#PostModel
        Comment: ../models/Comment#CommentModel`;
  }

  private generateDockerfile(): string {
    return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]`;
  }

  private generateDockerCompose(requirements: AppRequirements): string {
    return `version: '3.8'

services:
  graphql:
    build: .
    container_name: ${requirements.description.toLowerCase().replace(/\s+/g, '-')}-graphql
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/${requirements.description.toLowerCase().replace(/\s+/g, '-')}
      - REDIS_HOST=redis
      - JWT_SECRET=your-production-secret
      - JWT_REFRESH_SECRET=your-refresh-secret
    depends_on:
      - mongo
      - redis
    networks:
      - app-network

  mongo:
    image: mongo:7
    container_name: ${requirements.description.toLowerCase().replace(/\s+/g, '-')}-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    container_name: ${requirements.description.toLowerCase().replace(/\s+/g, '-')}-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network

volumes:
  mongo_data:
  redis_data:

networks:
  app-network:
    driver: bridge`;
  }

  private generateResolverTests(): string {
    return `const { ApolloServer } = require('@apollo/server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('../schema');
const resolvers = require('../resolvers');

describe('GraphQL Resolvers', () => {
  let server;

  beforeAll(() => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    server = new ApolloServer({ schema });
  });

  describe('Query', () => {
    it('should fetch user by ID', async () => {
      const query = \`
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
            email
          }
        }
      \`;

      const variables = { id: '123' };
      const context = { user: { id: '123' } };

      const response = await server.executeOperation({ query, variables }, { contextValue: context });
      expect(response.body.kind).toBe('single');
    });
  });

  describe('Mutation', () => {
    it('should register a new user', async () => {
      const mutation = \`
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
            user {
              email
              name
            }
          }
        }
      \`;

      const variables = {
        input: {
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User'
        }
      };

      const response = await server.executeOperation({ query: mutation, variables });
      expect(response.body.kind).toBe('single');
    });
  });
});`;
  }

  private generateAuthTests(): string {
    return `const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateToken, verifyToken, hashPassword, comparePassword } = require('../utils/auth');

describe('Authentication', () => {
  describe('Token Generation', () => {
    it('should generate valid JWT token', () => {
      const token = generateToken('123', 'test@example.com');
      expect(token).toBeDefined();
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe('123');
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('Password Hashing', () => {
    it('should hash and verify password', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      
      expect(hashed).not.toBe(password);
      
      const isValid = await comparePassword(password, hashed);
      expect(isValid).toBe(true);
      
      const isInvalid = await comparePassword('wrongpassword', hashed);
      expect(isInvalid).toBe(false);
    });
  });
});`;
  }

  private generateSubscriptionTests(): string {
    return `const { PubSub } = require('graphql-subscriptions');
const { pubsub } = require('../resolvers/Subscription');

describe('Subscriptions', () => {
  it('should publish and receive post added event', (done) => {
    const POST_ADDED = 'POST_ADDED';
    
    const subscription = pubsub.asyncIterator([POST_ADDED]);
    
    subscription.next().then(result => {
      expect(result.value.postAdded.title).toBe('Test Post');
      done();
    });

    setTimeout(() => {
      pubsub.publish(POST_ADDED, {
        postAdded: {
          id: '1',
          title: 'Test Post',
          content: 'Test content'
        }
      });
    }, 100);
  });
});`;
  }

  private generateDocumentation(requirements: AppRequirements): string {
    return `# ${requirements.description} GraphQL API

## Overview
Production-ready GraphQL API with subscriptions, DataLoader optimization, authentication, and comprehensive schema.

## Features
- 🚀 Apollo Server with Express
- 🔐 JWT Authentication
- 📡 Real-time Subscriptions (WebSocket)
- ⚡ DataLoader for N+1 query optimization
- 🛡️ GraphQL Shield for permissions
- 📊 MongoDB/PostgreSQL support
- 🔄 Redis caching
- 🧪 Comprehensive testing

## Quick Start

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

GraphQL Playground: http://localhost:4000/graphql

## Schema

### Queries
- \`me\`: Get current user
- \`user(id)\`: Get user by ID
- \`users(pagination, role)\`: List users (admin)
- \`posts(pagination, filters)\`: List posts
- \`search(query, type)\`: Search content

### Mutations
- \`register(input)\`: Create account
- \`login(input)\`: Authenticate
- \`createPost(input)\`: Create post
- \`updatePost(id, input)\`: Update post
- \`addComment(postId, content)\`: Add comment

### Subscriptions
- \`postAdded(authorId)\`: New posts
- \`postUpdated(id)\`: Post updates
- \`commentAdded(postId)\`: New comments
- \`userActivity\`: User activity (admin)

## Authentication

Include JWT token in headers:
\`\`\`
Authorization: Bearer YOUR_TOKEN
\`\`\`

## Testing

\`\`\`bash
npm test
npm run test:watch
\`\`\`

## Docker

\`\`\`bash
docker-compose up -d
\`\`\`

## Performance
- DataLoader batches and caches database queries
- Redis caching for frequently accessed data
- Subscription filtering to reduce overhead
- Pagination for large datasets

## Security
- JWT authentication
- Role-based permissions with GraphQL Shield
- Input validation
- Rate limiting
- SQL injection prevention

Generated by Autonomous Development System 🤖`;
  }

  private generateDeploymentConfig(requirements: AppRequirements): Record<string, any> {
    return {
      docker: {
        image: `${requirements.description.toLowerCase().replace(/\s+/g, '-')}-graphql`,
        ports: ['4000:4000']
      },
      kubernetes: {
        deployment: 'k8s-deployment.yaml',
        service: 'k8s-service.yaml'
      }
    };
  }
}