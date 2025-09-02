import { Agent, AgentTask, AgentResult } from '../src/types';

export default class BackendNodejsAgent implements Agent {
  id = 'backend-nodejs-agent';
  name = 'Backend Node.js Agent';
  type = 'backend';
  capabilities = ['nodejs', 'express', 'typescript', 'jwt', 'validation', 'api'];

  async initialize(): Promise<void> {
    // Initialize Node.js-specific resources
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { requirements } = task;
      
      const files = await this.generateNodeApp(requirements);
      
      return {
        success: true,
        data: {
          files,
          framework: 'express',
          runtime: 'nodejs',
          features: this.extractFeatures(requirements)
        },
        metadata: {
          generatedFiles: Object.keys(files).length,
          framework: 'express',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in Node.js agent'
      };
    }
  }

  private async generateNodeApp(requirements: any): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    // Package.json
    files['package.json'] = this.generatePackageJson(requirements);
    
    // TypeScript config
    files['tsconfig.json'] = this.generateTsConfig();
    
    // Environment config
    files['.env.example'] = this.generateEnvExample(requirements);
    
    // Main server file
    files['src/server.ts'] = this.generateServer(requirements);
    
    // App configuration
    files['src/app.ts'] = this.generateApp(requirements);
    
    // Database configuration
    files['src/config/database.ts'] = this.generateDatabaseConfig(requirements);
    
    // Middleware
    this.generateMiddleware(requirements, files);
    
    // Routes
    this.generateRoutes(requirements, files);
    
    // Controllers
    this.generateControllers(requirements, files);
    
    // Services
    this.generateServices(requirements, files);
    
    // Models
    this.generateModels(requirements, files);
    
    // Utils
    this.generateUtils(requirements, files);
    
    return files;
  }

  private generatePackageJson(requirements: any): string {
    const appName = requirements.description.split(' ').slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    const dependencies: Record<string, string> = {
      express: "^4.18.2",
      cors: "^2.8.5",
      helmet: "^7.1.0",
      dotenv: "^16.3.1",
      "express-rate-limit": "^7.1.5",
      bcryptjs: "^2.4.3",
      jsonwebtoken: "^9.0.2",
      zod: "^3.22.4",
      winston: "^3.11.0"
    };

    const devDependencies: Record<string, string> = {
      "@types/node": "^20.10.0",
      "@types/express": "^4.17.21",
      "@types/cors": "^2.8.17",
      "@types/bcryptjs": "^2.4.6",
      "@types/jsonwebtoken": "^9.0.5",
      typescript: "^5.3.3",
      "ts-node": "^10.9.1",
      "ts-node-dev": "^2.0.0",
      nodemon: "^3.0.2",
      jest: "^29.7.0",
      "@types/jest": "^29.5.8",
      "ts-jest": "^29.1.1",
      supertest: "^6.3.3",
      "@types/supertest": "^2.0.16"
    };

    // Add database dependencies
    if (requirements.techStack.database === 'postgresql') {
      dependencies.pg = "^8.11.3";
      dependencies.drizzle = "^0.29.1";
      devDependencies['@types/pg'] = "^8.10.9";
    } else if (requirements.techStack.database === 'mongodb') {
      dependencies.mongoose = "^8.0.3";
      devDependencies['@types/mongoose'] = "^5.11.97";
    } else if (requirements.techStack.database === 'sqlite') {
      dependencies['better-sqlite3'] = "^9.2.2";
      devDependencies['@types/better-sqlite3'] = "^7.6.8";
    }

    return JSON.stringify({
      name: appName,
      version: "1.0.0",
      description: requirements.description,
      main: "dist/server.js",
      scripts: {
        build: "tsc",
        start: "node dist/server.js",
        dev: "ts-node-dev --respawn --transpile-only src/server.ts",
        test: "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage",
        lint: "eslint src --ext .ts",
        "lint:fix": "eslint src --ext .ts --fix"
      },
      keywords: ["api", "nodejs", "express", "typescript"],
      author: "ORCHESTRATOR-ALPHA",
      license: "MIT",
      dependencies,
      devDependencies,
      engines: {
        node: ">=18.0.0"
      }
    }, null, 2);
  }

  private generateTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022"],
        module: "commonjs",
        rootDir: "./src",
        outDir: "./dist",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        removeComments: false,
        noImplicitAny: true,
        noImplicitReturns: true,
        noImplicitThis: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        exactOptionalPropertyTypes: true,
        noImplicitOverride: true,
        noPropertyAccessFromIndexSignature: true,
        noUncheckedIndexedAccess: true,
        resolveJsonModule: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        baseUrl: "./src",
        paths: {
          "@/*": ["./*"]
        }
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist", "**/*.test.ts"]
    }, null, 2);
  }

  private generateEnvExample(requirements: any): string {
    const vars = [
      'NODE_ENV=development',
      'PORT=3001',
      'JWT_SECRET=your-super-secret-jwt-key-here-change-in-production',
      'JWT_EXPIRES_IN=24h',
      'CORS_ORIGIN=http://localhost:3000'
    ];

    if (requirements.techStack.database === 'postgresql') {
      vars.push(
        'DATABASE_URL=postgresql://username:password@localhost:5432/database',
        'DB_HOST=localhost',
        'DB_PORT=5432',
        'DB_USER=username',
        'DB_PASSWORD=password',
        'DB_NAME=database'
      );
    } else if (requirements.techStack.database === 'mongodb') {
      vars.push('MONGODB_URI=mongodb://localhost:27017/database');
    } else if (requirements.techStack.database === 'sqlite') {
      vars.push('SQLITE_PATH=./database.sqlite');
    }

    return vars.join('\n') + '\n';
  }

  private generateServer(requirements: any): string {
    return `import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');
    
    // Create Express app
    const app = createApp();
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(\`Server is running on port \${PORT}\`);
      logger.info(\`Environment: \${process.env.NODE_ENV || 'development'}\`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();`;
  }

  private generateApp(requirements: any): string {
    const hasAuth = requirements.features.some((f: string) => f.toLowerCase().includes('auth'));
    
    return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { routes } from './routes';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // API routes
  app.use('/api', routes);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: \`Route \${req.originalUrl} not found\`
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  logger.info('Express app configured successfully');
  
  return app;
}`;
  }

  private generateDatabaseConfig(requirements: any): string {
    const database = requirements.techStack.database;
    
    if (database === 'postgresql') {
      return `import { Pool } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool;

export async function connectDatabase(): Promise<void> {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test the connection
    await pool.query('SELECT NOW()');
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

export function getDb(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('PostgreSQL connection closed');
  }
}`;
    } else if (database === 'mongodb') {
      return `import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB connection closed');
}`;
    } else {
      return `import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../utils/logger';

let db: Database.Database;

export async function connectDatabase(): Promise<void> {
  try {
    const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'database.sqlite');
    db = new Database(dbPath);
    
    // Enable WAL mode for better performance
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    
    logger.info('SQLite connected successfully');
  } catch (error) {
    logger.error('Failed to connect to SQLite:', error);
    throw error;
  }
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close();
    logger.info('SQLite connection closed');
  }
}`;
    }
  }

  private generateMiddleware(requirements: any, files: Record<string, string>): void {
    // Error handler middleware
    files['src/middleware/errorHandler.ts'] = `import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 
      (statusCode < 500 ? message : 'Internal Server Error') : 
      message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

export function createError(message: string, statusCode: number = 500): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}`;

    // Request logger middleware
    files['src/middleware/requestLogger.ts'] = `import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: \`\${duration}ms\`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}`;

    // Auth middleware (if auth features are present)
    const hasAuth = requirements.features.some((f: string) => f.toLowerCase().includes('auth'));
    if (hasAuth) {
      files['src/middleware/auth.ts'] = `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(createError('Access token required', 401));
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next(createError('JWT secret not configured', 500));
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return next(createError('Invalid or expired token', 403));
    }

    req.user = decoded as AuthenticatedRequest['user'];
    next();
  });
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (req.user.role !== role) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
}`;
    }

    // Validation middleware
    files['src/middleware/validation.ts'] = `import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { createError } from './errorHandler';

export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors.map(e => \`\${e.path.join('.')}: \${e.message}\`).join(', ');
        next(createError(\`Validation error: \${message}\`, 400));
      } else {
        next(error);
      }
    }
  };
}`;
  }

  private generateRoutes(requirements: any, files: Record<string, string>): void {
    const hasAuth = requirements.features.some((f: string) => f.toLowerCase().includes('auth'));
    
    // Main routes index
    files['src/routes/index.ts'] = `import { Router } from 'express';
${hasAuth ? "import { authRoutes } from './auth';" : ''}
import { userRoutes } from './users';
import { healthRoutes } from './health';

const router = Router();

${hasAuth ? "router.use('/auth', authRoutes);" : ''}
router.use('/users', userRoutes);
router.use('/health', healthRoutes);

export { router as routes };`;

    // Health routes
    files['src/routes/health.ts'] = `import { Router } from 'express';
import { healthController } from '../controllers/healthController';

const router = Router();

router.get('/', healthController.check);
router.get('/detailed', healthController.detailed);

export { router as healthRoutes };`;

    // User routes
    files['src/routes/users.ts'] = `import { Router } from 'express';
import { userController } from '../controllers/userController';
${hasAuth ? "import { authenticateToken } from '../middleware/auth';" : ''}
import { validateRequest } from '../middleware/validation';
import { createUserSchema, updateUserSchema, getUserSchema } from '../schemas/userSchemas';

const router = Router();

${hasAuth ? 'router.use(authenticateToken);' : ''}

router.get('/', userController.getAll);
router.get('/:id', validateRequest({ params: getUserSchema }), userController.getById);
router.post('/', validateRequest({ body: createUserSchema }), userController.create);
router.put('/:id', validateRequest({ params: getUserSchema, body: updateUserSchema }), userController.update);
router.delete('/:id', validateRequest({ params: getUserSchema }), userController.delete);

export { router as userRoutes };`;

    // Auth routes (if auth is enabled)
    if (hasAuth) {
      files['src/routes/auth.ts'] = `import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validateRequest } from '../middleware/validation';
import { loginSchema, registerSchema } from '../schemas/authSchemas';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', validateRequest({ body: loginSchema }), authController.login);
router.post('/register', validateRequest({ body: registerSchema }), authController.register);
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.me);
router.post('/refresh', authController.refresh);

export { router as authRoutes };`;
    }
  }

  private generateControllers(requirements: any, files: Record<string, string>): void {
    const hasAuth = requirements.features.some((f: string) => f.toLowerCase().includes('auth'));

    // Health controller
    files['src/controllers/healthController.ts'] = `import { Request, Response, NextFunction } from 'express';

class HealthController {
  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      next(error);
    }
  }

  async detailed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: \`\${Math.round(memoryUsage.rss / 1024 / 1024)}MB\`,
          heapTotal: \`\${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB\`,
          heapUsed: \`\${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB\`,
          external: \`\${Math.round(memoryUsage.external / 1024 / 1024)}MB\`
        },
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
    } catch (error) {
      next(error);
    }
  }
}

export const healthController = new HealthController();`;

    // User controller
    files['src/controllers/userController.ts'] = `import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { createError } from '../middleware/errorHandler';

class UserController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const users = await userService.findAll({ offset, limit });
      const total = await userService.count();

      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userService.findById(id);

      if (!user) {
        return next(createError('User not found', 404));
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData = req.body;
      const user = await userService.create(userData);

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userData = req.body;

      const user = await userService.update(id, userData);
      if (!user) {
        return next(createError('User not found', 404));
      }

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await userService.delete(id);

      if (!deleted) {
        return next(createError('User not found', 404));
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();`;

    // Auth controller (if auth is enabled)
    if (hasAuth) {
      files['src/controllers/authController.ts'] = `import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData = req.body;
      const result = await authService.register(userData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful'
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a real implementation, you might want to blacklist the token
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(createError('User not authenticated', 401));
      }

      const user = await authService.getUserById(req.user.id);
      if (!user) {
        return next(createError('User not found', 404));
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return next(createError('Refresh token required', 400));
      }

      const result = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();`;
    }
  }

  private generateServices(requirements: any, files: Record<string, string>): void {
    // User service
    files['src/services/userService.ts'] = `import bcrypt from 'bcryptjs';
import { createError } from '../middleware/errorHandler';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  password?: string;
}

class UserService {
  async findAll({ offset = 0, limit = 10 }: { offset?: number; limit?: number } = {}): Promise<User[]> {
    // TODO: Implement database query
    // This is a placeholder - replace with actual database implementation
    return [];
  }

  async count(): Promise<number> {
    // TODO: Implement database query
    return 0;
  }

  async findById(id: string): Promise<User | null> {
    // TODO: Implement database query
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // TODO: Implement database query
    return null;
  }

  async create(data: CreateUserData): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw createError('User with this email already exists', 409);
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // TODO: Implement database insert
    // This is a placeholder - replace with actual database implementation
    const user: User = {
      id: 'generated-id',
      email: data.email,
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return user;
  }

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    const updateData: any = { ...data };
    
    if (data.password) {
      const saltRounds = 12;
      updateData.passwordHash = await bcrypt.hash(data.password, saltRounds);
      delete updateData.password;
    }

    updateData.updatedAt = new Date();

    // TODO: Implement database update
    return { ...user, ...updateData };
  }

  async delete(id: string): Promise<boolean> {
    const user = await this.findById(id);
    if (!user) {
      return false;
    }

    // TODO: Implement database delete
    return true;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    // TODO: Get passwordHash from database
    const passwordHash = 'stored-hash';
    return bcrypt.compare(password, passwordHash);
  }
}

export const userService = new UserService();`;

    // Auth service (if auth is enabled)
    const hasAuth = requirements.features.some((f: string) => f.toLowerCase().includes('auth'));
    if (hasAuth) {
      files['src/services/authService.ts'] = `import jwt from 'jsonwebtoken';
import { userService, CreateUserData, User } from './userService';
import { createError } from '../middleware/errorHandler';

export interface LoginResult {
  user: Omit<User, 'passwordHash'>;
  token: string;
  refreshToken: string;
}

export interface RegisterData extends CreateUserData {
  confirmPassword: string;
}

class AuthService {
  private generateTokens(userId: string): { token: string; refreshToken: string } {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    if (!jwtSecret) {
      throw createError('JWT secret not configured', 500);
    }

    const token = jwt.sign(
      { id: userId },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { id: userId, type: 'refresh' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return { token, refreshToken };
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await userService.findByEmail(email);
    if (!user) {
      throw createError('Invalid credentials', 401);
    }

    const isValidPassword = await userService.verifyPassword(user, password);
    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }

    const { token, refreshToken } = this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token,
      refreshToken
    };
  }

  async register(data: RegisterData): Promise<LoginResult> {
    if (data.password !== data.confirmPassword) {
      throw createError('Passwords do not match', 400);
    }

    if (data.password.length < 6) {
      throw createError('Password must be at least 6 characters long', 400);
    }

    const userData: CreateUserData = {
      email: data.email,
      name: data.name,
      password: data.password
    };

    const user = await userService.create(userData);
    const { token, refreshToken } = this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token,
      refreshToken
    };
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      throw createError('JWT secret not configured', 500);
    }

    try {
      const decoded = jwt.verify(refreshToken, jwtSecret) as any;
      
      if (decoded.type !== 'refresh') {
        throw createError('Invalid refresh token', 401);
      }

      const user = await userService.findById(decoded.id);
      if (!user) {
        throw createError('User not found', 404);
      }

      return this.generateTokens(user.id);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid refresh token', 401);
      }
      throw error;
    }
  }

  async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await userService.findById(id);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

export const authService = new AuthService();`;
    }
  }

  private generateModels(requirements: any, files: Record<string, string>): void {
    // Database models would go here based on the database type
    // This is handled by the database-specific agents
  }

  private generateUtils(requirements: any, files: Record<string, string>): void {
    // Logger utility
    files['src/utils/logger.ts'] = `import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// If not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}`;

    // Validation schemas
    files['src/schemas/userSchemas.ts'] = `import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional()
});

export const getUserSchema = z.object({
  id: z.string().uuid('Invalid user ID format')
});`;

    // Auth schemas (if auth is enabled)
    const hasAuth = requirements.features.some((f: string) => f.toLowerCase().includes('auth'));
    if (hasAuth) {
      files['src/schemas/authSchemas.ts'] = `import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});`;
    }
  }

  private extractFeatures(requirements: any): string[] {
    const features = ['REST API', 'Error Handling', 'Request Validation', 'Logging'];
    
    if (requirements.features.some((f: string) => f.toLowerCase().includes('auth'))) {
      features.push('JWT Authentication', 'Password Hashing');
    }
    
    if (requirements.techStack.database) {
      features.push('Database Integration');
    }
    
    features.push('Health Checks', 'CORS Support', 'Rate Limiting', 'Security Headers');
    
    return features;
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}