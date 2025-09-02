/**
 * AI Adapter - Real AI Integration for ARCHITECT-BRAVO
 * Supports OpenAI GPT-4 and Claude API with fallback mechanisms
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CircuitBreaker } from '../recovery/circuit-breaker';
import { RateLimiter } from '../middleware/rate-limiter';
import { Logger } from '../utils/logger';

export interface AIRequest {
  prompt: string;
  type: 'code_generation' | 'code_review' | 'optimization' | 'analysis';
  context?: {
    language?: string;
    framework?: string;
    template?: string;
    requirements?: any;
  };
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  provider: 'openai' | 'claude';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    model: string;
    finishReason: string;
    processingTime: number;
  };
}

export interface AIProviderConfig {
  openai: {
    apiKey: string;
    model: string;
    baseURL?: string;
    maxRetries: number;
    timeout: number;
  };
  claude: {
    apiKey: string;
    model: string;
    maxRetries: number;
    timeout: number;
  };
  fallback: {
    enabled: boolean;
    strategy: 'round_robin' | 'least_used' | 'response_time';
    maxFailures: number;
    cooldownPeriod: number;
  };
  rateLimiting: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    burstLimit: number;
  };
}

class AIProvider {
  protected circuitBreaker: CircuitBreaker;
  protected rateLimiter: RateLimiter;
  protected logger: Logger;
  protected requestCount = 0;
  protected totalTokens = 0;
  protected responseTimeSum = 0;

  constructor(
    protected name: 'openai' | 'claude',
    protected config: AIProviderConfig,
    logger: Logger
  ) {
    this.logger = logger;
    this.circuitBreaker = new CircuitBreaker({
      name: `ai-provider-${name}`,
      failureThreshold: config.fallback.maxFailures,
      recoveryTimeout: config.fallback.cooldownPeriod,
      monitoringPeriod: 60000
    });
    
    this.rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: config.rateLimiting.requestsPerMinute,
      maxTokens: config.rateLimiting.tokensPerMinute
    });
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Check rate limits
      await this.rateLimiter.checkLimits(request.maxTokens || 1000);
      
      // Execute through circuit breaker
      const response = await this.circuitBreaker.execute(async () => {
        return await this.executeRequest(request);
      });

      const processingTime = Date.now() - startTime;
      this.updateMetrics(response, processingTime);
      
      return response;
    } catch (error) {
      this.logger.error(`AI Provider ${this.name} failed`, { error, request });
      throw error;
    }
  }

  protected async executeRequest(request: AIRequest): Promise<AIResponse> {
    throw new Error('executeRequest must be implemented by subclass');
  }

  protected updateMetrics(response: AIResponse, processingTime: number) {
    this.requestCount++;
    this.totalTokens += response.usage.totalTokens;
    this.responseTimeSum += processingTime;
  }

  getMetrics() {
    return {
      provider: this.name,
      requestCount: this.requestCount,
      totalTokens: this.totalTokens,
      averageResponseTime: this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0,
      circuitBreakerState: this.circuitBreaker.getState(),
      rateLimiterStats: this.rateLimiter.getStats()
    };
  }
}

class OpenAIProvider extends AIProvider {
  private client: OpenAI;

  constructor(config: AIProviderConfig, logger: Logger) {
    super('openai', config, logger);
    
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
      maxRetries: config.openai.maxRetries,
      timeout: config.openai.timeout
    });
  }

  protected async executeRequest(request: AIRequest): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(request.type, request.context);
    const userPrompt = request.prompt;

    const completion = await this.client.chat.completions.create({
      model: this.config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.2,
      stream: false
    });

    const choice = completion.choices[0];
    if (!choice || !choice.message) {
      throw new Error('Invalid response from OpenAI API');
    }

    return {
      content: choice.message.content || '',
      provider: 'openai',
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      },
      metadata: {
        model: completion.model,
        finishReason: choice.finish_reason || 'unknown',
        processingTime: 0 // Will be set by parent class
      }
    };
  }

  private buildSystemPrompt(type: AIRequest['type'], context?: AIRequest['context']): string {
    const basePrompt = 'You are an expert software architect and code generator for ARCHITECT-BRAVO.';
    
    switch (type) {
      case 'code_generation':
        return `${basePrompt} Generate production-ready, well-documented code based on the requirements. 
        Context: ${JSON.stringify(context)}
        
        Requirements:
        - Follow best practices and design patterns
        - Include comprehensive error handling
        - Add appropriate TypeScript types
        - Include unit tests when requested
        - Use modern, idiomatic code
        - Add detailed comments for complex logic`;

      case 'code_review':
        return `${basePrompt} Review the provided code and suggest improvements.
        Focus on:
        - Security vulnerabilities
        - Performance optimizations
        - Code maintainability
        - Best practices adherence
        - Potential bugs or edge cases`;

      case 'optimization':
        return `${basePrompt} Optimize the provided code for better performance and maintainability.
        Consider:
        - Algorithm efficiency
        - Memory usage
        - Database query optimization
        - Caching opportunities
        - Code structure improvements`;

      case 'analysis':
        return `${basePrompt} Analyze the requirements and provide architectural recommendations.
        Include:
        - Technology stack suggestions
        - System architecture patterns
        - Scalability considerations
        - Integration approaches
        - Potential challenges and solutions`;

      default:
        return basePrompt;
    }
  }
}

class ClaudeProvider extends AIProvider {
  private client: Anthropic;

  constructor(config: AIProviderConfig, logger: Logger) {
    super('claude', config, logger);
    
    this.client = new Anthropic({
      apiKey: config.claude.apiKey,
      maxRetries: config.claude.maxRetries,
      timeout: config.claude.timeout
    });
  }

  protected async executeRequest(request: AIRequest): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(request.type, request.context);

    const message = await this.client.messages.create({
      model: this.config.claude.model,
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.2,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ]
    });

    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    return {
      content: textContent.text,
      provider: 'claude',
      usage: {
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens
      },
      metadata: {
        model: message.model,
        finishReason: message.stop_reason || 'unknown',
        processingTime: 0 // Will be set by parent class
      }
    };
  }

  private buildSystemPrompt(type: AIRequest['type'], context?: AIRequest['context']): string {
    const basePrompt = 'You are ARCHITECT-BRAVO, an expert software architect and code generator.';
    
    switch (type) {
      case 'code_generation':
        return `${basePrompt} Generate production-ready code based on requirements.
        
        Context: ${JSON.stringify(context)}
        
        Generate code that is:
        - Production-ready with comprehensive error handling
        - Well-documented with clear comments
        - Follows language/framework best practices
        - Includes appropriate types and interfaces
        - Optimized for performance and maintainability
        - Secure by design`;

      case 'code_review':
        return `${basePrompt} You are performing a comprehensive code review.
        
        Analyze for:
        - Security vulnerabilities and potential exploits
        - Performance bottlenecks and optimization opportunities
        - Code quality and maintainability issues
        - Best practices adherence
        - Potential bugs and edge cases
        - Documentation and testing gaps`;

      case 'optimization':
        return `${basePrompt} You are optimizing code for better performance and maintainability.
        
        Focus on:
        - Algorithm and data structure optimization
        - Memory usage and garbage collection
        - Database query performance
        - Caching strategies
        - Code structure and patterns
        - Scalability improvements`;

      case 'analysis':
        return `${basePrompt} You are analyzing requirements for architectural decisions.
        
        Provide:
        - Technology stack recommendations with rationale
        - System architecture patterns and trade-offs
        - Scalability and performance considerations
        - Integration approaches and patterns
        - Risk assessment and mitigation strategies
        - Implementation roadmap and priorities`;

      default:
        return basePrompt;
    }
  }
}

export class AIAdapter {
  private providers: Map<string, AIProvider> = new Map();
  private config: AIProviderConfig;
  private logger: Logger;
  private fallbackOrder: ('openai' | 'claude')[] = [];

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.logger = new Logger('AIAdapter');
    
    // Initialize providers
    if (config.openai.apiKey) {
      this.providers.set('openai', new OpenAIProvider(config, this.logger));
      this.fallbackOrder.push('openai');
    }
    
    if (config.claude.apiKey) {
      this.providers.set('claude', new ClaudeProvider(config, this.logger));
      this.fallbackOrder.push('claude');
    }

    if (this.providers.size === 0) {
      throw new Error('At least one AI provider must be configured');
    }

    this.logger.info(`AI Adapter initialized with providers: ${Array.from(this.providers.keys())}`);
  }

  async generateResponse(request: AIRequest, preferredProvider?: 'openai' | 'claude'): Promise<AIResponse> {
    const providers = this.getProviderOrder(preferredProvider);
    let lastError: Error | null = null;

    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        this.logger.debug(`Attempting AI request with provider: ${providerName}`, { request });
        const response = await provider.generateResponse(request);
        
        this.logger.info(`AI request successful with provider: ${providerName}`, {
          type: request.type,
          tokens: response.usage.totalTokens,
          processingTime: response.metadata.processingTime
        });
        
        return response;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`AI provider ${providerName} failed, trying next`, { error });
        
        // If this is the last provider, don't continue
        if (providerName === providers[providers.length - 1]) {
          break;
        }
      }
    }

    // All providers failed
    this.logger.error('All AI providers failed', { lastError, request });
    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  private getProviderOrder(preferredProvider?: 'openai' | 'claude'): string[] {
    if (!this.config.fallback.enabled) {
      const provider = preferredProvider || this.fallbackOrder[0];
      return [provider];
    }

    switch (this.config.fallback.strategy) {
      case 'round_robin':
        return this.getRoundRobinOrder();
      case 'least_used':
        return this.getLeastUsedOrder();
      case 'response_time':
        return this.getResponseTimeOrder();
      default:
        if (preferredProvider && this.providers.has(preferredProvider)) {
          return [preferredProvider, ...this.fallbackOrder.filter(p => p !== preferredProvider)];
        }
        return [...this.fallbackOrder];
    }
  }

  private getRoundRobinOrder(): string[] {
    // Simple round-robin based on request count
    const providers = Array.from(this.providers.keys());
    const metrics = providers.map(name => ({
      name,
      requestCount: this.providers.get(name)?.getMetrics().requestCount || 0
    }));
    
    return metrics
      .sort((a, b) => a.requestCount - b.requestCount)
      .map(p => p.name);
  }

  private getLeastUsedOrder(): string[] {
    const providers = Array.from(this.providers.keys());
    const metrics = providers.map(name => ({
      name,
      totalTokens: this.providers.get(name)?.getMetrics().totalTokens || 0
    }));
    
    return metrics
      .sort((a, b) => a.totalTokens - b.totalTokens)
      .map(p => p.name);
  }

  private getResponseTimeOrder(): string[] {
    const providers = Array.from(this.providers.keys());
    const metrics = providers.map(name => ({
      name,
      averageResponseTime: this.providers.get(name)?.getMetrics().averageResponseTime || Infinity
    }));
    
    return metrics
      .sort((a, b) => a.averageResponseTime - b.averageResponseTime)
      .map(p => p.name);
  }

  async getProviderMetrics() {
    const metrics: Record<string, any> = {};
    
    for (const [name, provider] of this.providers) {
      metrics[name] = provider.getMetrics();
    }
    
    return {
      providers: metrics,
      fallbackConfig: this.config.fallback,
      totalProviders: this.providers.size
    };
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        // Simple health check with minimal request
        await provider.generateResponse({
          prompt: 'Hello',
          type: 'analysis',
          maxTokens: 10,
          temperature: 0
        });
        health[name] = true;
      } catch (error) {
        health[name] = false;
      }
    }
    
    return health;
  }
}

// Export factory function for easy instantiation
export function createAIAdapter(config: AIProviderConfig): AIAdapter {
  return new AIAdapter(config);
}

// Default configuration
export const DEFAULT_AI_CONFIG: AIProviderConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4-turbo-preview',
    maxRetries: 3,
    timeout: 60000
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-sonnet-20240229',
    maxRetries: 3,
    timeout: 60000
  },
  fallback: {
    enabled: true,
    strategy: 'response_time',
    maxFailures: 3,
    cooldownPeriod: 60000
  },
  rateLimiting: {
    requestsPerMinute: 100,
    tokensPerMinute: 100000,
    burstLimit: 10
  }
};