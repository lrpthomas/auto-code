/**
 * Authentication Middleware for ARCHITECT-BRAVO
 * Implements API key authentication and JWT token management
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { RateLimiter } from './rate-limiter';
import { Logger } from '../utils/logger';
import { ValidationError, AuthenticationError, AuthorizationError } from '../utils/errors';

export interface ApiKey {
  id: string;
  key: string;
  hashedKey: string;
  name: string;
  permissions: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  metadata: Record<string, any>;
}

export interface JWTPayload {
  sub: string;
  apiKeyId: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
}

export interface AuthenticatedRequest extends Request {
  apiKey?: ApiKey;
  user?: {
    id: string;
    permissions: string[];
  };
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
  };
}

export class AuthenticationService {
  private apiKeys: Map<string, ApiKey> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private logger: Logger;
  private jwtSecret: string;
  private jwtIssuer: string;
  private defaultTokenExpiry: number = 3600; // 1 hour

  constructor(jwtSecret: string, jwtIssuer = 'architect-bravo') {
    this.logger = new Logger('AuthenticationService');
    this.jwtSecret = jwtSecret;
    this.jwtIssuer = jwtIssuer;
    
    // Load API keys from environment or database
    this.loadApiKeys();
    
    this.logger.info('Authentication service initialized');
  }

  /**
   * Generate a new API key
   */
  async generateApiKey(config: {
    name: string;
    permissions: string[];
    rateLimits?: {
      requestsPerMinute?: number;
      requestsPerHour?: number;
      requestsPerDay?: number;
    };
    expiresIn?: number; // seconds
    metadata?: Record<string, any>;
  }): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const rawKey = this.generateSecureKey();
    const hashedKey = await bcrypt.hash(rawKey, 12);
    
    const apiKey: ApiKey = {
      id: crypto.randomUUID(),
      key: rawKey.substring(0, 8) + '...' + rawKey.substring(rawKey.length - 4), // Display version
      hashedKey,
      name: config.name,
      permissions: config.permissions,
      rateLimits: {
        requestsPerMinute: config.rateLimits?.requestsPerMinute || 100,
        requestsPerHour: config.rateLimits?.requestsPerHour || 1000,
        requestsPerDay: config.rateLimits?.requestsPerDay || 10000
      },
      isActive: true,
      expiresAt: config.expiresIn ? new Date(Date.now() + config.expiresIn * 1000) : undefined,
      createdAt: new Date(),
      metadata: config.metadata || {}
    };

    // Store the API key (in production, this should be in a database)
    this.apiKeys.set(rawKey, apiKey);
    
    // Create rate limiter for this API key
    this.rateLimiters.set(apiKey.id, new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: apiKey.rateLimits.requestsPerMinute
    }));

    this.logger.info(`Generated API key: ${apiKey.name}`, { apiKeyId: apiKey.id });
    
    return { apiKey, rawKey };
  }

  /**
   * Validate API key and return associated data
   */
  async validateApiKey(key: string): Promise<ApiKey | null> {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) {
      return null;
    }

    // Check if API key is active
    if (!apiKey.isActive) {
      this.logger.warn(`Inactive API key used: ${apiKey.name}`, { apiKeyId: apiKey.id });
      return null;
    }

    // Check if API key has expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.logger.warn(`Expired API key used: ${apiKey.name}`, { apiKeyId: apiKey.id });
      return null;
    }

    // Update last used timestamp
    apiKey.lastUsedAt = new Date();
    
    return apiKey;
  }

  /**
   * Generate JWT token for authenticated session
   */
  generateJWTToken(apiKey: ApiKey, expiresIn?: number): string {
    const payload: JWTPayload = {
      sub: apiKey.id,
      apiKeyId: apiKey.id,
      permissions: apiKey.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (expiresIn || this.defaultTokenExpiry),
      iss: this.jwtIssuer
    };

    return jwt.sign(payload, this.jwtSecret, { algorithm: 'HS256' });
  }

  /**
   * Validate JWT token
   */
  validateJWTToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
        algorithms: ['HS256']
      }) as JWTPayload;

      return payload;
    } catch (error) {
      this.logger.warn('Invalid JWT token', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Check rate limits for API key
   */
  async checkRateLimit(apiKeyId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    const rateLimiter = this.rateLimiters.get(apiKeyId);
    if (!rateLimiter) {
      return { allowed: true, remaining: Infinity, resetTime: new Date() };
    }

    return await rateLimiter.checkLimit();
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKeyId: string): Promise<boolean> {
    for (const [key, apiKey] of this.apiKeys.entries()) {
      if (apiKey.id === apiKeyId) {
        apiKey.isActive = false;
        this.logger.info(`API key revoked: ${apiKey.name}`, { apiKeyId });
        return true;
      }
    }
    return false;
  }

  private generateSecureKey(): string {
    return 'ab_' + crypto.randomBytes(32).toString('hex');
  }

  private loadApiKeys() {
    // In production, load from database
    // For now, create a default admin key if none exist
    if (this.apiKeys.size === 0) {
      const adminKey = this.generateSecureKey();
      const apiKey: ApiKey = {
        id: crypto.randomUUID(),
        key: adminKey.substring(0, 8) + '...' + adminKey.substring(adminKey.length - 4),
        hashedKey: bcrypt.hashSync(adminKey, 12),
        name: 'Admin Key',
        permissions: ['*'], // All permissions
        rateLimits: {
          requestsPerMinute: 1000,
          requestsPerHour: 10000,
          requestsPerDay: 100000
        },
        isActive: true,
        createdAt: new Date(),
        metadata: { isDefault: true }
      };

      this.apiKeys.set(adminKey, apiKey);
      
      // Log the admin key (remove in production)
      console.log(`\n🔑 Admin API Key: ${adminKey}\n`);
    }
  }

  /**
   * Get API key statistics
   */
  getApiKeyStats(): Record<string, any> {
    const stats = {
      totalKeys: this.apiKeys.size,
      activeKeys: 0,
      expiredKeys: 0,
      rateLimiters: this.rateLimiters.size
    };

    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.isActive) {
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          stats.expiredKeys++;
        } else {
          stats.activeKeys++;
        }
      }
    }

    return stats;
  }
}

/**
 * Express middleware for API key authentication
 */
export function apiKeyAuth(authService: AuthenticationService) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const apiKey = extractApiKey(req);
      
      if (!apiKey) {
        throw new AuthenticationError('API key required');
      }

      const validatedApiKey = await authService.validateApiKey(apiKey);
      if (!validatedApiKey) {
        throw new AuthenticationError('Invalid API key');
      }

      // Check rate limits
      const rateLimit = await authService.checkRateLimit(validatedApiKey.id);
      if (!rateLimit.allowed) {
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', rateLimit.resetTime.toISOString());
        return res.status(429).json({
          error: 'Rate limit exceeded',
          resetTime: rateLimit.resetTime
        });
      }

      // Set rate limit headers
      res.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      res.set('X-RateLimit-Reset', rateLimit.resetTime.toISOString());

      // Add to request
      req.apiKey = validatedApiKey;
      req.rateLimitInfo = rateLimit;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Express middleware for JWT token authentication
 */
export function jwtAuth(authService: AuthenticationService) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = extractJWTToken(req);
      
      if (!token) {
        throw new AuthenticationError('JWT token required');
      }

      const payload = authService.validateJWTToken(token);
      if (!payload) {
        throw new AuthenticationError('Invalid JWT token');
      }

      req.user = {
        id: payload.sub,
        permissions: payload.permissions
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Express middleware for permission-based authorization
 */
export function requirePermissions(requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userPermissions = req.user?.permissions || req.apiKey?.permissions || [];
      
      // Check for wildcard permission
      if (userPermissions.includes('*')) {
        return next();
      }

      // Check each required permission
      for (const permission of requiredPermissions) {
        if (!userPermissions.includes(permission)) {
          throw new AuthorizationError(`Missing required permission: ${permission}`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Express middleware for role-based authorization
 */
export function requireRole(requiredRole: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userPermissions = req.user?.permissions || req.apiKey?.permissions || [];
      
      // Check for admin role (wildcard)
      if (userPermissions.includes('*') || userPermissions.includes('admin')) {
        return next();
      }

      // Check for specific role
      if (!userPermissions.includes(requiredRole)) {
        throw new AuthorizationError(`Required role: ${requiredRole}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Extract API key from request
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }

  // Check query parameter
  const apiKeyQuery = req.query.api_key;
  if (apiKeyQuery && typeof apiKeyQuery === 'string') {
    return apiKeyQuery;
  }

  return null;
}

/**
 * Extract JWT token from request
 */
function extractJWTToken(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Simple check if it looks like a JWT (has 3 parts separated by dots)
    if (token.split('.').length === 3) {
      return token;
    }
  }

  return null;
}

// Export default authentication service instance
let defaultAuthService: AuthenticationService | null = null;

export function getDefaultAuthService(): AuthenticationService {
  if (!defaultAuthService) {
    const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    defaultAuthService = new AuthenticationService(jwtSecret);
  }
  return defaultAuthService;
}