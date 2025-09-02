/**
 * Universal AI Model Adapter System
 * Supports any AI model with a unified interface
 */

class UniversalAIAdapter {
    constructor() {
        this.providers = new Map();
        this.activeProviders = [];
        this.fallbackChain = [];
        this.responseCache = new Map();
    }

    /**
     * Register a new AI provider
     */
    registerProvider(name, config) {
        const provider = this.createProvider(name, config);
        this.providers.set(name, provider);
        return provider;
    }

    /**
     * Create provider based on type
     */
    createProvider(name, config) {
        const providers = {
            // OpenAI Models
            'gpt-4': new OpenAIProvider({ 
                model: 'gpt-4', 
                apiKey: config.apiKey,
                maxTokens: 8000 
            }),
            'gpt-4-turbo': new OpenAIProvider({ 
                model: 'gpt-4-turbo-preview', 
                apiKey: config.apiKey,
                maxTokens: 128000 
            }),
            'gpt-3.5-turbo': new OpenAIProvider({ 
                model: 'gpt-3.5-turbo', 
                apiKey: config.apiKey,
                maxTokens: 16000 
            }),
            
            // Anthropic Models
            'claude-3-opus': new AnthropicProvider({ 
                model: 'claude-3-opus-20240229', 
                apiKey: config.apiKey,
                maxTokens: 200000 
            }),
            'claude-3-sonnet': new AnthropicProvider({ 
                model: 'claude-3-sonnet-20240229', 
                apiKey: config.apiKey,
                maxTokens: 200000 
            }),
            'claude-3-haiku': new AnthropicProvider({ 
                model: 'claude-3-haiku-20240307', 
                apiKey: config.apiKey,
                maxTokens: 200000 
            }),
            
            // Google Models
            'gemini-pro': new GoogleProvider({ 
                model: 'gemini-pro', 
                apiKey: config.apiKey,
                maxTokens: 32000 
            }),
            'gemini-ultra': new GoogleProvider({ 
                model: 'gemini-ultra', 
                apiKey: config.apiKey,
                maxTokens: 32000 
            }),
            'palm-2': new GoogleProvider({ 
                model: 'text-bison-001', 
                apiKey: config.apiKey 
            }),
            
            // Meta Models
            'llama-3-70b': new OllamaProvider({ 
                model: 'llama3:70b', 
                endpoint: config.endpoint || 'http://localhost:11434' 
            }),
            'llama-3-8b': new OllamaProvider({ 
                model: 'llama3:8b', 
                endpoint: config.endpoint 
            }),
            'codellama': new OllamaProvider({ 
                model: 'codellama:34b', 
                endpoint: config.endpoint 
            }),
            
            // Mistral Models
            'mistral-large': new MistralProvider({ 
                model: 'mistral-large-latest', 
                apiKey: config.apiKey 
            }),
            'mixtral-8x7b': new MistralProvider({ 
                model: 'open-mixtral-8x7b', 
                apiKey: config.apiKey 
            }),
            'codestral': new MistralProvider({ 
                model: 'codestral-latest', 
                apiKey: config.apiKey 
            }),
            
            // Cohere Models
            'command-r-plus': new CohereProvider({ 
                model: 'command-r-plus', 
                apiKey: config.apiKey 
            }),
            'command-r': new CohereProvider({ 
                model: 'command-r', 
                apiKey: config.apiKey 
            }),
            
            // Local/Open Source Models
            'local-llama': new LocalProvider({ 
                modelPath: config.modelPath,
                runtime: 'llama.cpp' 
            }),
            'local-gpt4all': new GPT4AllProvider({ 
                model: config.model || 'ggml-gpt4all-j-v1.3-groovy' 
            }),
            'local-mlx': new MLXProvider({ 
                model: config.model,
                device: 'apple-silicon' 
            }),
            
            // Specialized Code Models
            'deepseek-coder': new DeepSeekProvider({ 
                model: 'deepseek-coder-33b', 
                apiKey: config.apiKey 
            }),
            'starcoder': new HuggingFaceProvider({ 
                model: 'bigcode/starcoder', 
                apiKey: config.apiKey 
            }),
            'codegeex': new CodeGeexProvider({ 
                model: 'codegeex-4', 
                apiKey: config.apiKey 
            }),
            
            // Cloud Provider Models
            'azure-openai': new AzureOpenAIProvider({ 
                deployment: config.deployment,
                apiKey: config.apiKey,
                endpoint: config.endpoint 
            }),
            'aws-bedrock': new BedrockProvider({ 
                model: config.model,
                region: config.region,
                credentials: config.credentials 
            }),
            'vertex-ai': new VertexAIProvider({ 
                model: config.model,
                project: config.project,
                location: config.location 
            }),
            
            // Custom/Enterprise Models
            'custom-api': new CustomAPIProvider({ 
                endpoint: config.endpoint,
                headers: config.headers,
                requestFormat: config.requestFormat,
                responseFormat: config.responseFormat 
            })
        };

        return providers[name] || new GenericProvider(config);
    }

    /**
     * Execute prompt with automatic fallback
     */
    async execute(prompt, options = {}) {
        const { 
            preferredProviders = [], 
            taskType = 'general',
            maxRetries = 3,
            timeout = 30000 
        } = options;

        // Try preferred providers first
        for (const providerName of preferredProviders) {
            const provider = this.providers.get(providerName);
            if (provider && provider.isAvailable()) {
                try {
                    return await this.executeWithProvider(provider, prompt, options);
                } catch (error) {
                    console.log(`Provider ${providerName} failed, trying next...`);
                }
            }
        }

        // Fall back to best available provider for task type
        return await this.executeWithBestProvider(prompt, taskType, options);
    }

    /**
     * Select best provider for task type
     */
    async executeWithBestProvider(prompt, taskType, options) {
        const rankings = {
            'code-generation': ['codestral', 'deepseek-coder', 'gpt-4-turbo', 'claude-3-opus'],
            'code-review': ['claude-3-opus', 'gpt-4', 'gemini-pro'],
            'architecture': ['claude-3-opus', 'gpt-4', 'gemini-ultra'],
            'documentation': ['claude-3-sonnet', 'gpt-4', 'mixtral-8x7b'],
            'debugging': ['gpt-4-turbo', 'claude-3-opus', 'deepseek-coder'],
            'testing': ['gpt-4', 'claude-3-sonnet', 'codellama'],
            'general': ['claude-3-opus', 'gpt-4-turbo', 'gemini-pro', 'mistral-large']
        };

        const preferredOrder = rankings[taskType] || rankings.general;
        
        for (const providerName of preferredOrder) {
            const provider = this.providers.get(providerName);
            if (provider && provider.isAvailable()) {
                try {
                    return await this.executeWithProvider(provider, prompt, options);
                } catch (error) {
                    console.log(`Provider ${providerName} failed, trying fallback...`);
                }
            }
        }

        throw new Error('All AI providers failed');
    }
}

/**
 * Base Provider Class
 */
class BaseAIProvider {
    constructor(config) {
        this.config = config;
        this.available = false;
        this.rateLimit = config.rateLimit || null;
        this.lastCall = 0;
    }

    async isAvailable() {
        // Check rate limits
        if (this.rateLimit) {
            const timeSinceLastCall = Date.now() - this.lastCall;
            if (timeSinceLastCall < this.rateLimit) {
                return false;
            }
        }
        
        // Check health
        return await this.healthCheck();
    }

    async healthCheck() {
        try {
            // Provider-specific health check
            return true;
        } catch {
            return false;
        }
    }

    async execute(prompt, options) {
        this.lastCall = Date.now();
        // Provider-specific implementation
        throw new Error('Not implemented');
    }
}

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider extends BaseAIProvider {
    async execute(prompt, options) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: options.maxTokens || this.config.maxTokens,
                temperature: options.temperature || 0.7
            })
        });
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
}

/**
 * Anthropic Provider Implementation
 */
class AnthropicProvider extends BaseAIProvider {
    async execute(prompt, options) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: options.maxTokens || this.config.maxTokens
            })
        });
        
        const data = await response.json();
        return data.content[0].text;
    }
}

/**
 * Ollama Local Provider
 */
class OllamaProvider extends BaseAIProvider {
    async execute(prompt, options) {
        const response = await fetch(`${this.config.endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.config.model,
                prompt: prompt,
                stream: false
            })
        });
        
        const data = await response.json();
        return data.response;
    }
}

/**
 * Generic Provider for custom endpoints
 */
class GenericProvider extends BaseAIProvider {
    async execute(prompt, options) {
        const requestBody = this.config.requestFormat 
            ? this.config.requestFormat(prompt, options)
            : { prompt, ...options };
            
        const response = await fetch(this.config.endpoint, {
            method: 'POST',
            headers: this.config.headers || { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        return this.config.responseFormat 
            ? this.config.responseFormat(data)
            : data.response || data.text || data.output;
    }
}

module.exports = UniversalAIAdapter;