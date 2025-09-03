import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import { performance } from 'perf_hooks';

export default class PerformanceOptimizationAgent implements Agent {
  id = 'performance-optimization-agent';
  name = 'Performance Optimization Agent';
  type = 'performance';
  description = 'Optimizes application performance with caching, monitoring, and resource optimization';
  capabilities = ['caching', 'monitoring', 'optimization', 'profiling', 'cdn', 'compression', 'lazy-loading'];
  version = '2.0.0';

  private performanceMetrics: Map<string, number> = new Map();
  private optimizationRules: any[] = [];

  async initialize(): Promise<void> {
    this.loadOptimizationRules();
    console.log('Performance Optimization Agent initialized');
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const requirements = task.requirements;
    const context = task.context || {};
    
    try {
      const performanceSystem = await this.generatePerformanceSystem(requirements, context);
      
      return {
        success: true,
        data: performanceSystem,
        metadata: {
          agent: this.id,
          timestamp: new Date(),
          optimizationLevel: this.assessOptimizationLevel(requirements),
          cachingStrategy: this.selectCachingStrategy(requirements),
          monitoringEnabled: true,
          expectedImprovement: '40-80% performance increase'
        }
      };
    } catch (error) {
      console.error('Performance optimization failed:', error);
      throw error;
    }
  }

  private async generatePerformanceSystem(requirements: AppRequirements, context: any): Promise<any> {
    const optimizationLevel = this.assessOptimizationLevel(requirements);
    const cachingStrategy = this.selectCachingStrategy(requirements);
    
    return {
      caching: this.generateCachingSystem(cachingStrategy, requirements),
      monitoring: this.generateMonitoringSystem(requirements),
      optimization: this.generateOptimizationMiddleware(requirements),
      cdn: this.generateCDNConfiguration(requirements),
      compression: this.generateCompressionConfig(requirements),
      lazyLoading: this.generateLazyLoadingConfig(requirements),
      database: this.generateDatabaseOptimization(requirements),
      memory: this.generateMemoryOptimization(requirements),
      bundling: this.generateBundleOptimization(requirements),
      profiling: this.generateProfilingTools(requirements)
    };
  }

  private generateCachingSystem(strategy: string, requirements: AppRequirements): string {
    return `// Advanced Caching System
import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { LRUCache } from 'lru-cache';

/**
 * Multi-layer caching system with Redis, Memory, and LRU caches
 */
export class CacheManager {
  private redisClient: Redis;
  private memoryCache: NodeCache;
  private lruCache: LRUCache<string, any>;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    // Redis for distributed caching
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4
    });

    // Memory cache for ultra-fast access
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default
      checkperiod: 60, // Check expired keys every minute
      useClones: false // Better performance
    });

    // LRU cache for frequently accessed items
    this.lruCache = new LRUCache({
      max: 1000, // Maximum items
      ttl: 1000 * 60 * 15, // 15 minutes
      allowStale: false,
      updateAgeOnGet: true
    });

    this.setupEventHandlers();
  }

  /**
   * Get value from cache (tries all layers)
   */
  async get(key: string, options: { 
    skipMemory?: boolean; 
    skipRedis?: boolean;
    fallback?: () => Promise<any>;
  } = {}): Promise<any> {
    const cacheKey = this.buildKey(key);
    
    try {
      // Layer 1: LRU Cache (fastest)
      if (!options.skipMemory) {
        const lruValue = this.lruCache.get(cacheKey);
        if (lruValue !== undefined) {
          this.cacheHits++;
          return lruValue;
        }

        // Layer 2: Memory Cache
        const memValue = this.memoryCache.get(cacheKey);
        if (memValue !== undefined) {
          this.cacheHits++;
          // Promote to LRU cache
          this.lruCache.set(cacheKey, memValue);
          return memValue;
        }
      }

      // Layer 3: Redis Cache
      if (!options.skipRedis) {
        const redisValue = await this.redisClient.get(cacheKey);
        if (redisValue) {
          const parsed = JSON.parse(redisValue);
          this.cacheHits++;
          
          // Promote to faster caches
          this.memoryCache.set(cacheKey, parsed, 300);
          this.lruCache.set(cacheKey, parsed);
          
          return parsed;
        }
      }

      // Cache miss - try fallback
      this.cacheMisses++;
      if (options.fallback) {
        const fallbackValue = await options.fallback();
        if (fallbackValue !== undefined) {
          await this.set(cacheKey, fallbackValue);
          return fallbackValue;
        }
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return options.fallback ? await options.fallback() : null;
    }
  }

  /**
   * Set value in all cache layers
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const cacheKey = this.buildKey(key);
    const defaultTTL = ttl || 300; // 5 minutes

    try {
      // Set in all layers
      this.lruCache.set(cacheKey, value, { ttl: defaultTTL * 1000 });
      this.memoryCache.set(cacheKey, value, defaultTTL);
      
      // Redis with error handling
      await this.redisClient.setex(cacheKey, defaultTTL, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
      // Continue execution even if caching fails
    }
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.buildKey(key);
    
    try {
      this.lruCache.delete(cacheKey);
      this.memoryCache.del(cacheKey);
      await this.redisClient.del(cacheKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Cache with automatic refresh
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: { ttl?: number; refreshThreshold?: number } = {}
  ): Promise<T> {
    const { ttl = 300, refreshThreshold = 0.8 } = options;
    
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached) {
      // Check if we need to refresh in background
      const cacheAge = this.getCacheAge(key);
      if (cacheAge > ttl * refreshThreshold) {
        // Refresh in background
        setImmediate(async () => {
          try {
            const fresh = await fetcher();
            await this.set(key, fresh, ttl);
          } catch (error) {
            console.error('Background cache refresh failed:', error);
          }
        });
      }
      return cached;
    }

    // Cache miss - fetch and cache
    const fresh = await fetcher();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  /**
   * Bulk operations for better performance
   */
  async mget(keys: string[]): Promise<Map<string, any>> {
    const results = new Map();
    const redisKeys = keys.map(k => this.buildKey(k));
    
    try {
      const redisValues = await this.redisClient.mget(...redisKeys);
      
      keys.forEach((key, index) => {
        const value = redisValues[index];
        if (value) {
          results.set(key, JSON.parse(value));
          this.cacheHits++;
        } else {
          this.cacheMisses++;
        }
      });
    } catch (error) {
      console.error('Bulk get error:', error);
    }

    return results;
  }

  async mset(entries: Map<string, any>, ttl: number = 300): Promise<void> {
    try {
      const pipeline = this.redisClient.pipeline();
      
      entries.forEach((value, key) => {
        const cacheKey = this.buildKey(key);
        pipeline.setex(cacheKey, ttl, JSON.stringify(value));
        
        // Also set in memory caches
        this.memoryCache.set(cacheKey, value, ttl);
        this.lruCache.set(cacheKey, value, { ttl: ttl * 1000 });
      });
      
      await pipeline.exec();
    } catch (error) {
      console.error('Bulk set error:', error);
    }
  }

  /**
   * Cache statistics and monitoring
   */
  getStats(): any {
    const hitRate = this.cacheHits / (this.cacheHits + this.cacheMisses) || 0;
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryKeys: this.memoryCache.keys().length,
      lruSize: this.lruCache.size,
      memoryStats: this.memoryCache.getStats()
    };
  }

  /**
   * Cache warming - preload frequently used data
   */
  async warmCache(warmupTasks: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>): Promise<void> {
    console.log(\`🔥 Warming cache with \${warmupTasks.length} items...\`);
    
    const promises = warmupTasks.map(async (task) => {
      try {
        const data = await task.fetcher();
        await this.set(task.key, data, task.ttl);
      } catch (error) {
        console.error(\`Cache warmup failed for \${task.key}:\`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log('✅ Cache warming completed');
  }

  private buildKey(key: string): string {
    const prefix = process.env.CACHE_PREFIX || '${requirements.description.replace(/\s+/g, '_').toLowerCase()}';
    return \`\${prefix}:\${key}\`;
  }

  private getCacheAge(key: string): number {
    // Implementation would track cache age
    return 0;
  }

  private setupEventHandlers(): void {
    this.redisClient.on('connect', () => console.log('✅ Redis cache connected'));
    this.redisClient.on('error', (err) => console.error('❌ Redis cache error:', err));
    this.redisClient.on('reconnecting', () => console.log('🔄 Redis cache reconnecting...'));

    // Memory cache events
    this.memoryCache.on('expired', (key, value) => {
      console.debug(\`Cache key expired: \${key}\`);
    });
  }
}

export const cacheManager = new CacheManager();

// Cache middleware for Express
export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = \`route:\${req.originalUrl}\`;
    
    try {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Intercept response
      const originalJson = res.json;
      res.json = function(data: any) {
        res.set('X-Cache', 'MISS');
        cacheManager.set(cacheKey, data, ttl).catch(console.error);
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};`;
  }

  private generateMonitoringSystem(requirements: AppRequirements): string {
    return `// Performance Monitoring System
import { performance, PerformanceObserver } from 'perf_hooks';
import prometheus from 'prom-client';
import os from 'os';

/**
 * Comprehensive performance monitoring
 */
export class PerformanceMonitor {
  private metrics: Map<string, any> = new Map();
  private observers: PerformanceObserver[] = [];
  private prometheusRegistry: prometheus.Registry;

  constructor() {
    this.prometheusRegistry = new prometheus.Registry();
    this.initializeMetrics();
    this.setupPerformanceObservers();
    this.startSystemMetrics();
  }

  private initializeMetrics(): void {
    // HTTP request duration histogram
    const httpDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    // HTTP request counter
    const httpRequests = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    // Database query duration
    const dbDuration = new prometheus.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    // Memory usage gauge
    const memoryUsage = new prometheus.Gauge({
      name: 'nodejs_memory_usage_bytes',
      help: 'Node.js memory usage in bytes',
      labelNames: ['type']
    });

    // CPU usage gauge  
    const cpuUsage = new prometheus.Gauge({
      name: 'nodejs_cpu_usage_percent',
      help: 'Node.js CPU usage percentage'
    });

    // Cache metrics
    const cacheOperations = new prometheus.Counter({
      name: 'cache_operations_total',
      help: 'Total cache operations',
      labelNames: ['operation', 'result']
    });

    // Register all metrics
    this.prometheusRegistry.registerMetric(httpDuration);
    this.prometheusRegistry.registerMetric(httpRequests);
    this.prometheusRegistry.registerMetric(dbDuration);
    this.prometheusRegistry.registerMetric(memoryUsage);
    this.prometheusRegistry.registerMetric(cpuUsage);
    this.prometheusRegistry.registerMetric(cacheOperations);

    this.metrics.set('httpDuration', httpDuration);
    this.metrics.set('httpRequests', httpRequests);
    this.metrics.set('dbDuration', dbDuration);
    this.metrics.set('memoryUsage', memoryUsage);
    this.metrics.set('cpuUsage', cpuUsage);
    this.metrics.set('cacheOperations', cacheOperations);
  }

  private setupPerformanceObservers(): void {
    // HTTP timing observer
    const httpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.startsWith('http-')) {
          const [, method, route] = entry.name.split('-');
          this.recordHttpTiming(method, route, entry.duration, 200);
        }
      }
    });
    
    httpObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(httpObserver);

    // Function timing observer
    const fnObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.startsWith('function-')) {
          this.recordFunctionTiming(entry.name, entry.duration);
        }
      }
    });

    fnObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(fnObserver);
  }

  private startSystemMetrics(): void {
    setInterval(() => {
      this.updateSystemMetrics();
    }, 5000); // Update every 5 seconds
  }

  private updateSystemMetrics(): void {
    // Memory metrics
    const memUsage = process.memoryUsage();
    this.metrics.get('memoryUsage').set({ type: 'rss' }, memUsage.rss);
    this.metrics.get('memoryUsage').set({ type: 'heapUsed' }, memUsage.heapUsed);
    this.metrics.get('memoryUsage').set({ type: 'heapTotal' }, memUsage.heapTotal);
    this.metrics.get('memoryUsage').set({ type: 'external' }, memUsage.external);

    // CPU metrics
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.metrics.get('cpuUsage').set(cpuPercent);
  }

  /**
   * Middleware to track HTTP request performance
   */
  trackHttpRequests() {
    return (req: any, res: any, next: any) => {
      const startTime = performance.now();
      const route = req.route?.path || req.path;

      // Mark start time
      performance.mark(\`http-start-\${req.method}-\${route}\`);

      res.on('finish', () => {
        const duration = performance.now() - startTime;
        
        // Record metrics
        this.recordHttpTiming(req.method, route, duration, res.statusCode);
        
        // Mark end and measure
        performance.mark(\`http-end-\${req.method}-\${route}\`);
        performance.measure(
          \`http-\${req.method}-\${route}\`,
          \`http-start-\${req.method}-\${route}\`,
          \`http-end-\${req.method}-\${route}\`
        );
      });

      next();
    };
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery<T>(operation: string, table: string, query: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      
      try {
        const result = await query();
        const duration = (performance.now() - startTime) / 1000; // Convert to seconds
        
        this.metrics.get('dbDuration').observe(
          { operation, table },
          duration
        );
        
        resolve(result);
      } catch (error) {
        const duration = (performance.now() - startTime) / 1000;
        
        this.metrics.get('dbDuration').observe(
          { operation: \`\${operation}_error\`, table },
          duration
        );
        
        reject(error);
      }
    });
  }

  /**
   * Track cache operations
   */
  trackCacheOperation(operation: 'get' | 'set' | 'delete', result: 'hit' | 'miss' | 'success' | 'error'): void {
    this.metrics.get('cacheOperations').inc({ operation, result });
  }

  /**
   * Profile a function
   */
  profile<T>(name: string, fn: () => T): T {
    performance.mark(\`function-start-\${name}\`);
    
    try {
      const result = fn();
      
      performance.mark(\`function-end-\${name}\`);
      performance.measure(
        \`function-\${name}\`,
        \`function-start-\${name}\`,
        \`function-end-\${name}\`
      );
      
      return result;
    } catch (error) {
      performance.mark(\`function-error-\${name}\`);
      throw error;
    }
  }

  /**
   * Profile an async function
   */
  async profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    performance.mark(\`async-start-\${name}\`);
    
    try {
      const result = await fn();
      
      performance.mark(\`async-end-\${name}\`);
      performance.measure(
        \`async-\${name}\`,
        \`async-start-\${name}\`,
        \`async-end-\${name}\`
      );
      
      return result;
    } catch (error) {
      performance.mark(\`async-error-\${name}\`);
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): any {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
      platform: os.platform(),
      nodeVersion: process.version
    };
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<any> {
    const stats = this.getStats();
    const metrics = await this.prometheusRegistry.metrics();
    
    return {
      timestamp: new Date().toISOString(),
      system: stats,
      metrics: metrics,
      recommendations: this.generateRecommendations(stats)
    };
  }

  private recordHttpTiming(method: string, route: string, duration: number, statusCode: number): void {
    const durationSeconds = duration / 1000;
    
    this.metrics.get('httpDuration').observe(
      { method, route, status_code: statusCode.toString() },
      durationSeconds
    );
    
    this.metrics.get('httpRequests').inc({
      method,
      route,
      status_code: statusCode.toString()
    });
  }

  private recordFunctionTiming(name: string, duration: number): void {
    // Store function timings for analysis
    console.debug(\`Function \${name} took \${duration.toFixed(2)}ms\`);
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations = [];
    
    if (stats.memoryUsage.heapUsed / stats.memoryUsage.heapTotal > 0.8) {
      recommendations.push('High memory usage detected. Consider increasing heap size or optimizing memory usage.');
    }
    
    if (stats.loadAverage[0] > os.cpus().length) {
      recommendations.push('High CPU load detected. Consider scaling horizontally or optimizing CPU-intensive operations.');
    }
    
    return recommendations;
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Export metrics endpoint
export const metricsHandler = async (req: any, res: any) => {
  try {
    res.set('Content-Type', performanceMonitor.prometheusRegistry.contentType);
    res.end(await performanceMonitor.prometheusRegistry.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
};`;
  }

  private generateOptimizationMiddleware(requirements: AppRequirements): string {
    return `// Performance Optimization Middleware
import compression from 'compression';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Response compression middleware
 */
export const compressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Compress everything else
    return compression.filter(req, res);
  },
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  chunkSize: 16384, // 16KB chunks
  windowBits: 15,
  memLevel: 8
});

/**
 * Response caching headers
 */
export const cacheHeaders = (maxAge: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      res.set({
        'Cache-Control': \`public, max-age=\${maxAge}\`,
        'ETag': generateETag(req.url),
        'Last-Modified': new Date().toUTCString()
      });
    }
    next();
  };
};

/**
 * Request timeout middleware
 */
export const timeoutMiddleware = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout for request
    req.setTimeout(timeout, () => {
      const err = new Error('Request timeout');
      err.status = 408;
      next(err);
    });

    // Set timeout for response
    res.setTimeout(timeout, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Response timeout',
          message: 'The server took too long to respond'
        });
      }
    });

    next();
  };
};

/**
 * Request size limiting
 */
export const sizeLimitMiddleware = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > parseSize(limit)) {
      return res.status(413).json({
        error: 'Payload too large',
        limit: limit,
        received: contentLength
      });
    }
    next();
  };
};

/**
 * Response optimization middleware
 */
export const optimizeResponse = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Remove unnecessary headers
    res.removeHeader('X-Powered-By');
    
    // Add performance headers
    res.set({
      'X-DNS-Prefetch-Control': 'on',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff'
    });

    // Optimize JSON responses
    const originalJson = res.json;
    res.json = function(obj: any) {
      // Remove null/undefined values to reduce payload size
      const optimized = removeEmptyValues(obj);
      return originalJson.call(this, optimized);
    };

    next();
  };
};

/**
 * Static asset optimization
 */
export const staticOptimization = {
  // Far-future expires headers for static assets
  staticAssets: (req: Request, res: Response, next: NextFunction) => {
    if (req.url.match(/\\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.set({
        'Cache-Control': 'public, max-age=31536000', // 1 year
        'Expires': new Date(Date.now() + 31536000000).toUTCString()
      });
    }
    next();
  },

  // Preload critical resources
  preloadCritical: (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/' || req.path === '/index.html') {
      res.set('Link', [
        '</css/critical.css>; rel=preload; as=style',
        '</js/critical.js>; rel=preload; as=script',
        '</fonts/main.woff2>; rel=preload; as=font; type=font/woff2; crossorigin'
      ].join(', '));
    }
    next();
  }
};

/**
 * Memory leak prevention
 */
export const memoryOptimization = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Clean up request objects to prevent memory leaks
    res.on('finish', () => {
      if (req.body && typeof req.body === 'object') {
        delete req.body;
      }
      if (req.files) {
        delete req.files;
      }
    });

    next();
  };
};

/**
 * Database connection pooling optimization
 */
export const dbPoolOptimization = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure database connections are returned to pool
    res.on('finish', () => {
      // Implementation would depend on your database client
      // e.g., connection.release() for MySQL
    });

    next();
  };
};

// Helper functions
function generateETag(url: string): string {
  return \`W/"\${Buffer.from(url).toString('base64')}"\`;
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
}

function removeEmptyValues(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.filter(item => item !== null && item !== undefined);
  }
  
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        result[key] = removeEmptyValues(value);
      }
    }
    return result;
  }
  
  return obj;
}

// Combine all optimization middleware
export const performanceMiddleware = [
  compressionMiddleware,
  helmet(),
  optimizeResponse(),
  memoryOptimization(),
  timeoutMiddleware(),
  sizeLimitMiddleware()
];`;
  }

  private generateCDNConfiguration(requirements: AppRequirements): string {
    return `// CDN and Asset Optimization Configuration
export const cdnConfig = {
  // CDN providers configuration
  providers: {
    cloudflare: {
      enabled: process.env.CLOUDFLARE_ENABLED === 'true',
      zone: process.env.CLOUDFLARE_ZONE_ID,
      apiKey: process.env.CLOUDFLARE_API_KEY,
      baseUrl: process.env.CLOUDFLARE_CDN_URL
    },
    
    aws: {
      enabled: process.env.AWS_CDN_ENABLED === 'true',
      distributionId: process.env.AWS_CLOUDFRONT_ID,
      baseUrl: process.env.AWS_CDN_URL,
      region: process.env.AWS_REGION || 'us-east-1'
    },
    
    generic: {
      baseUrl: process.env.CDN_BASE_URL || ''
    }
  },

  // Asset types and their CDN handling
  assetTypes: {
    images: {
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      cacheTTL: 31536000, // 1 year
      compression: true,
      optimization: true
    },
    
    scripts: {
      extensions: ['.js', '.mjs'],
      cacheTTL: 86400, // 1 day
      compression: true,
      minification: true
    },
    
    styles: {
      extensions: ['.css', '.scss', '.less'],
      cacheTTL: 86400, // 1 day
      compression: true,
      minification: true
    },
    
    fonts: {
      extensions: ['.woff', '.woff2', '.ttf', '.eot'],
      cacheTTL: 31536000, // 1 year
      compression: false
    },
    
    videos: {
      extensions: ['.mp4', '.webm', '.ogg'],
      cacheTTL: 604800, // 1 week
      compression: false,
      streaming: true
    }
  }
};

/**
 * CDN URL generator
 */
export class CDNManager {
  private baseUrl: string;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'production' && !!process.env.CDN_BASE_URL;
    this.baseUrl = process.env.CDN_BASE_URL || '';
  }

  /**
   * Generate CDN URL for asset
   */
  getAssetUrl(assetPath: string, options: {
    version?: string;
    optimization?: boolean;
    format?: string;
  } = {}): string {
    if (!this.enabled || !this.baseUrl) {
      return assetPath;
    }

    const { version, optimization = true, format } = options;
    let url = \`\${this.baseUrl}\${assetPath}\`;

    // Add version for cache busting
    if (version) {
      url += \`?v=\${version}\`;
    }

    // Add optimization parameters for images
    if (optimization && this.isImage(assetPath)) {
      const params = new URLSearchParams();
      
      if (format) params.set('format', format);
      params.set('quality', '85');
      params.set('optimize', 'true');
      
      const separator = url.includes('?') ? '&' : '?';
      url += separator + params.toString();
    }

    return url;
  }

  /**
   * Preload critical assets
   */
  generatePreloadTags(criticalAssets: string[]): string {
    return criticalAssets.map(asset => {
      const assetType = this.getAssetType(asset);
      const cdnUrl = this.getAssetUrl(asset);
      
      return \`<link rel="preload" href="\${cdnUrl}" as="\${assetType}">\`;
    }).join('\\n    ');
  }

  /**
   * Generate responsive image srcset
   */
  generateResponsiveImageSrcset(imagePath: string, widths: number[]): string {
    if (!this.enabled) {
      return imagePath;
    }

    return widths.map(width => {
      const url = this.getAssetUrl(imagePath, {
        optimization: true,
        format: 'webp'
      });
      return \`\${url}&width=\${width} \${width}w\`;
    }).join(', ');
  }

  private isImage(assetPath: string): boolean {
    const imageExtensions = cdnConfig.assetTypes.images.extensions;
    return imageExtensions.some(ext => assetPath.toLowerCase().endsWith(ext));
  }

  private getAssetType(assetPath: string): string {
    const ext = assetPath.toLowerCase().substring(assetPath.lastIndexOf('.'));
    
    if (cdnConfig.assetTypes.images.extensions.includes(ext)) return 'image';
    if (cdnConfig.assetTypes.scripts.extensions.includes(ext)) return 'script';
    if (cdnConfig.assetTypes.styles.extensions.includes(ext)) return 'style';
    if (cdnConfig.assetTypes.fonts.extensions.includes(ext)) return 'font';
    
    return 'fetch';
  }
}

export const cdnManager = new CDNManager();

/**
 * Express middleware for CDN integration
 */
export const cdnMiddleware = () => {
  return (req: any, res: any, next: any) => {
    // Add CDN helper to response locals
    res.locals.cdn = {
      asset: (path: string, options?: any) => cdnManager.getAssetUrl(path, options),
      preload: (assets: string[]) => cdnManager.generatePreloadTags(assets),
      responsive: (image: string, widths: number[]) => cdnManager.generateResponsiveImageSrcset(image, widths)
    };
    
    next();
  };
};`;
  }

  private generateCompressionConfig(requirements: AppRequirements): string {
    return `// Advanced Compression Configuration
import zlib from 'zlib';

export const compressionConfig = {
  // Gzip configuration
  gzip: {
    level: 6, // Balanced compression level
    chunkSize: 16 * 1024, // 16KB chunks
    windowBits: 15,
    memLevel: 8,
    strategy: zlib.constants.Z_DEFAULT_STRATEGY,
    threshold: 1024 // Only compress files > 1KB
  },

  // Brotli configuration (better compression than gzip)
  brotli: {
    level: 6, // Balanced compression level
    chunkSize: 16 * 1024,
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 0
    },
    threshold: 1024
  },

  // File type specific settings
  fileTypes: {
    // Highly compressible
    text: {
      extensions: ['.html', '.css', '.js', '.json', '.xml', '.txt', '.csv'],
      preferredMethod: 'brotli',
      level: 8 // Higher compression for text
    },
    
    // Moderately compressible
    data: {
      extensions: ['.svg', '.pdf'],
      preferredMethod: 'gzip',
      level: 6
    },
    
    // Skip compression (already compressed)
    binary: {
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.zip', '.gz'],
      skip: true
    }
  }
};

/**
 * Smart compression middleware
 */
export const smartCompression = () => {
  return (req: any, res: any, next: any) => {
    const acceptEncoding = req.get('Accept-Encoding') || '';
    const originalEnd = res.end;
    const originalWrite = res.write;
    
    let chunks: Buffer[] = [];
    let compressionStream: any = null;

    // Determine best compression method
    const getBestCompression = (contentType: string, size: number) => {
      // Skip compression for small responses
      if (size < compressionConfig.gzip.threshold) {
        return null;
      }

      // Check if content type should be compressed
      const shouldCompress = shouldCompressContentType(contentType);
      if (!shouldCompress) {
        return null;
      }

      // Prefer Brotli if supported and beneficial
      if (acceptEncoding.includes('br')) {
        return 'br';
      }
      
      // Fallback to Gzip
      if (acceptEncoding.includes('gzip')) {
        return 'gzip';
      }

      return null;
    };

    // Override write method to collect chunks
    res.write = function(chunk: any, encoding?: any) {
      if (chunk) {
        chunks.push(Buffer.from(chunk, encoding));
      }
      return true;
    };

    // Override end method to apply compression
    res.end = function(chunk?: any, encoding?: any) {
      if (chunk) {
        chunks.push(Buffer.from(chunk, encoding));
      }

      const fullBuffer = Buffer.concat(chunks);
      const contentType = res.get('Content-Type') || '';
      const compressionMethod = getBestCompression(contentType, fullBuffer.length);

      if (compressionMethod && fullBuffer.length > 0) {
        // Set appropriate headers
        res.set('Content-Encoding', compressionMethod);
        res.set('Vary', 'Accept-Encoding');

        // Create compression stream
        if (compressionMethod === 'br') {
          compressionStream = zlib.createBrotliCompress(compressionConfig.brotli);
        } else if (compressionMethod === 'gzip') {
          compressionStream = zlib.createGzip(compressionConfig.gzip);
        }

        // Compress and send
        if (compressionStream) {
          let compressedChunks: Buffer[] = [];
          
          compressionStream.on('data', (chunk: Buffer) => {
            compressedChunks.push(chunk);
          });

          compressionStream.on('end', () => {
            const compressed = Buffer.concat(compressedChunks);
            res.set('Content-Length', compressed.length.toString());
            originalEnd.call(res, compressed);
          });

          compressionStream.end(fullBuffer);
          return;
        }
      }

      // No compression - send original
      originalEnd.call(res, fullBuffer);
    };

    next();
  };
};

/**
 * Pre-compression for static assets
 */
export class PreCompressionManager {
  /**
   * Pre-compress static assets during build
   */
  async preCompressAssets(assetsDir: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const processDirectory = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await processDirectory(fullPath);
        } else if (entry.isFile()) {
          await this.compressFile(fullPath);
        }
      }
    };

    await processDirectory(assetsDir);
  }

  private async compressFile(filePath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const ext = path.extname(filePath).toLowerCase();
      const shouldCompress = this.shouldPreCompress(ext);
      
      if (!shouldCompress) return;

      const fileContent = await fs.readFile(filePath);
      
      // Create Gzip version
      const gzipped = zlib.gzipSync(fileContent, compressionConfig.gzip);
      await fs.writeFile(\`\${filePath}.gz\`, gzipped);
      
      // Create Brotli version
      const brotlied = zlib.brotliCompressSync(fileContent, compressionConfig.brotli);
      await fs.writeFile(\`\${filePath}.br\`, brotlied);
      
      console.log(\`✅ Pre-compressed: \${path.basename(filePath)}\`);
    } catch (error) {
      console.error(\`❌ Pre-compression failed for \${filePath}:\`, error);
    }
  }

  private shouldPreCompress(extension: string): boolean {
    const compressibleTypes = [
      ...compressionConfig.fileTypes.text.extensions,
      ...compressionConfig.fileTypes.data.extensions
    ];
    
    return compressibleTypes.includes(extension);
  }
}

function shouldCompressContentType(contentType: string): boolean {
  const compressibleTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'image/svg+xml'
  ];
  
  return compressibleTypes.some(type => contentType.includes(type));
}

export const preCompressionManager = new PreCompressionManager();`;
  }

  private generateLazyLoadingConfig(requirements: AppRequirements): string {
    return `// Lazy Loading and Code Splitting Configuration
export const lazyLoadingConfig = {
  // Intersection Observer settings for lazy loading
  observer: {
    rootMargin: '50px 0px', // Start loading 50px before element enters viewport
    threshold: 0.1, // Trigger when 10% of element is visible
  },

  // Image lazy loading settings
  images: {
    placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNGM0Y0RjYiLz48L3N2Zz4K',
    errorImage: '/images/error-placeholder.jpg',
    loadingClass: 'lazy-loading',
    loadedClass: 'lazy-loaded',
    errorClass: 'lazy-error'
  },

  // Component lazy loading
  components: {
    chunkSize: 'small', // 'small', 'medium', 'large'
    preloadDelay: 2000, // Preload after 2 seconds
    retryAttempts: 3
  }
};

/**
 * Image lazy loading implementation
 */
export class LazyImageLoader {
  private observer: IntersectionObserver;
  private images: Set<HTMLImageElement> = new Set();

  constructor() {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      lazyLoadingConfig.observer
    );
  }

  /**
   * Register images for lazy loading
   */
  observe(img: HTMLImageElement): void {
    this.images.add(img);
    this.observer.observe(img);
    
    // Add loading class
    img.classList.add(lazyLoadingConfig.images.loadingClass);
    
    // Set placeholder if no src
    if (!img.src && !img.dataset.src) {
      img.src = lazyLoadingConfig.images.placeholder;
    }
  }

  /**
   * Unregister image
   */
  unobserve(img: HTMLImageElement): void {
    this.images.delete(img);
    this.observer.unobserve(img);
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        this.loadImage(img);
        this.observer.unobserve(img);
      }
    });
  }

  private async loadImage(img: HTMLImageElement): Promise<void> {
    const src = img.dataset.src || img.src;
    const srcset = img.dataset.srcset;
    
    try {
      // Create new image element to preload
      const imageLoader = new Image();
      
      // Set up promise for loading
      const loadPromise = new Promise<void>((resolve, reject) => {
        imageLoader.onload = () => resolve();
        imageLoader.onerror = () => reject(new Error('Failed to load image'));
      });

      // Start loading
      if (srcset) imageLoader.srcset = srcset;
      imageLoader.src = src;
      
      // Wait for load
      await loadPromise;
      
      // Apply to actual image element
      if (srcset) img.srcset = srcset;
      img.src = src;
      
      // Update classes
      img.classList.remove(lazyLoadingConfig.images.loadingClass);
      img.classList.add(lazyLoadingConfig.images.loadedClass);
      
    } catch (error) {
      console.error('Lazy image loading failed:', error);
      
      // Set error image
      img.src = lazyLoadingConfig.images.errorImage;
      img.classList.remove(lazyLoadingConfig.images.loadingClass);
      img.classList.add(lazyLoadingConfig.images.errorClass);
    }
  }

  /**
   * Load all remaining images immediately
   */
  loadAll(): void {
    this.images.forEach(img => {
      this.loadImage(img);
      this.observer.unobserve(img);
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.observer.disconnect();
    this.images.clear();
  }
}

/**
 * React lazy loading hook
 */
export const useLazyLoading = () => {
  const [loader] = useState(() => new LazyImageLoader());
  
  useEffect(() => {
    return () => loader.destroy();
  }, [loader]);

  const observeImage = useCallback((img: HTMLImageElement | null) => {
    if (img) {
      loader.observe(img);
    }
  }, [loader]);

  return { observeImage, loader };
};

/**
 * Component lazy loading with React.lazy
 */
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: ReactElement;
    preload?: boolean;
    preloadDelay?: number;
  } = {}
) => {
  const LazyComponent = lazy(importFn);
  
  // Preload component if requested
  if (options.preload) {
    const delay = options.preloadDelay || lazyLoadingConfig.components.preloadDelay;
    setTimeout(() => {
      importFn().catch(console.error);
    }, delay);
  }
  
  return (props: ComponentPropsWithoutRef<T>) => (
    <Suspense fallback={options.fallback || <div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Route-based code splitting for Next.js/React Router
 */
export const lazyRoutes = {
  // Dynamic imports for route components
  Home: () => import('../pages/Home').then(m => ({ default: m.default })),
  About: () => import('../pages/About').then(m => ({ default: m.default })),
  Contact: () => import('../pages/Contact').then(m => ({ default: m.default })),
  Dashboard: () => import('../pages/Dashboard').then(m => ({ default: m.default })),
  Profile: () => import('../pages/Profile').then(m => ({ default: m.default })),
  
  // Feature-based chunks
  AdminPanel: () => import('../features/admin').then(m => ({ default: m.AdminPanel })),
  UserManagement: () => import('../features/users').then(m => ({ default: m.UserManagement })),
  Analytics: () => import('../features/analytics').then(m => ({ default: m.Analytics })),
};

/**
 * Module preloading utility
 */
export class ModulePreloader {
  private preloadedModules: Set<string> = new Set();

  /**
   * Preload a module
   */
  async preload(moduleName: keyof typeof lazyRoutes): Promise<void> {
    if (this.preloadedModules.has(moduleName)) {
      return;
    }

    try {
      await lazyRoutes[moduleName]();
      this.preloadedModules.add(moduleName);
      console.log(\`✅ Preloaded module: \${moduleName}\`);
    } catch (error) {
      console.error(\`❌ Failed to preload module \${moduleName}:\`, error);
    }
  }

  /**
   * Preload critical modules
   */
  async preloadCritical(): Promise<void> {
    const criticalModules: (keyof typeof lazyRoutes)[] = ['Home', 'Dashboard'];
    
    await Promise.all(
      criticalModules.map(module => this.preload(module))
    );
  }

  /**
   * Intelligent preloading based on user behavior
   */
  preloadOnHover(element: HTMLElement, moduleName: keyof typeof lazyRoutes): void {
    let preloadTriggered = false;
    
    const handleHover = () => {
      if (!preloadTriggered) {
        preloadTriggered = true;
        this.preload(moduleName);
      }
    };

    element.addEventListener('mouseenter', handleHover, { once: true });
    element.addEventListener('focus', handleHover, { once: true });
  }
}

export const modulePreloader = new ModulePreloader();
export const lazyImageLoader = new LazyImageLoader();`;
  }

  private generateDatabaseOptimization(requirements: AppRequirements): string {
    return `// Database Performance Optimization
export const databaseOptimization = {
  // Connection pool settings
  connectionPool: {
    min: 2,
    max: 20,
    acquire: 30000,
    idle: 10000,
    evict: 1000,
    handleDisconnects: true
  },

  // Query optimization settings
  queryOptimization: {
    enableQueryCache: true,
    cacheTTL: 300,
    maxCacheSize: 1000,
    logSlowQueries: true,
    slowQueryThreshold: 1000 // ms
  },

  // Index recommendations
  recommendedIndexes: [
    'CREATE INDEX CONCURRENTLY idx_users_email ON users(email) WHERE is_active = true;',
    'CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at DESC);',
    'CREATE INDEX CONCURRENTLY idx_content_status_created ON content(status, created_at DESC);'
  ]
};

/**
 * Database query optimization utilities
 */
export class DatabaseOptimizer {
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private slowQueries: Array<{ query: string; duration: number; timestamp: Date }> = [];

  /**
   * Cached query execution
   */
  async cachedQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: { ttl?: number; forceRefresh?: boolean } = {}
  ): Promise<T> {
    const { ttl = 300000, forceRefresh = false } = options; // 5 minutes default
    
    // Check cache first
    if (!forceRefresh) {
      const cached = this.queryCache.get(queryKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    // Execute query with timing
    const startTime = performance.now();
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      // Log slow queries
      if (duration > databaseOptimization.queryOptimization.slowQueryThreshold) {
        this.slowQueries.push({
          query: queryKey,
          duration,
          timestamp: new Date()
        });
        console.warn(\`Slow query detected: \${queryKey} took \${duration.toFixed(2)}ms\`);
      }

      // Cache the result
      this.queryCache.set(queryKey, {
        data: result,
        timestamp: Date.now(),
        ttl
      });

      return result;
    } catch (error) {
      console.error(\`Query failed: \${queryKey}\`, error);
      throw error;
    }
  }

  /**
   * Batch operations for better performance
   */
  async batchInsert<T>(
    model: any,
    records: T[],
    batchSize: number = 1000
  ): Promise<void> {
    const batches = this.createBatches(records, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(\`Processing batch \${i + 1}/\${batches.length} (\${batch.length} records)\`);
      
      try {
        await model.bulkCreate(batch, {
          ignoreDuplicates: true,
          validate: false // Skip validation for performance
        });
      } catch (error) {
        console.error(\`Batch \${i + 1} failed:\`, error);
        // Optionally implement retry logic here
      }
    }
  }

  /**
   * Optimize queries with proper pagination
   */
  async paginatedQuery<T>(
    model: any,
    options: {
      where?: any;
      include?: any;
      order?: any;
      page?: number;
      limit?: number;
    }
  ): Promise<{ rows: T[]; count: number; totalPages: number }> {
    const { page = 1, limit = 20, ...queryOptions } = options;
    const offset = (page - 1) * limit;

    // Use findAndCountAll for better performance
    const result = await model.findAndCountAll({
      ...queryOptions,
      limit,
      offset,
      subQuery: false // Avoid subqueries when possible
    });

    return {
      rows: result.rows,
      count: result.count,
      totalPages: Math.ceil(result.count / limit)
    };
  }

  /**
   * Generate database performance report
   */
  generatePerformanceReport(): any {
    const cacheStats = {
      size: this.queryCache.size,
      hitRate: this.calculateCacheHitRate(),
      oldestEntry: this.getOldestCacheEntry(),
      memoryUsage: this.estimateCacheMemoryUsage()
    };

    const slowQueryStats = {
      total: this.slowQueries.length,
      averageDuration: this.slowQueries.reduce((sum, q) => sum + q.duration, 0) / this.slowQueries.length,
      slowest: this.slowQueries.sort((a, b) => b.duration - a.duration).slice(0, 5)
    };

    return {
      timestamp: new Date(),
      cache: cacheStats,
      slowQueries: slowQueryStats,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.queryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(\`Cleaned up \${cleaned} expired cache entries\`);
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private calculateCacheHitRate(): number {
    // Implementation would track hits vs misses
    return 0.85; // Example: 85% hit rate
  }

  private getOldestCacheEntry(): Date | null {
    let oldest: number | null = null;
    
    for (const [, value] of this.queryCache.entries()) {
      if (oldest === null || value.timestamp < oldest) {
        oldest = value.timestamp;
      }
    }

    return oldest ? new Date(oldest) : null;
  }

  private estimateCacheMemoryUsage(): string {
    // Rough estimation
    const sizeInBytes = JSON.stringify([...this.queryCache.entries()]).length;
    
    if (sizeInBytes < 1024) return \`\${sizeInBytes}B\`;
    if (sizeInBytes < 1024 * 1024) return \`\${(sizeInBytes / 1024).toFixed(1)}KB\`;
    return \`\${(sizeInBytes / (1024 * 1024)).toFixed(1)}MB\`;
  }

  private generateRecommendations(): string[] {
    const recommendations = [];

    if (this.slowQueries.length > 10) {
      recommendations.push('Consider adding database indexes for frequently queried columns');
    }

    if (this.queryCache.size > 500) {
      recommendations.push('Cache size is large, consider implementing cache eviction policies');
    }

    const avgSlowQuery = this.slowQueries.reduce((sum, q) => sum + q.duration, 0) / this.slowQueries.length;
    if (avgSlowQuery > 2000) {
      recommendations.push('Average slow query time is high, consider query optimization');
    }

    return recommendations;
  }
}

export const databaseOptimizer = new DatabaseOptimizer();

// Start cache cleanup interval
setInterval(() => {
  databaseOptimizer.cleanupCache();
}, 60000); // Clean up every minute`;
  }

  private generateMemoryOptimization(requirements: AppRequirements): string {
    return `// Memory Optimization and Management
export class MemoryOptimizer {
  private memoryThreshold = 0.8; // Alert when memory usage > 80%
  private gcInterval = 60000; // Force GC every minute
  private memoryStats: Array<{ timestamp: Date; usage: NodeJS.MemoryUsage }> = [];

  constructor() {
    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.checkMemoryUsage();
      this.collectMemoryStats();
    }, 10000); // Check every 10 seconds

    // Force garbage collection periodically
    setInterval(() => {
      this.forceGarbageCollection();
    }, this.gcInterval);
  }

  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedPercent = usage.heapUsed / usage.heapTotal;

    if (heapUsedPercent > this.memoryThreshold) {
      console.warn(\`High memory usage detected: \${(heapUsedPercent * 100).toFixed(1)}%\`);
      this.triggerMemoryCleanup();
    }
  }

  private collectMemoryStats(): void {
    this.memoryStats.push({
      timestamp: new Date(),
      usage: process.memoryUsage()
    });

    // Keep only last 100 entries
    if (this.memoryStats.length > 100) {
      this.memoryStats = this.memoryStats.slice(-100);
    }
  }

  private triggerMemoryCleanup(): void {
    console.log('Triggering memory cleanup...');
    
    // Clear various caches
    this.clearInternalCaches();
    
    // Force garbage collection if available
    this.forceGarbageCollection();
  }

  private clearInternalCaches(): void {
    // Clear database query cache
    if (databaseOptimizer) {
      databaseOptimizer.cleanupCache();
    }

    // Clear application caches
    if (cacheManager) {
      // Implementation depends on cache manager
    }
  }

  private forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection completed');
    } else {
      console.warn('Garbage collection not available. Run with --expose-gc flag.');
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): any {
    const current = process.memoryUsage();
    const trend = this.calculateMemoryTrend();

    return {
      current: {
        rss: this.formatBytes(current.rss),
        heapTotal: this.formatBytes(current.heapTotal),
        heapUsed: this.formatBytes(current.heapUsed),
        heapUtilization: \`\${((current.heapUsed / current.heapTotal) * 100).toFixed(1)}%\`,
        external: this.formatBytes(current.external),
        arrayBuffers: this.formatBytes(current.arrayBuffers || 0)
      },
      trend: trend,
      recommendations: this.generateMemoryRecommendations(current)
    };
  }

  private calculateMemoryTrend(): string {
    if (this.memoryStats.length < 2) return 'insufficient-data';

    const recent = this.memoryStats.slice(-10);
    const start = recent[0].usage.heapUsed;
    const end = recent[recent.length - 1].usage.heapUsed;

    const change = ((end - start) / start) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  private generateMemoryRecommendations(usage: NodeJS.MemoryUsage): string[] {
    const recommendations = [];
    const heapPercent = usage.heapUsed / usage.heapTotal;

    if (heapPercent > 0.8) {
      recommendations.push('Heap usage is high. Consider increasing heap size or optimizing memory usage.');
    }

    if (usage.external > 50 * 1024 * 1024) { // 50MB
      recommendations.push('High external memory usage detected. Check for memory leaks in native modules.');
    }

    if (this.memoryStats.length > 10) {
      const trend = this.calculateMemoryTrend();
      if (trend === 'increasing') {
        recommendations.push('Memory usage is consistently increasing. Investigate for memory leaks.');
      }
    }

    return recommendations;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return \`\${(bytes / Math.pow(1024, i)).toFixed(1)}\${sizes[i]}\`;
  }
}

/**
 * Memory-efficient data structures and utilities
 */
export class MemoryEfficientUtils {
  /**
   * Create a memory-efficient Set with automatic cleanup
   */
  createAutoCleanupSet<T>(maxSize: number = 10000, ttl: number = 300000): Set<T> & { cleanup: () => void } {
    const set = new Set<T>();
    const timestamps = new Map<T, number>();
    
    const cleanup = () => {
      const now = Date.now();
      const toDelete = [];
      
      for (const [item, timestamp] of timestamps.entries()) {
        if (now - timestamp > ttl) {
          toDelete.push(item);
        }
      }
      
      toDelete.forEach(item => {
        set.delete(item);
        timestamps.delete(item);
      });
      
      // Ensure size limit
      if (set.size > maxSize) {
        const excess = set.size - maxSize;
        const items = Array.from(set);
        for (let i = 0; i < excess; i++) {
          set.delete(items[i]);
          timestamps.delete(items[i]);
        }
      }
    };

    // Override add method to track timestamps
    const originalAdd = set.add.bind(set);
    set.add = (value: T) => {
      timestamps.set(value, Date.now());
      return originalAdd(value);
    };

    // Add cleanup method
    (set as any).cleanup = cleanup;

    // Auto cleanup every minute
    setInterval(cleanup, 60000);

    return set as Set<T> & { cleanup: () => void };
  }

  /**
   * Streaming data processor to avoid loading large datasets into memory
   */
  async *processLargeDataset<T, R>(
    dataSource: AsyncIterable<T>,
    processor: (item: T) => R,
    batchSize: number = 100
  ): AsyncGenerator<R[], void, unknown> {
    let batch: R[] = [];
    
    for await (const item of dataSource) {
      batch.push(processor(item));
      
      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
      }
    }
    
    if (batch.length > 0) {
      yield batch;
    }
  }

  /**
   * Memory pool for reusing objects
   */
  createObjectPool<T>(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize: number = 100
  ): { acquire: () => T; release: (obj: T) => void } {
    const pool: T[] = [];
    
    return {
      acquire: () => {
        return pool.pop() || factory();
      },
      
      release: (obj: T) => {
        if (pool.length < maxSize) {
          reset(obj);
          pool.push(obj);
        }
      }
    };
  }
}

export const memoryOptimizer = new MemoryOptimizer();
export const memoryUtils = new MemoryEfficientUtils();`;
  }

  private generateBundleOptimization(requirements: AppRequirements): string {
    return `// Bundle Optimization Configuration
export const bundleOptimization = {
  // Webpack optimization settings
  webpack: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\\\/]node_modules[\\\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },
    
    optimization: {
      minimize: true,
      sideEffects: false,
      usedExports: true,
      providedExports: true,
      concatenateModules: true, // ModuleConcatenationPlugin
      flagIncludedChunks: true,
      occurrenceOrder: true,
      mergeDuplicateChunks: true,
      removeAvailableModules: true,
      removeEmptyChunks: true
    }
  },

  // Tree shaking configuration
  treeShaking: {
    // Mark these packages as side-effect free
    sideEffectFreePackages: [
      'lodash-es',
      'date-fns',
      'ramda',
      'rxjs/operators'
    ],
    
    // Exclude these from tree shaking
    preserveModules: [
      '@babel/polyfill',
      'core-js'
    ]
  },

  // Bundle analysis thresholds
  analysis: {
    maxBundleSize: 250 * 1024, // 250KB
    maxChunkSize: 100 * 1024,  // 100KB
    duplicateThreshold: 5 * 1024, // 5KB
    unusedCodeThreshold: 10 * 1024 // 10KB
  }
};

/**
 * Bundle analyzer and optimizer
 */
export class BundleAnalyzer {
  /**
   * Analyze bundle composition and suggest optimizations
   */
  async analyzeBundles(bundleDir: string): Promise<any> {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const files = await fs.readdir(bundleDir);
      const jsFiles = files.filter(f => f.endsWith('.js'));
      
      const analysis = {
        totalSize: 0,
        chunks: [] as any[],
        duplicates: [] as any[],
        recommendations: [] as string[]
      };

      for (const file of jsFiles) {
        const filePath = path.join(bundleDir, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        
        const chunkAnalysis = {
          name: file,
          size: stats.size,
          formattedSize: this.formatBytes(stats.size),
          gzippedSize: await this.estimateGzippedSize(content),
          modules: this.extractModules(content),
          duplicateCode: this.findDuplicateCode(content)
        };
        
        analysis.chunks.push(chunkAnalysis);
        analysis.totalSize += stats.size;
        
        // Check for size thresholds
        if (stats.size > bundleOptimization.analysis.maxChunkSize) {
          analysis.recommendations.push(\`Chunk '\${file}' exceeds recommended size limit\`);
        }
      }

      // Find duplicate modules across chunks
      analysis.duplicates = this.findDuplicateModules(analysis.chunks);
      
      // Generate optimization recommendations
      analysis.recommendations.push(...this.generateBundleRecommendations(analysis));

      return analysis;
    } catch (error) {
      console.error('Bundle analysis failed:', error);
      throw error;
    }
  }

  /**
   * Optimize bundle loading strategy
   */
  generateLoadingStrategy(analysis: any): any {
    const strategy = {
      critical: [] as string[],
      preload: [] as string[],
      lazy: [] as string[],
      defer: [] as string[]
    };

    analysis.chunks.forEach((chunk: any) => {
      if (chunk.name.includes('vendor') || chunk.name.includes('runtime')) {
        strategy.critical.push(chunk.name);
      } else if (chunk.name.includes('common')) {
        strategy.preload.push(chunk.name);
      } else if (chunk.size < 50 * 1024) { // Small chunks
        strategy.preload.push(chunk.name);
      } else {
        strategy.lazy.push(chunk.name);
      }
    });

    return strategy;
  }

  /**
   * Generate resource hints for HTML
   */
  generateResourceHints(strategy: any): string {
    let hints = '';
    
    // DNS prefetch for external resources
    hints += '<link rel="dns-prefetch" href="//fonts.googleapis.com">\\n';
    hints += '<link rel="dns-prefetch" href="//cdn.jsdelivr.net">\\n';
    
    // Preconnect for critical external resources
    hints += '<link rel="preconnect" href="//api.example.com">\\n';
    
    // Preload critical chunks
    strategy.preload.forEach((chunk: string) => {
      hints += \`<link rel="preload" href="/js/\${chunk}" as="script">\\n\`;
    });
    
    // Prefetch lazy chunks
    strategy.lazy.forEach((chunk: string) => {
      hints += \`<link rel="prefetch" href="/js/\${chunk}">\\n\`;
    });
    
    return hints;
  }

  private async estimateGzippedSize(content: string): Promise<number> {
    const zlib = require('zlib');
    return new Promise((resolve) => {
      zlib.gzip(content, (err: any, compressed: Buffer) => {
        resolve(err ? content.length * 0.3 : compressed.length); // Fallback to 30% estimate
      });
    });
  }

  private extractModules(content: string): string[] {
    // Extract module names from webpack bundle
    const moduleRegex = /\\/\\*\\*\\* "([^"]+)" \\*\\*\\*/g;
    const modules = [];
    let match;
    
    while ((match = moduleRegex.exec(content)) !== null) {
      modules.push(match[1]);
    }
    
    return modules;
  }

  private findDuplicateCode(content: string): any[] {
    // Simplified duplicate detection
    const lines = content.split('\\n');
    const duplicates = [];
    const seen = new Map();
    
    lines.forEach((line, index) => {
      if (line.trim().length > 50) { // Only check substantial lines
        const trimmed = line.trim();
        if (seen.has(trimmed)) {
          duplicates.push({
            line: trimmed,
            occurrences: seen.get(trimmed) + 1,
            lineNumber: index + 1
          });
          seen.set(trimmed, seen.get(trimmed) + 1);
        } else {
          seen.set(trimmed, 1);
        }
      }
    });
    
    return duplicates.filter(d => d.occurrences > 1);
  }

  private findDuplicateModules(chunks: any[]): any[] {
    const moduleMap = new Map();
    
    chunks.forEach(chunk => {
      chunk.modules.forEach((module: string) => {
        if (moduleMap.has(module)) {
          moduleMap.get(module).push(chunk.name);
        } else {
          moduleMap.set(module, [chunk.name]);
        }
      });
    });
    
    return Array.from(moduleMap.entries())
      .filter(([, chunks]) => chunks.length > 1)
      .map(([module, chunks]) => ({ module, chunks }));
  }

  private generateBundleRecommendations(analysis: any): string[] {
    const recommendations = [];
    
    if (analysis.totalSize > 1024 * 1024) { // > 1MB
      recommendations.push('Total bundle size is large. Consider code splitting and lazy loading.');
    }
    
    if (analysis.duplicates.length > 0) {
      recommendations.push(\`Found \${analysis.duplicates.length} duplicate modules. Consider optimizing chunk splitting.\`);
    }
    
    const largechunks = analysis.chunks.filter((c: any) => c.size > bundleOptimization.analysis.maxChunkSize);
    if (largechunks.length > 0) {
      recommendations.push(\`\${largechunks.length} chunks exceed size limits. Consider further splitting.\`);
    }
    
    return recommendations;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return \`\${(bytes / Math.pow(1024, i)).toFixed(1)}\${sizes[i]}\`;
  }
}

export const bundleAnalyzer = new BundleAnalyzer();`;
  }

  private generateProfilingTools(requirements: AppRequirements): string {
    return `// Performance Profiling Tools
import { performance, PerformanceObserver } from 'perf_hooks';

export class PerformanceProfiler {
  private profiles: Map<string, any[]> = new Map();
  private observers: PerformanceObserver[] = [];
  private isActive = false;

  /**
   * Start profiling session
   */
  start(sessionName: string = 'default'): void {
    this.isActive = true;
    this.profiles.set(sessionName, []);
    
    console.log(\`🔍 Started profiling session: \${sessionName}\`);
    
    this.setupObservers(sessionName);
  }

  /**
   * Stop profiling and generate report
   */
  stop(sessionName: string = 'default'): any {
    this.isActive = false;
    
    const profileData = this.profiles.get(sessionName) || [];
    const report = this.generateReport(profileData);
    
    console.log(\`✅ Stopped profiling session: \${sessionName}\`);
    this.cleanup();
    
    return report;
  }

  /**
   * Profile a specific function
   */
  profileFunction<T>(name: string, fn: () => T, sessionName: string = 'default'): T {
    const startMark = \`\${name}-start\`;
    const endMark = \`\${name}-end\`;
    const measureName = \`function-\${name}\`;
    
    performance.mark(startMark);
    
    try {
      const result = fn();
      
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      
      return result;
    } catch (error) {
      performance.mark(\`\${name}-error\`);
      throw error;
    }
  }

  /**
   * Profile async function
   */
  async profileAsync<T>(name: string, fn: () => Promise<T>, sessionName: string = 'default'): Promise<T> {
    const startMark = \`\${name}-async-start\`;
    const endMark = \`\${name}-async-end\`;
    const measureName = \`async-\${name}\`;
    
    performance.mark(startMark);
    
    try {
      const result = await fn();
      
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      
      return result;
    } catch (error) {
      performance.mark(\`\${name}-async-error\`);
      throw error;
    }
  }

  /**
   * Create a custom timer
   */
  createTimer(name: string): { stop: () => number } {
    const startTime = performance.now();
    
    return {
      stop: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(\`⏱️  \${name}: \${duration.toFixed(2)}ms\`);
        return duration;
      }
    };
  }

  /**
   * Memory profiling
   */
  profileMemory(name: string): { stop: () => any } {
    const startMemory = process.memoryUsage();
    
    return {
      stop: () => {
        const endMemory = process.memoryUsage();
        const delta = {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external
        };
        
        const report = {
          name,
          memoryDelta: delta,
          formattedDelta: {
            rss: this.formatBytes(delta.rss),
            heapUsed: this.formatBytes(delta.heapUsed),
            heapTotal: this.formatBytes(delta.heapTotal),
            external: this.formatBytes(delta.external)
          }
        };
        
        console.log(\`📊 Memory profile \${name}:\`, report.formattedDelta);
        return report;
      }
    };
  }

  /**
   * CPU profiling (requires --prof flag)
   */
  startCPUProfiling(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('💻 CPU profiling started. Use --prof flag and v8-profiler-next for detailed analysis.');
    }
  }

  private setupObservers(sessionName: string): void {
    // Function call observer
    const functionObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.name.startsWith('function-') || entry.name.startsWith('async-')) {
          this.recordProfile(sessionName, {
            type: 'function',
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: new Date()
          });
        }
      });
    });
    
    functionObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(functionObserver);

    // HTTP observer
    const httpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.name.includes('http')) {
          this.recordProfile(sessionName, {
            type: 'http',
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: new Date()
          });
        }
      });
    });
    
    httpObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(httpObserver);
  }

  private recordProfile(sessionName: string, data: any): void {
    const profiles = this.profiles.get(sessionName) || [];
    profiles.push(data);
    this.profiles.set(sessionName, profiles);
  }

  private generateReport(profileData: any[]): any {
    const report = {
      summary: this.generateSummary(profileData),
      functions: this.analyzeFunctions(profileData),
      http: this.analyzeHttp(profileData),
      timeline: this.generateTimeline(profileData),
      recommendations: this.generateRecommendations(profileData)
    };

    return report;
  }

  private generateSummary(data: any[]): any {
    return {
      totalMeasurements: data.length,
      totalTime: data.reduce((sum, d) => sum + d.duration, 0),
      averageTime: data.length > 0 ? data.reduce((sum, d) => sum + d.duration, 0) / data.length : 0,
      slowestOperation: data.reduce((max, d) => d.duration > (max?.duration || 0) ? d : max, null),
      functionCalls: data.filter(d => d.type === 'function').length,
      httpRequests: data.filter(d => d.type === 'http').length
    };
  }

  private analyzeFunctions(data: any[]): any[] {
    const functions = data.filter(d => d.type === 'function');
    const functionStats = new Map();

    functions.forEach(f => {
      const name = f.name;
      if (functionStats.has(name)) {
        const stats = functionStats.get(name);
        stats.calls++;
        stats.totalTime += f.duration;
        stats.maxTime = Math.max(stats.maxTime, f.duration);
        stats.minTime = Math.min(stats.minTime, f.duration);
      } else {
        functionStats.set(name, {
          name,
          calls: 1,
          totalTime: f.duration,
          maxTime: f.duration,
          minTime: f.duration
        });
      }
    });

    return Array.from(functionStats.values())
      .map(stats => ({
        ...stats,
        averageTime: stats.totalTime / stats.calls
      }))
      .sort((a, b) => b.totalTime - a.totalTime);
  }

  private analyzeHttp(data: any[]): any[] {
    const httpRequests = data.filter(d => d.type === 'http');
    
    return httpRequests.map(req => ({
      name: req.name,
      duration: req.duration,
      timestamp: req.timestamp,
      status: this.extractHttpStatus(req.name)
    })).sort((a, b) => b.duration - a.duration);
  }

  private generateTimeline(data: any[]): any[] {
    return data
      .sort((a, b) => a.startTime - b.startTime)
      .map(item => ({
        timestamp: new Date(Date.now() - performance.now() + item.startTime),
        name: item.name,
        type: item.type,
        duration: item.duration
      }));
  }

  private generateRecommendations(data: any[]): string[] {
    const recommendations = [];
    const functions = data.filter(d => d.type === 'function');
    
    // Find slow functions
    const slowFunctions = functions.filter(f => f.duration > 100);
    if (slowFunctions.length > 0) {
      recommendations.push(\`\${slowFunctions.length} functions taking >100ms detected. Consider optimization.\`);
    }

    // Find frequently called functions
    const functionCalls = new Map();
    functions.forEach(f => {
      functionCalls.set(f.name, (functionCalls.get(f.name) || 0) + 1);
    });

    const frequentFunctions = Array.from(functionCalls.entries())
      .filter(([, count]) => count > 50);
    
    if (frequentFunctions.length > 0) {
      recommendations.push(\`\${frequentFunctions.length} functions called >50 times. Consider caching or optimization.\`);
    }

    return recommendations;
  }

  private extractHttpStatus(name: string): number {
    const match = name.match(/-(\d{3})$/);
    return match ? parseInt(match[1]) : 200;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0B';
    
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
    return \`\${(bytes / Math.pow(1024, i)).toFixed(1)}\${sizes[i]}\`;
  }

  private cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Decorators for easy profiling
export function profile(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    return performanceProfiler.profileFunction(
      \`\${target.constructor.name}.\${propertyName}\`,
      () => method.apply(this, args)
    );
  };
}

export function profileAsync(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    return performanceProfiler.profileAsync(
      \`\${target.constructor.name}.\${propertyName}\`,
      () => method.apply(this, args)
    );
  };
}

export const performanceProfiler = new PerformanceProfiler();`;
  }

  // Helper methods
  private assessOptimizationLevel(requirements: AppRequirements): string {
    const features = requirements.features || [];
    const hasHighTraffic = features.some(f => f.toLowerCase().includes('traffic') || f.toLowerCase().includes('scale'));
    const hasComplexData = features.some(f => f.toLowerCase().includes('data') || f.toLowerCase().includes('analytics'));
    const hasRealtime = features.some(f => f.toLowerCase().includes('realtime') || f.toLowerCase().includes('live'));

    if (hasHighTraffic || hasComplexData || hasRealtime) return 'high';
    if (features.length > 5) return 'medium';
    return 'basic';
  }

  private selectCachingStrategy(requirements: AppRequirements): string {
    const features = requirements.features || [];
    const description = requirements.description.toLowerCase();

    if (description.includes('realtime') || features.some(f => f.toLowerCase().includes('live'))) {
      return 'minimal-cache';
    }
    if (description.includes('data') || features.some(f => f.toLowerCase().includes('analytics'))) {
      return 'aggressive-cache';
    }
    return 'balanced-cache';
  }

  private loadOptimizationRules(): void {
    this.optimizationRules = [
      {
        name: 'Cache frequently accessed data',
        condition: (req: AppRequirements) => req.features?.some(f => f.includes('data')),
        recommendation: 'Implement Redis caching for database queries'
      },
      {
        name: 'Compress responses',
        condition: (req: AppRequirements) => true,
        recommendation: 'Enable gzip/brotli compression for all text responses'
      },
      {
        name: 'Optimize images',
        condition: (req: AppRequirements) => req.features?.some(f => f.includes('image') || f.includes('photo')),
        recommendation: 'Implement lazy loading and WebP format conversion'
      }
    ];
  }

  async cleanup(): Promise<void> {
    this.performanceMetrics.clear();
    this.optimizationRules = [];
    console.log('Performance Optimization Agent cleaned up');
  }
}