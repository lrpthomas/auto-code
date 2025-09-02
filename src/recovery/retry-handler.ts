/**
 * Retry Handler with Exponential Backoff for ARCHITECT-BRAVO
 * Implements intelligent retry logic with different strategies
 */

import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

export enum RetryStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  EXPONENTIAL_JITTER = 'exponential_jitter'
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  strategy: RetryStrategy;
  multiplier: number;
  jitterMax: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  onFailure?: (attempts: number, lastError: Error) => void;
  onSuccess?: (attempts: number) => void;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
  errors: Error[];
}

export interface RetryStats {
  totalRetries: number;
  successAfterRetry: number;
  ultimateFailures: number;
  averageAttempts: number;
  averageSuccessTime: number;
  errorBreakdown: Record<string, number>;
}

export class RetryableError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export class RetryHandler extends EventEmitter {
  private stats: RetryStats;
  private logger: Logger;

  constructor(private config: RetryConfig) {
    super();
    this.logger = new Logger('RetryHandler');
    this.stats = {
      totalRetries: 0,
      successAfterRetry: 0,
      ultimateFailures: 0,
      averageAttempts: 0,
      averageSuccessTime: 0,
      errorBreakdown: {}
    };
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const effectiveConfig = { ...this.config, ...customConfig };
    const errors: Error[] = [];
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= effectiveConfig.maxAttempts; attempt++) {
      try {
        const result = await fn();
        const totalTime = Date.now() - startTime;

        // Success
        if (attempt > 1) {
          this.stats.successAfterRetry++;
          this.updateAverageAttempts(attempt);
          this.updateAverageTime(totalTime);
          
          effectiveConfig.onSuccess?.(attempt);
          this.emit('success', { attempt, totalTime, errors });
        }

        return {
          result,
          attempts: attempt,
          totalTime,
          errors
        };
      } catch (error) {
        lastError = error as Error;
        errors.push(lastError);
        
        this.updateErrorBreakdown(lastError);

        // Check if error is retryable
        if (!this.isRetryable(lastError, effectiveConfig)) {
          this.stats.ultimateFailures++;
          effectiveConfig.onFailure?.(attempt, lastError);
          throw new NonRetryableError(
            `Non-retryable error after ${attempt} attempts: ${lastError.message}`,
            lastError
          );
        }

        // If this is the last attempt, don't retry
        if (attempt >= effectiveConfig.maxAttempts) {
          break;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, effectiveConfig);
        
        this.stats.totalRetries++;
        effectiveConfig.onRetry?.(attempt, lastError, delay);
        this.emit('retry', { attempt, error: lastError, delay });
        
        this.logger.warn(`Retry attempt ${attempt}/${effectiveConfig.maxAttempts} after ${delay}ms`, {
          error: lastError.message,
          delay
        });

        await this.sleep(delay);
      }
    }

    // All attempts exhausted
    this.stats.ultimateFailures++;
    this.updateAverageAttempts(effectiveConfig.maxAttempts);
    
    effectiveConfig.onFailure?.(effectiveConfig.maxAttempts, lastError!);
    this.emit('failure', { attempts: effectiveConfig.maxAttempts, errors });
    
    throw new RetryableError(
      `Failed after ${effectiveConfig.maxAttempts} attempts: ${lastError!.message}`,
      lastError!
    );
  }

  /**
   * Execute with exponential backoff (convenience method)
   */
  async executeWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    const result = await this.execute(fn, {
      maxAttempts,
      initialDelay,
      strategy: RetryStrategy.EXPONENTIAL_JITTER,
      multiplier: 2,
      maxDelay: 30000
    });
    
    return result.result;
  }

  /**
   * Execute with linear backoff (convenience method)
   */
  async executeWithLinearBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    const result = await this.execute(fn, {
      maxAttempts,
      initialDelay: delay,
      strategy: RetryStrategy.LINEAR,
      multiplier: 1
    });
    
    return result.result;
  }

  /**
   * Execute with fixed delay (convenience method)
   */
  async executeWithFixedDelay<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    const result = await this.execute(fn, {
      maxAttempts,
      initialDelay: delay,
      strategy: RetryStrategy.FIXED
    });
    
    return result.result;
  }

  /**
   * Get retry statistics
   */
  getStats(): RetryStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRetries: 0,
      successAfterRetry: 0,
      ultimateFailures: 0,
      averageAttempts: 0,
      averageSuccessTime: 0,
      errorBreakdown: {}
    };
  }

  private isRetryable(error: Error, config: RetryConfig): boolean {
    const errorName = error.name;
    const errorMessage = error.message;

    // Check non-retryable errors first
    for (const nonRetryableError of config.nonRetryableErrors) {
      if (errorName === nonRetryableError || errorMessage.includes(nonRetryableError)) {
        return false;
      }
    }

    // If retryable errors list is empty, retry by default (unless non-retryable)
    if (config.retryableErrors.length === 0) {
      return true;
    }

    // Check retryable errors
    for (const retryableError of config.retryableErrors) {
      if (errorName === retryableError || errorMessage.includes(retryableError)) {
        return true;
      }
    }

    return false;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay: number;

    switch (config.strategy) {
      case RetryStrategy.FIXED:
        delay = config.initialDelay;
        break;

      case RetryStrategy.LINEAR:
        delay = config.initialDelay * attempt * config.multiplier;
        break;

      case RetryStrategy.EXPONENTIAL:
        delay = config.initialDelay * Math.pow(config.multiplier, attempt - 1);
        break;

      case RetryStrategy.EXPONENTIAL_JITTER:
        const exponentialDelay = config.initialDelay * Math.pow(config.multiplier, attempt - 1);
        const jitter = Math.random() * config.jitterMax;
        delay = exponentialDelay + jitter;
        break;

      default:
        delay = config.initialDelay;
    }

    // Ensure delay doesn't exceed maximum
    return Math.min(delay, config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateErrorBreakdown(error: Error): void {
    const errorKey = error.name || 'Unknown';
    this.stats.errorBreakdown[errorKey] = (this.stats.errorBreakdown[errorKey] || 0) + 1;
  }

  private updateAverageAttempts(attempts: number): void {
    const totalOperations = this.stats.successAfterRetry + this.stats.ultimateFailures;
    if (totalOperations === 0) {
      this.stats.averageAttempts = attempts;
    } else {
      this.stats.averageAttempts = 
        (this.stats.averageAttempts * (totalOperations - 1) + attempts) / totalOperations;
    }
  }

  private updateAverageTime(time: number): void {
    if (this.stats.successAfterRetry === 0) {
      this.stats.averageSuccessTime = time;
    } else {
      this.stats.averageSuccessTime = 
        (this.stats.averageSuccessTime * (this.stats.successAfterRetry - 1) + time) / this.stats.successAfterRetry;
    }
  }
}

/**
 * Retry decorator for automatic retry functionality
 */
export function retry(config: Partial<RetryConfig>) {
  const defaultConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    strategy: RetryStrategy.EXPONENTIAL_JITTER,
    multiplier: 2,
    jitterMax: 1000,
    retryableErrors: [],
    nonRetryableErrors: ['ValidationError', 'AuthenticationError', 'AuthorizationError']
  };

  const retryHandler = new RetryHandler({ ...defaultConfig, ...config });

  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await retryHandler.execute(() => method.apply(this, args));
      return result.result;
    };

    return descriptor;
  };
}

// Default retry configurations for different scenarios
export const RetryConfigs = {
  // Network requests
  network: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    strategy: RetryStrategy.EXPONENTIAL_JITTER,
    multiplier: 2,
    jitterMax: 500,
    retryableErrors: ['NetworkError', 'TimeoutError', 'ECONNRESET', 'ENOTFOUND'],
    nonRetryableErrors: ['ValidationError', 'AuthenticationError', '400', '401', '403']
  } as RetryConfig,

  // Database operations
  database: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 5000,
    strategy: RetryStrategy.EXPONENTIAL_JITTER,
    multiplier: 1.5,
    jitterMax: 200,
    retryableErrors: ['ConnectionError', 'TimeoutError', 'DeadlockError'],
    nonRetryableErrors: ['ValidationError', 'ConstraintError', 'SyntaxError']
  } as RetryConfig,

  // AI API calls
  aiApi: {
    maxAttempts: 4,
    initialDelay: 2000,
    maxDelay: 30000,
    strategy: RetryStrategy.EXPONENTIAL_JITTER,
    multiplier: 2,
    jitterMax: 1000,
    retryableErrors: ['RateLimitError', 'ServiceUnavailableError', '429', '500', '502', '503'],
    nonRetryableErrors: ['AuthenticationError', 'ValidationError', '400', '401', '403']
  } as RetryConfig,

  // File operations
  file: {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 1000,
    strategy: RetryStrategy.LINEAR,
    multiplier: 1,
    jitterMax: 50,
    retryableErrors: ['EBUSY', 'EMFILE', 'ENFILE'],
    nonRetryableErrors: ['ENOENT', 'EACCES', 'EPERM']
  } as RetryConfig
};

/**
 * Retry manager for managing multiple retry handlers
 */
export class RetryManager {
  private handlers: Map<string, RetryHandler> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('RetryManager');
  }

  /**
   * Create a named retry handler
   */
  createHandler(name: string, config: RetryConfig): RetryHandler {
    const handler = new RetryHandler(config);
    this.handlers.set(name, handler);
    
    // Forward events with handler name
    handler.on('retry', (data) => this.emit('retry', { handler: name, ...data }));
    handler.on('success', (data) => this.emit('success', { handler: name, ...data }));
    handler.on('failure', (data) => this.emit('failure', { handler: name, ...data }));

    this.logger.info(`Retry handler created: ${name}`);
    return handler;
  }

  /**
   * Get retry handler by name
   */
  getHandler(name: string): RetryHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * Get all handler statistics
   */
  getAllStats(): Record<string, RetryStats> {
    const stats: Record<string, RetryStats> = {};
    for (const [name, handler] of this.handlers) {
      stats[name] = handler.getStats();
    }
    return stats;
  }

  /**
   * Reset all handler statistics
   */
  resetAllStats(): void {
    for (const handler of this.handlers.values()) {
      handler.resetStats();
    }
    this.logger.info('All retry handler stats reset');
  }

  private emit(event: string, data: any): void {
    // Simple event emission without extending EventEmitter
    // In a real implementation, this would use a proper event system
  }
}

// Default retry manager instance
export const defaultRetryManager = new RetryManager();

// Initialize default handlers
defaultRetryManager.createHandler('network', RetryConfigs.network);
defaultRetryManager.createHandler('database', RetryConfigs.database);
defaultRetryManager.createHandler('aiApi', RetryConfigs.aiApi);
defaultRetryManager.createHandler('file', RetryConfigs.file);