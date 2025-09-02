/**
 * Comprehensive Error Handler for ARCHITECT-BRAVO
 * Provides error categorization, logging, and recovery mechanisms
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { ValidationError, AuthenticationError, AuthorizationError } from '../utils/errors';

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  INTERNAL_SERVER = 'INTERNAL_SERVER',
  RATE_LIMIT = 'RATE_LIMIT',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  apiKeyId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export interface CategorizedError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: Error;
  context: ErrorContext;
  isRetryable: boolean;
  statusCode: number;
  clientMessage: string;
  internalMessage: string;
  stack?: string;
  metadata: Record<string, any>;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByStatusCode: Record<number, number>;
  retryableErrors: number;
  averageResponseTime: number;
  recentErrors: CategorizedError[];
}

export class ErrorCategorizer {
  private static readonly ERROR_PATTERNS: Map<RegExp | string, ErrorCategory> = new Map([
    // Validation errors
    [/validation/i, ErrorCategory.VALIDATION],
    [/invalid/i, ErrorCategory.VALIDATION],
    [/required/i, ErrorCategory.VALIDATION],
    [/format/i, ErrorCategory.VALIDATION],
    
    // Authentication/Authorization
    [/unauthorized/i, ErrorCategory.AUTHENTICATION],
    [/unauthenticated/i, ErrorCategory.AUTHENTICATION],
    [/forbidden/i, ErrorCategory.AUTHORIZATION],
    [/access denied/i, ErrorCategory.AUTHORIZATION],
    [/permission/i, ErrorCategory.AUTHORIZATION],
    
    // Not Found
    [/not found/i, ErrorCategory.NOT_FOUND],
    [/does not exist/i, ErrorCategory.NOT_FOUND],
    [/missing/i, ErrorCategory.NOT_FOUND],
    
    // Database
    [/database/i, ErrorCategory.DATABASE],
    [/connection/i, ErrorCategory.DATABASE],
    [/query/i, ErrorCategory.DATABASE],
    [/deadlock/i, ErrorCategory.DATABASE],
    [/constraint/i, ErrorCategory.DATABASE],
    
    // Network
    [/network/i, ErrorCategory.NETWORK],
    [/timeout/i, ErrorCategory.TIMEOUT],
    [/ECONNRESET/i, ErrorCategory.NETWORK],
    [/ENOTFOUND/i, ErrorCategory.NETWORK],
    [/ETIMEDOUT/i, ErrorCategory.TIMEOUT],
    
    // Rate Limiting
    [/rate limit/i, ErrorCategory.RATE_LIMIT],
    [/too many requests/i, ErrorCategory.RATE_LIMIT],
    [/429/i, ErrorCategory.RATE_LIMIT],
    
    // Circuit Breaker
    [/circuit breaker/i, ErrorCategory.CIRCUIT_BREAKER],
    [/CircuitBreakerError/, ErrorCategory.CIRCUIT_BREAKER],
    
    // External Services
    [/service unavailable/i, ErrorCategory.EXTERNAL_SERVICE],
    [/502/i, ErrorCategory.EXTERNAL_SERVICE],
    [/503/i, ErrorCategory.EXTERNAL_SERVICE],
    [/504/i, ErrorCategory.EXTERNAL_SERVICE]
  ]);

  static categorize(error: Error): ErrorCategory {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Check by error name first
    if (error.name === 'ValidationError') return ErrorCategory.VALIDATION;
    if (error.name === 'AuthenticationError') return ErrorCategory.AUTHENTICATION;
    if (error.name === 'AuthorizationError') return ErrorCategory.AUTHORIZATION;
    if (error.name === 'CircuitBreakerError') return ErrorCategory.CIRCUIT_BREAKER;

    // Check patterns
    for (const [pattern, category] of this.ERROR_PATTERNS) {
      if (pattern instanceof RegExp) {
        if (pattern.test(errorMessage) || pattern.test(errorName)) {
          return category;
        }
      } else if (errorMessage.includes(pattern.toLowerCase()) || errorName.includes(pattern.toLowerCase())) {
        return category;
      }
    }

    return ErrorCategory.UNKNOWN;
  }

  static determineSeverity(category: ErrorCategory, statusCode: number): ErrorSeverity {
    // Critical errors
    if (statusCode >= 500 || category === ErrorCategory.INTERNAL_SERVER) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity
    if (category === ErrorCategory.DATABASE || 
        category === ErrorCategory.EXTERNAL_SERVICE ||
        category === ErrorCategory.CIRCUIT_BREAKER) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity
    if (category === ErrorCategory.AUTHENTICATION ||
        category === ErrorCategory.AUTHORIZATION ||
        category === ErrorCategory.BUSINESS_LOGIC ||
        category === ErrorCategory.TIMEOUT) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity
    return ErrorSeverity.LOW;
  }

  static isRetryable(category: ErrorCategory, statusCode: number): boolean {
    const retryableCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.DATABASE
    ];

    const retryableStatusCodes = [408, 429, 502, 503, 504];
    
    return retryableCategories.includes(category) || 
           retryableStatusCodes.includes(statusCode);
  }

  static getStatusCode(category: ErrorCategory, originalStatusCode?: number): number {
    if (originalStatusCode) return originalStatusCode;

    switch (category) {
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.NOT_FOUND:
        return 404;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.BUSINESS_LOGIC:
        return 422;
      case ErrorCategory.EXTERNAL_SERVICE:
      case ErrorCategory.DATABASE:
      case ErrorCategory.CIRCUIT_BREAKER:
      case ErrorCategory.INTERNAL_SERVER:
        return 500;
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        return 503;
      default:
        return 500;
    }
  }

  static getClientMessage(category: ErrorCategory, originalMessage: string): string {
    switch (category) {
      case ErrorCategory.VALIDATION:
        return 'The request contains invalid data. Please check your input and try again.';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication required. Please provide valid credentials.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait before trying again.';
      case ErrorCategory.BUSINESS_LOGIC:
        return originalMessage; // Business logic errors are usually safe to expose
      case ErrorCategory.TIMEOUT:
        return 'The request timed out. Please try again later.';
      case ErrorCategory.EXTERNAL_SERVICE:
      case ErrorCategory.DATABASE:
      case ErrorCategory.CIRCUIT_BREAKER:
      case ErrorCategory.INTERNAL_SERVER:
        return 'An internal error occurred. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }
}

export class ErrorHandler {
  private logger: Logger;
  private stats: ErrorStats;
  private recentErrorsLimit: number = 100;

  constructor() {
    this.logger = new Logger('ErrorHandler');
    this.stats = this.initializeStats();
  }

  /**
   * Express error handling middleware
   */
  middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const categorizedError = this.categorizeError(error, req);
      this.logError(categorizedError);
      this.updateStats(categorizedError);
      this.sendErrorResponse(res, categorizedError);
    };
  }

  /**
   * Categorize an error with context
   */
  categorizeError(error: Error, req?: Request): CategorizedError {
    const category = ErrorCategorizer.categorize(error);
    const statusCode = ErrorCategorizer.getStatusCode(category);
    const severity = ErrorCategorizer.determineSeverity(category, statusCode);
    const isRetryable = ErrorCategorizer.isRetryable(category, statusCode);
    
    const context: ErrorContext = {
      requestId: req?.get('X-Request-ID'),
      userId: (req as any)?.user?.id,
      apiKeyId: (req as any)?.apiKey?.id,
      path: req?.path,
      method: req?.method,
      userAgent: req?.get('User-Agent'),
      ip: req?.ip,
      timestamp: new Date()
    };

    const categorizedError: CategorizedError = {
      id: this.generateErrorId(),
      category,
      severity,
      message: error.message,
      originalError: error,
      context,
      isRetryable,
      statusCode,
      clientMessage: ErrorCategorizer.getClientMessage(category, error.message),
      internalMessage: error.message,
      stack: error.stack,
      metadata: this.extractErrorMetadata(error)
    };

    return categorizedError;
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: CategorizedError): void {
    const logData = {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      statusCode: error.statusCode,
      isRetryable: error.isRetryable,
      context: error.context,
      metadata: error.metadata
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(`CRITICAL ERROR: ${error.internalMessage}`, {
          ...logData,
          stack: error.stack
        });
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(`HIGH SEVERITY: ${error.internalMessage}`, logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(`MEDIUM SEVERITY: ${error.internalMessage}`, logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info(`LOW SEVERITY: ${error.internalMessage}`, logData);
        break;
    }

    // Alert for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.sendAlert(error);
    }
  }

  /**
   * Send error response to client
   */
  private sendErrorResponse(res: Response, error: CategorizedError): void {
    const response: any = {
      error: {
        id: error.id,
        message: error.clientMessage,
        category: error.category,
        timestamp: error.context.timestamp.toISOString()
      }
    };

    // Include retry information for retryable errors
    if (error.isRetryable) {
      response.error.retryable = true;
      response.error.retryAfter = this.calculateRetryAfter(error);
    }

    // Include additional details for development environment
    if (process.env.NODE_ENV === 'development') {
      response.error.details = {
        originalMessage: error.internalMessage,
        stack: error.stack,
        metadata: error.metadata
      };
    }

    res.status(error.statusCode).json(response);
  }

  /**
   * Update error statistics
   */
  private updateStats(error: CategorizedError): void {
    this.stats.totalErrors++;
    this.stats.errorsByCategory[error.category] = 
      (this.stats.errorsByCategory[error.category] || 0) + 1;
    this.stats.errorsBySeverity[error.severity] = 
      (this.stats.errorsBySeverity[error.severity] || 0) + 1;
    this.stats.errorsByStatusCode[error.statusCode] = 
      (this.stats.errorsByStatusCode[error.statusCode] || 0) + 1;

    if (error.isRetryable) {
      this.stats.retryableErrors++;
    }

    // Add to recent errors (with limit)
    this.stats.recentErrors.unshift(error);
    if (this.stats.recentErrors.length > this.recentErrorsLimit) {
      this.stats.recentErrors.pop();
    }
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    return { ...this.stats };
  }

  /**
   * Reset error statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  private initializeStats(): ErrorStats {
    return {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByStatusCode: {} as Record<number, number>,
      retryableErrors: 0,
      averageResponseTime: 0,
      recentErrors: []
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractErrorMetadata(error: Error): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract specific error properties
    if ('code' in error) metadata.code = (error as any).code;
    if ('errno' in error) metadata.errno = (error as any).errno;
    if ('syscall' in error) metadata.syscall = (error as any).syscall;
    if ('hostname' in error) metadata.hostname = (error as any).hostname;
    if ('port' in error) metadata.port = (error as any).port;

    // Extract validation errors details
    if (error instanceof ValidationError && 'details' in error) {
      metadata.validationErrors = (error as any).details;
    }

    return metadata;
  }

  private calculateRetryAfter(error: CategorizedError): number {
    switch (error.category) {
      case ErrorCategory.RATE_LIMIT:
        return 60; // 1 minute
      case ErrorCategory.EXTERNAL_SERVICE:
        return 30; // 30 seconds
      case ErrorCategory.DATABASE:
        return 5; // 5 seconds
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        return 10; // 10 seconds
      default:
        return 5; // 5 seconds default
    }
  }

  private sendAlert(error: CategorizedError): void {
    // In a real implementation, this would send alerts via email, Slack, etc.
    this.logger.error('CRITICAL ERROR ALERT', {
      errorId: error.id,
      message: error.internalMessage,
      context: error.context,
      stack: error.stack
    });

    // Could integrate with services like:
    // - PagerDuty
    // - Slack webhook
    // - Email service
    // - SMS service
  }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * Async error wrapper for route handlers
 */
export function asyncErrorHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error boundary for catching unhandled errors
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    const categorizedError = globalErrorHandler.categorizeError(error);
    globalErrorHandler['logError'](categorizedError);
    
    // Exit gracefully
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const categorizedError = globalErrorHandler.categorizeError(error);
    globalErrorHandler['logError'](categorizedError);
  });
}

/**
 * Health check for error handler
 */
export function getErrorHandlerHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  stats: ErrorStats;
  recentCriticalErrors: number;
} {
  const stats = globalErrorHandler.getStats();
  const recentCriticalErrors = stats.recentErrors
    .filter(error => error.severity === ErrorSeverity.CRITICAL)
    .filter(error => Date.now() - error.context.timestamp.getTime() < 300000) // Last 5 minutes
    .length;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  
  if (recentCriticalErrors >= 5) {
    status = 'unhealthy';
  } else if (recentCriticalErrors >= 2 || stats.totalErrors > 1000) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    stats,
    recentCriticalErrors
  };
}