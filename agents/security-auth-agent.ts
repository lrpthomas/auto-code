import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export default class SecurityAuthAgent implements Agent {
  id = 'security-auth-agent';
  name = 'Security & Authentication Agent';
  type = 'security';
  description = 'Implements comprehensive security measures, authentication, and authorization systems';
  capabilities = ['jwt-auth', 'oauth-integration', 'rate-limiting', 'input-validation', 'security-headers', 'encryption'];
  version = '2.0.0';

  private securityConfig: any = {};
  private authProviders: string[] = ['local', 'google', 'github', 'microsoft'];

  async initialize(): Promise<void> {
    this.securityConfig = {
      jwtSecret: process.env.JWT_SECRET || this.generateSecureKey(),
      bcryptRounds: 12,
      sessionTimeout: '24h',
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      rateLimits: {
        general: { windowMs: 15 * 60 * 1000, max: 100 },
        auth: { windowMs: 15 * 60 * 1000, max: 5 },
        api: { windowMs: 15 * 60 * 1000, max: 1000 }
      }
    };
    console.log('Security & Authentication Agent initialized');
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const requirements = task.requirements;
    const context = task.context || {};
    
    try {
      const securityImplementation = await this.generateSecuritySystem(requirements, context);
      
      return {
        success: true,
        data: securityImplementation,
        metadata: {
          agent: this.id,
          timestamp: new Date(),
          securityLevel: 'enterprise',
          authMethods: this.detectRequiredAuthMethods(requirements),
          compliance: ['GDPR', 'CCPA', 'SOC2']
        }
      };
    } catch (error) {
      console.error('Security implementation failed:', error);
      throw error;
    }
  }

  private async generateSecuritySystem(requirements: AppRequirements, context: any): Promise<any> {
    const authType = this.detectAuthType(requirements);
    const securityLevel = this.assessSecurityLevel(requirements);
    
    return {
      authentication: this.generateAuthSystem(authType, requirements),
      authorization: this.generateAuthorizationSystem(requirements),
      middleware: this.generateSecurityMiddleware(),
      validation: this.generateInputValidation(),
      encryption: this.generateEncryptionUtils(),
      rateLimiting: this.generateRateLimiting(),
      headers: this.generateSecurityHeaders(),
      session: this.generateSessionManagement(),
      oauth: this.generateOAuthConfig(requirements),
      monitoring: this.generateSecurityMonitoring(),
      config: this.generateSecurityConfig(securityLevel)
    };
  }

  private generateAuthSystem(authType: string, requirements: AppRequirements): string {
    const appName = requirements.description.replace(/\s+/g, '');
    
    return `// Authentication System for ${requirements.description}
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

interface User {
  id: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
}

interface AuthRequest extends Request {
  user?: User;
}

export class AuthService {
  private jwtSecret: string;
  private bcryptRounds: number = 12;
  private maxLoginAttempts: number = 5;
  private lockoutDuration: number = 15 * 60 * 1000;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || '${this.generateSecureKey()}';
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not set, using generated key (not recommended for production)');
    }
  }

  /**
   * Register a new user with secure password hashing
   */
  async register(email: string, password: string, role: string = 'user'): Promise<{ success: boolean; user?: Partial<User>; error?: string }> {
    try {
      // Input validation
      if (!this.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }
      
      if (!this.isValidPassword(password)) {
        return { success: false, error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' };
      }

      // Check if user exists
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      // Hash password
      const saltRounds = this.bcryptRounds;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user: User = {
        id: this.generateUserId(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        isActive: true,
        loginAttempts: 0
      };

      await this.saveUser(user);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Authenticate user with rate limiting and lockout protection
   */
  async login(email: string, password: string): Promise<{ success: boolean; token?: string; user?: Partial<User>; error?: string }> {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > new Date()) {
        const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
        return { success: false, error: \`Account locked. Try again in \${remainingTime} minutes\` };
      }

      // Check if account is active
      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        await this.handleFailedLogin(user);
        return { success: false, error: 'Invalid credentials' };
      }

      // Reset login attempts and update last login
      await this.handleSuccessfulLogin(user);

      // Generate JWT token
      const token = this.generateJWT(user);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, token, user: userWithoutPassword };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): { valid: boolean; user?: any; error?: string } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return { valid: true, user: decoded };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' };
      }
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Middleware to protect routes
   */
  authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const verification = this.verifyToken(token);

      if (!verification.valid) {
        return res.status(401).json({ error: verification.error });
      }

      req.user = verification.user;
      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  /**
   * Middleware to check user roles
   */
  authorize = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  };

  // Private helper methods
  private generateJWT(user: User): string {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      this.jwtSecret,
      { 
        expiresIn: '24h',
        issuer: '${appName}',
        audience: '${appName}-users'
      }
    );
  }

  private generateUserId(): string {
    return 'user_' + crypto.randomBytes(16).toString('hex');
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  private async handleFailedLogin(user: User): Promise<void> {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    
    if (user.loginAttempts >= this.maxLoginAttempts) {
      user.lockUntil = new Date(Date.now() + this.lockoutDuration);
      console.warn(\`User \${user.email} locked due to too many failed attempts\`);
    }
    
    await this.updateUser(user);
  }

  private async handleSuccessfulLogin(user: User): Promise<void> {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await this.updateUser(user);
  }

  // Database methods (implement based on your database choice)
  private async findUserByEmail(email: string): Promise<User | null> {
    // TODO: Implement database lookup
    return null;
  }

  private async saveUser(user: User): Promise<void> {
    // TODO: Implement database save
  }

  private async updateUser(user: User): Promise<void> {
    // TODO: Implement database update
  }
}

// Rate limiting configurations
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests, please try again later'
  }
});`;
  }

  private generateAuthorizationSystem(requirements: AppRequirements): string {
    return `// Role-Based Access Control (RBAC) System
interface Permission {
  resource: string;
  action: string;
  conditions?: any;
}

interface Role {
  name: string;
  permissions: Permission[];
  inherits?: string[];
}

export class AuthorizationService {
  private roles: Map<string, Role> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  /**
   * Check if user has permission to perform action on resource
   */
  hasPermission(userRole: string, resource: string, action: string): boolean {
    const role = this.roles.get(userRole);
    if (!role) return false;

    return this.checkRolePermissions(role, resource, action);
  }

  /**
   * Get all permissions for a role (including inherited)
   */
  getRolePermissions(roleName: string): Permission[] {
    const role = this.roles.get(roleName);
    if (!role) return [];

    const permissions = [...role.permissions];
    
    // Add inherited permissions
    if (role.inherits) {
      for (const inheritedRole of role.inherits) {
        permissions.push(...this.getRolePermissions(inheritedRole));
      }
    }

    return permissions;
  }

  /**
   * Middleware to check resource permissions
   */
  requirePermission = (resource: string, action: string) => {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!this.hasPermission(req.user.role, resource, action)) {
        return res.status(403).json({ 
          error: \`Insufficient permissions: cannot \${action} \${resource}\`
        });
      }

      next();
    };
  };

  private checkRolePermissions(role: Role, resource: string, action: string): boolean {
    // Check direct permissions
    const hasDirectPermission = role.permissions.some(p => 
      (p.resource === resource || p.resource === '*') && 
      (p.action === action || p.action === '*')
    );

    if (hasDirectPermission) return true;

    // Check inherited permissions
    if (role.inherits) {
      return role.inherits.some(inheritedRole => {
        const parentRole = this.roles.get(inheritedRole);
        return parentRole ? this.checkRolePermissions(parentRole, resource, action) : false;
      });
    }

    return false;
  }

  private initializeDefaultRoles(): void {
    // Super Admin - full access
    this.roles.set('superadmin', {
      name: 'superadmin',
      permissions: [
        { resource: '*', action: '*' }
      ]
    });

    // Admin - most operations
    this.roles.set('admin', {
      name: 'admin',
      permissions: [
        { resource: 'users', action: '*' },
        { resource: 'content', action: '*' },
        { resource: 'system', action: 'read' },
        { resource: 'reports', action: '*' }
      ]
    });

    // Moderator - content management
    this.roles.set('moderator', {
      name: 'moderator',
      permissions: [
        { resource: 'content', action: 'read' },
        { resource: 'content', action: 'update' },
        { resource: 'content', action: 'delete' },
        { resource: 'users', action: 'read' },
        { resource: 'reports', action: 'read' }
      ]
    });

    // User - basic operations
    this.roles.set('user', {
      name: 'user',
      permissions: [
        { resource: 'profile', action: 'read' },
        { resource: 'profile', action: 'update' },
        { resource: 'content', action: 'create' },
        { resource: 'content', action: 'read' }
      ]
    });

    // Guest - read-only
    this.roles.set('guest', {
      name: 'guest',
      permissions: [
        { resource: 'content', action: 'read' }
      ]
    });
  }
}`;
  }

  private generateSecurityMiddleware(): string {
    return `// Security Middleware Collection
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS configuration
 */
export const corsConfig = cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});

/**
 * Request logging
 */
export const requestLogger = morgan('combined', {
  skip: (req: Request) => req.url === '/health'
});

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({ error: 'Invalid input data' });
  }
};

/**
 * API key validation middleware
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.API_KEYS?.split(',') || [];
  
  if (!apiKey || !validApiKeys.includes(apiKey as string)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  
  next();
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > parseSize(maxSize)) {
      return res.status(413).json({ error: 'Request entity too large' });
    }
    next();
  };
};

// Helper functions
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/<script[^>]*>.*?<\\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\\w+=/gi, '');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\\d+)([kmg]?b)$/);
  if (!match) return 0;
  
  return parseInt(match[1]) * units[match[2]];
}`;
  }

  private generateInputValidation(): string {
    return `// Input Validation Utilities
import validator from 'validator';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'url' | 'date' | 'boolean';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate data against rules
 */
export function validateData(data: any, rules: ValidationRule[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const value = data[rule.field];
    
    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: rule.field, message: \`\${rule.field} is required\` });
      continue;
    }
    
    // Skip validation if field is optional and empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rule.type) {
      const typeError = validateType(value, rule.type, rule.field);
      if (typeError) errors.push(typeError);
    }

    // Length validation
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({ 
          field: rule.field, 
          message: \`\${rule.field} must be at least \${rule.minLength} characters\` 
        });
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({ 
          field: rule.field, 
          message: \`\${rule.field} must not exceed \${rule.maxLength} characters\` 
        });
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push({ field: rule.field, message: \`\${rule.field} format is invalid\` });
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        const message = typeof customResult === 'string' ? customResult : \`\${rule.field} is invalid\`;
        errors.push({ field: rule.field, message });
      }
    }
  }

  return errors;
}

function validateType(value: any, type: string, field: string): ValidationError | null {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { field, message: \`\${field} must be a string\` };
      }
      break;
    
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { field, message: \`\${field} must be a valid number\` };
      }
      break;
    
    case 'email':
      if (!validator.isEmail(value)) {
        return { field, message: \`\${field} must be a valid email address\` };
      }
      break;
    
    case 'url':
      if (!validator.isURL(value)) {
        return { field, message: \`\${field} must be a valid URL\` };
      }
      break;
    
    case 'date':
      if (!validator.isDate(value)) {
        return { field, message: \`\${field} must be a valid date\` };
      }
      break;
    
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { field, message: \`\${field} must be a boolean\` };
      }
      break;
  }
  
  return null;
}

/**
 * Common validation rules
 */
export const commonValidationRules = {
  email: {
    field: 'email',
    required: true,
    type: 'email' as const,
    maxLength: 320
  },
  
  password: {
    field: 'password',
    required: true,
    type: 'string' as const,
    minLength: 8,
    custom: (value: string) => {
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /\\d/.test(value);
      const hasSpecial = /[@$!%*?&]/.test(value);
      
      if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        return 'Password must contain uppercase, lowercase, number, and special character';
      }
      return true;
    }
  },
  
  username: {
    field: 'username',
    required: true,
    type: 'string' as const,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/
  }
};

/**
 * Express middleware for validation
 */
export const validateRequest = (rules: ValidationRule[]) => {
  return (req: any, res: any, next: any) => {
    const errors = validateData(req.body, rules);
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
};`;
  }

  private generateEncryptionUtils(): string {
    return `// Encryption and Hashing Utilities
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;

  /**
   * Generate a secure random key
   */
  generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  encrypt(text: string, key: string): { encrypted: string; iv: string; tag: string } {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, keyBuffer);
    cipher.setAAD(Buffer.from('additional-data'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, keyBuffer);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from('additional-data'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: Invalid data or key');
    }
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string, saltRounds: number = 12): Promise<string> {
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create HMAC signature
   */
  createHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate UUID v4
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash data with SHA-256
   */
  sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const encryption = new EncryptionService();`;
  }

  private generateRateLimiting(): string {
    return `// Advanced Rate Limiting Configuration
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Redis client for distributed rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Authentication rate limiter - stricter limits
 */
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  }
});

/**
 * Heavy operation rate limiter
 */
export const heavyOperationLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 heavy operations per hour
  message: {
    error: 'Too many heavy operations, please try again later.',
    retryAfter: 60 * 60
  }
});

/**
 * Per-user rate limiter
 */
export const createUserLimiter = (maxRequests: number, windowMinutes: number) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req) => {
      return req.user?.id || req.ip; // Use user ID if authenticated, otherwise IP
    },
    message: {
      error: 'User rate limit exceeded',
      retryAfter: windowMinutes * 60
    }
  });
};

/**
 * Adaptive rate limiter based on server load
 */
export const adaptiveLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (req) => {
    // Adjust limits based on server load
    const cpuUsage = process.cpuUsage().system / 1000000; // Convert to percentage
    if (cpuUsage > 80) return 10;  // Very restrictive when high load
    if (cpuUsage > 60) return 50;  // Moderate restriction
    return 200; // Normal limits when low load
  },
  message: {
    error: 'Server is under high load, please try again later.'
  }
});`;
  }

  private generateSecurityHeaders(): string {
    return `// Security Headers Configuration
export const securityHeadersConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Consider removing in production
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      scriptSrc: [
        "'self'",
        // Add specific CDN domains as needed
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      connectSrc: [
        "'self'",
        "https://api.example.com" // Add your API domains
      ],
      upgradeInsecureRequests: []
    },
    reportOnly: process.env.NODE_ENV !== 'production'
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options
  noSniff: true,

  // Referrer Policy
  referrerPolicy: {
    policy: ['no-referrer', 'strict-origin-when-cross-origin']
  },

  // Permissions Policy
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'self'"],
      payment: ["'none'"],
      usb: ["'none'"]
    }
  }
};`;
  }

  private generateSessionManagement(): string {
    return `// Session Management Configuration
import session from 'express-session';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

export const sessionConfig = session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET || '${this.generateSecureKey()}',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  },
  name: 'sessionId', // Don't use default session name
});

/**
 * Session-based authentication middleware
 */
export const requireSession = (req: any, res: any, next: any) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Session cleanup utility
 */
export const cleanupSessions = async () => {
  try {
    // Clean up expired sessions from Redis
    const keys = await redis.keys('sess:*');
    const expiredKeys = [];
    
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        expiredKeys.push(key);
      }
    }
    
    if (expiredKeys.length > 0) {
      await redis.del(...expiredKeys);
      console.log(\`Cleaned up \${expiredKeys.length} expired sessions\`);
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
};`;
  }

  private generateOAuthConfig(requirements: AppRequirements): string {
    return `// OAuth 2.0 Configuration
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';

/**
 * OAuth Providers Configuration
 */
export class OAuthService {
  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Google OAuth
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
      }, this.handleOAuthCallback));
    }

    // GitHub OAuth
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: '/auth/github/callback'
      }, this.handleOAuthCallback));
    }

    // Microsoft OAuth
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      passport.use(new MicrosoftStrategy({
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: '/auth/microsoft/callback',
        scope: ['user.read']
      }, this.handleOAuthCallback));
    }

    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        // TODO: Fetch user from database
        const user = await this.findUserById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  private handleOAuthCallback = async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      // Check if user exists
      let user = await this.findUserByProvider(profile.provider, profile.id);
      
      if (!user) {
        // Create new user
        user = await this.createOAuthUser(profile, accessToken, refreshToken);
      } else {
        // Update existing user
        await this.updateOAuthUser(user.id, accessToken, refreshToken);
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  };

  /**
   * Generate OAuth state parameter for CSRF protection
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate OAuth state parameter
   */
  validateState(sessionState: string, receivedState: string): boolean {
    return sessionState === receivedState;
  }

  // Database methods (implement based on your database choice)
  private async findUserById(id: string): Promise<any> {
    // TODO: Implement database lookup
    return null;
  }

  private async findUserByProvider(provider: string, providerId: string): Promise<any> {
    // TODO: Implement database lookup
    return null;
  }

  private async createOAuthUser(profile: any, accessToken: string, refreshToken?: string): Promise<any> {
    // TODO: Implement user creation
    const user = {
      id: this.generateUserId(),
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      provider: profile.provider,
      providerId: profile.id,
      avatar: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
      createdAt: new Date()
    };
    
    return user;
  }

  private async updateOAuthUser(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    // TODO: Implement token update
  }

  private generateUserId(): string {
    return 'oauth_' + crypto.randomBytes(16).toString('hex');
  }
}

/**
 * OAuth routes
 */
export const oauthRoutes = {
  // Google
  '/auth/google': passport.authenticate('google', { scope: ['profile', 'email'] }),
  '/auth/google/callback': passport.authenticate('google', { 
    successRedirect: '/dashboard',
    failureRedirect: '/login?error=oauth_failed'
  }),

  // GitHub  
  '/auth/github': passport.authenticate('github', { scope: ['user:email'] }),
  '/auth/github/callback': passport.authenticate('github', {
    successRedirect: '/dashboard', 
    failureRedirect: '/login?error=oauth_failed'
  }),

  // Microsoft
  '/auth/microsoft': passport.authenticate('microsoft'),
  '/auth/microsoft/callback': passport.authenticate('microsoft', {
    successRedirect: '/dashboard',
    failureRedirect: '/login?error=oauth_failed'
  })
};`;
  }

  private generateSecurityMonitoring(): string {
    return `// Security Monitoring and Logging
import winston from 'winston';

/**
 * Security event logger
 */
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.File({ filename: 'logs/security-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security-combined.log' })
  ]
});

/**
 * Security event types
 */
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  ACCOUNT_LOCKED = 'account_locked',
  PASSWORD_RESET = 'password_reset',
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  TOKEN_EXPIRED = 'token_expired',
  INVALID_TOKEN = 'invalid_token'
}

/**
 * Security monitoring service
 */
export class SecurityMonitor {
  private suspiciousThreshold = 5;
  private timeWindow = 5 * 60 * 1000; // 5 minutes

  /**
   * Log security event
   */
  logEvent(eventType: SecurityEventType, details: any, req?: any): void {
    const logData = {
      eventType,
      timestamp: new Date().toISOString(),
      ip: req?.ip || 'unknown',
      userAgent: req?.get('User-Agent') || 'unknown',
      userId: req?.user?.id || 'anonymous',
      ...details
    };

    securityLogger.info('Security Event', logData);

    // Check for suspicious activity
    this.checkSuspiciousActivity(logData);
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(logData: any): Promise<void> {
    const { eventType, ip, userId } = logData;
    
    // Count recent failed login attempts from same IP
    if (eventType === SecurityEventType.LOGIN_FAILURE) {
      const recentFailures = await this.countRecentEvents(
        SecurityEventType.LOGIN_FAILURE, 
        { ip }, 
        this.timeWindow
      );

      if (recentFailures >= this.suspiciousThreshold) {
        this.logEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
          reason: 'Multiple failed logins from same IP',
          ip,
          count: recentFailures
        });
        
        // Consider implementing automatic IP blocking here
        await this.handleSuspiciousIP(ip);
      }
    }

    // Monitor permission denied events
    if (eventType === SecurityEventType.PERMISSION_DENIED) {
      const recentDenials = await this.countRecentEvents(
        SecurityEventType.PERMISSION_DENIED,
        { userId },
        this.timeWindow
      );

      if (recentDenials >= this.suspiciousThreshold) {
        this.logEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
          reason: 'Multiple permission denials',
          userId,
          count: recentDenials
        });
      }
    }
  }

  /**
   * Count recent security events
   */
  private async countRecentEvents(eventType: SecurityEventType, filters: any, timeWindow: number): Promise<number> {
    // TODO: Implement with your logging/database solution
    // This would query your logs or database for recent events matching the criteria
    return 0;
  }

  /**
   * Handle suspicious IP address
   */
  private async handleSuspiciousIP(ip: string): Promise<void> {
    // TODO: Implement IP blocking logic
    // Could add to Redis blacklist, notify administrators, etc.
    console.warn(\`Suspicious activity detected from IP: \${ip}\`);
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(timeRange: { start: Date; end: Date }): Promise<any> {
    // TODO: Implement security reporting
    return {
      period: timeRange,
      events: {
        totalEvents: 0,
        loginAttempts: 0,
        failedLogins: 0,
        suspiciousActivity: 0,
        blockedRequests: 0
      },
      topIPs: [],
      recommendations: []
    };
  }
}

export const securityMonitor = new SecurityMonitor();`;
  }

  private generateSecurityConfig(securityLevel: string): string {
    return `// Security Configuration
export const securityConfig = {
  // Authentication settings
  auth: {
    jwtSecret: process.env.JWT_SECRET || '${this.generateSecureKey()}',
    jwtExpiresIn: '24h',
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordResetExpiry: 60 * 60 * 1000, // 1 hour
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Rate limiting
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: ${securityLevel === 'high' ? 50 : 100}
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: ${securityLevel === 'high' ? 500 : 1000}
    }
  },

  // CORS settings
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  },

  // Security headers
  headers: {
    contentSecurityPolicy: true,
    hsts: true,
    noSniff: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' }
  },

  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16
  },

  // Monitoring
  monitoring: {
    logSecurityEvents: true,
    suspiciousActivityThreshold: 5,
    autoBlockSuspiciousIPs: ${securityLevel === 'high'},
    alertAdministrators: true
  },

  // Environment-specific settings
  production: {
    enforceHttps: true,
    secureSessionCookies: true,
    hidePoweredBy: true,
    trustProxy: false
  }
};

// Validate security configuration on startup
export function validateSecurityConfig(): void {
  const errors = [];

  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    errors.push('JWT_SECRET must be set in production');
  }

  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    errors.push('SESSION_SECRET must be set in production');
  }

  if (errors.length > 0) {
    throw new Error('Security configuration errors: ' + errors.join(', '));
  }

  console.log('✅ Security configuration validated');
}`;
  }

  private detectAuthType(requirements: AppRequirements): string {
    const features = requirements.features || [];
    const hasUserAuth = features.some(f => 
      f.toLowerCase().includes('login') || 
      f.toLowerCase().includes('auth') || 
      f.toLowerCase().includes('user')
    );
    
    const hasOAuth = features.some(f => 
      f.toLowerCase().includes('google') || 
      f.toLowerCase().includes('github') || 
      f.toLowerCase().includes('social')
    );

    if (hasOAuth) return 'oauth';
    if (hasUserAuth) return 'jwt';
    return 'basic';
  }

  private detectRequiredAuthMethods(requirements: AppRequirements): string[] {
    const features = requirements.features || [];
    const methods = [];

    if (features.some(f => f.toLowerCase().includes('login') || f.toLowerCase().includes('auth'))) {
      methods.push('jwt');
    }
    
    if (features.some(f => f.toLowerCase().includes('google'))) {
      methods.push('google-oauth');
    }
    
    if (features.some(f => f.toLowerCase().includes('github'))) {
      methods.push('github-oauth');
    }

    return methods.length > 0 ? methods : ['basic'];
  }

  private assessSecurityLevel(requirements: AppRequirements): string {
    const features = requirements.features || [];
    const hasPayment = features.some(f => f.toLowerCase().includes('payment'));
    const hasUserData = features.some(f => f.toLowerCase().includes('user') || f.toLowerCase().includes('profile'));
    const hasAdmin = features.some(f => f.toLowerCase().includes('admin'));

    if (hasPayment || hasAdmin) return 'high';
    if (hasUserData) return 'medium';
    return 'basic';
  }

  private generateSecureKey(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  async cleanup(): Promise<void> {
    console.log('Security & Authentication Agent cleaned up');
  }
}