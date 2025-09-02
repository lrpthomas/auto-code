/**
 * Security Middleware for ARCHITECT-BRAVO
 * Implements security headers, CORS, input validation, and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, query, param, ValidationChain, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import { Logger } from '../utils/logger';
import { ValidationError, SecurityError } from '../utils/errors';

export interface SecurityConfig {
  cors: {
    enabled: boolean;
    origins: string[] | string;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  slowDown: {
    windowMs: number;
    delayAfter: number;
    delayMs: number;
    maxDelayMs: number;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
  validation: {
    abortEarly: boolean;
    stripUnknown: boolean;
    allowUnknown: boolean;
  };
  sanitization: {
    enableHtmlSanitization: boolean;
    enableSqlInjectionProtection: boolean;
    enableXssProtection: boolean;
    maxStringLength: number;
    maxArrayLength: number;
    maxObjectDepth: number;
  };
}

export class SecurityService {
  private logger: Logger;
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.logger = new Logger('SecurityService');
    this.config = config;
  }

  /**
   * Configure CORS middleware
   */
  getCorsMiddleware() {
    if (!this.config.cors.enabled) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = Array.isArray(this.config.cors.origins) 
          ? this.config.cors.origins 
          : [this.config.cors.origins];

        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          this.logger.warn(`CORS blocked origin: ${origin}`);
          callback(new SecurityError(`Origin ${origin} not allowed by CORS policy`));
        }
      },
      credentials: this.config.cors.credentials,
      methods: this.config.cors.methods,
      allowedHeaders: this.config.cors.allowedHeaders,
      optionsSuccessStatus: 200
    });
  }

  /**
   * Configure security headers middleware
   */
  getSecurityHeadersMiddleware() {
    const helmetConfig = {
      contentSecurityPolicy: this.config.helmet.contentSecurityPolicy ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      } : false,
      crossOriginEmbedderPolicy: this.config.helmet.crossOriginEmbedderPolicy,
      crossOriginOpenerPolicy: this.config.helmet.crossOriginOpenerPolicy,
      crossOriginResourcePolicy: this.config.helmet.crossOriginResourcePolicy ? 
        { policy: "cross-origin" } : false,
      dnsPrefetchControl: this.config.helmet.dnsPrefetchControl,
      frameguard: this.config.helmet.frameguard ? { action: 'deny' } : false,
      hidePoweredBy: this.config.helmet.hidePoweredBy,
      hsts: this.config.helmet.hsts ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,
      ieNoOpen: this.config.helmet.ieNoOpen,
      noSniff: this.config.helmet.noSniff,
      originAgentCluster: this.config.helmet.originAgentCluster,
      permittedCrossDomainPolicies: this.config.helmet.permittedCrossDomainPolicies ?
        { permittedPolicies: "none" } : false,
      referrerPolicy: this.config.helmet.referrerPolicy ? 
        { policy: "strict-origin-when-cross-origin" } : false,
      xssFilter: this.config.helmet.xssFilter
    };

    return helmet(helmetConfig);
  }

  /**
   * Configure rate limiting middleware
   */
  getRateLimitMiddleware() {
    return rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.maxRequests,
      skipSuccessfulRequests: this.config.rateLimit.skipSuccessfulRequests,
      skipFailedRequests: this.config.rateLimit.skipFailedRequests,
      standardHeaders: this.config.rateLimit.standardHeaders,
      legacyHeaders: this.config.rateLimit.legacyHeaders,
      handler: (req: Request, res: Response) => {
        this.logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Configure slow down middleware
   */
  getSlowDownMiddleware() {
    return slowDown({
      windowMs: this.config.slowDown.windowMs,
      delayAfter: this.config.slowDown.delayAfter,
      delayMs: this.config.slowDown.delayMs,
      maxDelayMs: this.config.slowDown.maxDelayMs,
      onLimitReached: (req: Request) => {
        this.logger.warn(`Slow down activated for IP: ${req.ip}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
      }
    });
  }

  /**
   * Input sanitization middleware
   */
  getSanitizationMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body, 0);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query, 0);
        }

        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
          req.params = this.sanitizeObject(req.params, 0);
        }

        next();
      } catch (error) {
        next(new ValidationError('Input sanitization failed'));
      }
    };
  }

  /**
   * Validation error handler middleware
   */
  getValidationErrorHandler() {
    return (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
          field: error.type === 'field' ? (error as any).path : 'unknown',
          message: error.msg,
          value: error.type === 'field' ? (error as any).value : undefined
        }));

        this.logger.warn('Validation errors', { errors: errorMessages, path: req.path });

        return res.status(400).json({
          error: 'Validation failed',
          details: errorMessages
        });
      }

      next();
    };
  }

  private sanitizeObject(obj: any, depth: number): any {
    if (depth > this.config.sanitization.maxObjectDepth) {
      throw new ValidationError('Object nesting too deep');
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      if (obj.length > this.config.sanitization.maxArrayLength) {
        throw new ValidationError('Array too long');
      }
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value, depth + 1);
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    if (str.length > this.config.sanitization.maxStringLength) {
      throw new ValidationError('String too long');
    }

    let sanitized = str;

    // HTML sanitization
    if (this.config.sanitization.enableHtmlSanitization) {
      sanitized = DOMPurify.sanitize(sanitized, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    }

    // XSS protection
    if (this.config.sanitization.enableXssProtection) {
      sanitized = this.removeXssPatterns(sanitized);
    }

    // SQL injection protection
    if (this.config.sanitization.enableSqlInjectionProtection) {
      sanitized = this.removeSqlInjectionPatterns(sanitized);
    }

    return sanitized;
  }

  private removeXssPatterns(str: string): string {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /<link\b[^>]*>/gi,
      /<meta\b[^>]*>/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi
    ];

    let sanitized = str;
    for (const pattern of xssPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  private removeSqlInjectionPatterns(str: string): string {
    const sqlPatterns = [
      /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT( INTO)?|MERGE|SELECT|UPDATE|UNION( ALL)?)\b)/gi,
      /(\b(AND|OR)\b.{1,6}?(=|>|<|\!|&|\|))/gi,
      /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR|TEXT|NTEXT)\s*\(\s*\d+\s*\))/gi,
      /(\/\*.*?\*\/)/gi,
      /(\-\-[^\r\n]*)/gi,
      /(\bxp_)/gi,
      /(\bsp_)/gi
    ];

    let sanitized = str;
    for (const pattern of sqlPatterns) {
      // Log potential SQL injection attempt
      if (pattern.test(str)) {
        this.logger.warn('Potential SQL injection attempt blocked', { 
          originalString: str,
          pattern: pattern.source
        });
      }
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }
}

// Validation chain builders
export const ValidationChains = {
  // Common validations
  id: () => param('id').isUUID().withMessage('Must be a valid UUID'),
  
  // Project validations
  projectName: () => body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Project name can only contain letters, numbers, spaces, hyphens, and underscores'),
    
  projectDescription: () => body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  // Workflow validations
  workflowType: () => body('type')
    .isIn(['crud', 'realtime', 'ecommerce', 'api', 'dashboard'])
    .withMessage('Invalid workflow type'),
    
  workflowRequirements: () => body('requirements')
    .isObject()
    .withMessage('Requirements must be an object'),

  // Template validations
  templateId: () => body('template_id').isUUID().withMessage('Template ID must be a valid UUID'),
  
  // Agent validations
  agentType: () => body('agent_type')
    .isIn(['orchestrator', 'requirement_analysis', 'architecture_planning', 'template_selection', 'code_generation', 'testing', 'deployment'])
    .withMessage('Invalid agent type'),

  // Pagination validations
  page: () => query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  limit: () => query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  // Search validations
  searchQuery: () => query('q').optional().isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters')
};

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  cors: {
    enabled: true,
    origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false
  },
  slowDown: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100,
    delayMs: 500,
    maxDelayMs: 20000
  },
  helmet: {
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  },
  validation: {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  },
  sanitization: {
    enableHtmlSanitization: true,
    enableSqlInjectionProtection: true,
    enableXssProtection: true,
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10
  }
};

// Export default security service
export function createSecurityService(config: SecurityConfig = DEFAULT_SECURITY_CONFIG): SecurityService {
  return new SecurityService(config);
}