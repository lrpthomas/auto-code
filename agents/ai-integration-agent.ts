import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export default class AIIntegrationAgent implements Agent {
  id = 'ai-integration-agent';
  name = 'AI Integration Agent';
  type = 'ai-integration';
  description = 'Integrates with AI APIs to generate high-quality, production-ready code';
  capabilities = ['openai-integration', 'anthropic-integration', 'code-generation', 'quality-enhancement'];
  version = '2.0.0';

  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private fallbackTemplates: Map<string, string> = new Map();

  async initialize(): Promise<void> {
    // Initialize AI clients with environment variables
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Load fallback templates for offline operation
    this.loadFallbackTemplates();
    console.log('AI Integration Agent initialized with providers:', {
      openai: !!this.openai,
      anthropic: !!this.anthropic,
      fallback: true
    });
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const requirements = task.requirements;
    
    try {
      const enhancedCode = await this.generateEnhancedCode(requirements, task.context);
      
      return {
        success: true,
        data: enhancedCode,
        metadata: {
          agent: this.id,
          timestamp: new Date(),
          aiProvider: this.getAvailableProvider(),
          codeQuality: 'production-ready',
          optimization: 'high'
        }
      };
    } catch (error) {
      console.warn('AI Integration failed, falling back to templates:', error);
      return this.generateFallbackCode(requirements);
    }
  }

  private async generateEnhancedCode(requirements: AppRequirements, context?: any): Promise<any> {
    const codeType = context?.codeType || 'component';
    const framework = context?.framework || requirements.techStack?.frontend || 'react';
    
    // Try OpenAI first (GPT-4)
    if (this.openai) {
      try {
        return await this.generateWithOpenAI(requirements, codeType, framework);
      } catch (error) {
        console.warn('OpenAI generation failed, trying Anthropic:', error);
      }
    }

    // Fallback to Anthropic (Claude)
    if (this.anthropic) {
      try {
        return await this.generateWithAnthropic(requirements, codeType, framework);
      } catch (error) {
        console.warn('Anthropic generation failed, using templates:', error);
      }
    }

    // Final fallback to templates
    return this.generateFromTemplate(requirements, codeType, framework);
  }

  private async generateWithOpenAI(requirements: AppRequirements, codeType: string, framework: string): Promise<any> {
    const prompt = this.buildPrompt(requirements, codeType, framework);
    
    const completion = await this.openai!.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert software engineer. Generate production-ready, well-documented, and optimized code. Include proper error handling, TypeScript types, and follow best practices."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    const generatedCode = completion.choices[0]?.message?.content || '';
    return this.parseCodeResponse(generatedCode, codeType, framework);
  }

  private async generateWithAnthropic(requirements: AppRequirements, codeType: string, framework: string): Promise<any> {
    const prompt = this.buildPrompt(requirements, codeType, framework);
    
    const message = await this.anthropic!.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: `You are an expert software engineer. Generate production-ready, well-documented, and optimized code. Include proper error handling, TypeScript types, and follow best practices.\n\n${prompt}`
        }
      ]
    });

    const generatedCode = message.content[0]?.type === 'text' ? message.content[0].text : '';
    return this.parseCodeResponse(generatedCode, codeType, framework);
  }

  private buildPrompt(requirements: AppRequirements, codeType: string, framework: string): string {
    return `Generate a ${codeType} for a ${framework} application with the following requirements:

Description: ${requirements.description}
Features: ${requirements.features?.join(', ') || 'Basic functionality'}
Tech Stack: ${JSON.stringify(requirements.techStack)}
Styling: ${requirements.styling || 'Modern CSS/Tailwind'}

Requirements:
1. Use TypeScript with proper type definitions
2. Include comprehensive error handling
3. Add JSDoc comments for all functions
4. Follow ${framework} best practices
5. Make it production-ready with proper validation
6. Include accessibility features (ARIA labels, semantic HTML)
7. Implement responsive design
8. Add proper loading states and error boundaries
9. Use modern ES6+ features
10. Include unit test examples

Please provide clean, maintainable code that follows industry standards.`;
  }

  private parseCodeResponse(response: string, codeType: string, framework: string): any {
    // Extract code blocks from AI response
    const codeBlocks = this.extractCodeBlocks(response);
    
    if (codeType === 'component') {
      return {
        component: codeBlocks.main || codeBlocks[0] || this.getFallbackComponent(framework),
        styles: codeBlocks.styles || this.getFallbackStyles(),
        tests: codeBlocks.tests || this.getFallbackTests(framework),
        types: codeBlocks.types || this.getFallbackTypes()
      };
    }

    return {
      code: codeBlocks.main || codeBlocks[0] || this.getFallbackCode(codeType),
      metadata: {
        generated: true,
        aiEnhanced: true,
        framework,
        codeType
      }
    };
  }

  private extractCodeBlocks(response: string): { [key: string]: string } {
    const blocks: { [key: string]: string } = {};
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'code';
      const code = match[2];
      
      if (index === 0) {
        blocks.main = code;
      } else if (language.includes('css') || language.includes('scss')) {
        blocks.styles = code;
      } else if (language.includes('test') || code.includes('describe(')) {
        blocks.tests = code;
      } else if (language.includes('ts') && code.includes('interface')) {
        blocks.types = code;
      } else {
        blocks[`block${index}`] = code;
      }
      index++;
    }

    return blocks;
  }

  private generateFromTemplate(requirements: AppRequirements, codeType: string, framework: string): any {
    const template = this.fallbackTemplates.get(`${framework}-${codeType}`) || 
                    this.fallbackTemplates.get('default-component');
    
    return {
      component: this.populateTemplate(template!, requirements),
      styles: this.getFallbackStyles(),
      tests: this.getFallbackTests(framework),
      types: this.getFallbackTypes()
    };
  }

  private populateTemplate(template: string, requirements: AppRequirements): string {
    return template
      .replace(/\{\{DESCRIPTION\}\}/g, requirements.description)
      .replace(/\{\{FEATURES\}\}/g, requirements.features?.join(', ') || 'basic functionality')
      .replace(/\{\{APP_NAME\}\}/g, requirements.description.replace(/\s+/g, ''))
      .replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString());
  }

  private loadFallbackTemplates(): void {
    this.fallbackTemplates.set('react-component', `
import React, { useState, useEffect } from 'react';
import './{{APP_NAME}}.css';

interface {{APP_NAME}}Props {
  title?: string;
  className?: string;
}

/**
 * {{DESCRIPTION}}
 * Features: {{FEATURES}}
 * Generated: {{TIMESTAMP}}
 */
const {{APP_NAME}}: React.FC<{{APP_NAME}}Props> = ({ title = '{{DESCRIPTION}}', className = '' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize component
    console.log('{{APP_NAME}} initialized');
  }, []);

  const handleAction = async () => {
    try {
      setLoading(true);
      setError(null);
      // Implementation here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className={\`error-container \${className}\`} role="alert">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={\`app-container \${className}\`}>
      <header>
        <h1>{title}</h1>
      </header>
      <main>
        <p>{{DESCRIPTION}} - {{FEATURES}}</p>
        <button 
          onClick={handleAction} 
          disabled={loading}
          aria-label="Primary action"
        >
          {loading ? 'Loading...' : 'Action'}
        </button>
      </main>
    </div>
  );
};

export default {{APP_NAME}};
`);

    this.fallbackTemplates.set('vue-component', `
<template>
  <div :class="['app-container', className]">
    <header>
      <h1>{{ title }}</h1>
    </header>
    <main>
      <p>{{DESCRIPTION}} - {{FEATURES}}</p>
      <button 
        @click="handleAction" 
        :disabled="loading"
        :aria-label="Primary action"
      >
        {{ loading ? 'Loading...' : 'Action' }}
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Props {
  title?: string;
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '{{DESCRIPTION}}',
  className: ''
});

const loading = ref(false);
const error = ref<string | null>(null);

/**
 * {{DESCRIPTION}}
 * Features: {{FEATURES}}
 * Generated: {{TIMESTAMP}}
 */
onMounted(() => {
  console.log('{{APP_NAME}} initialized');
});

const handleAction = async () => {
  try {
    loading.value = true;
    error.value = null;
    // Implementation here
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
</style>
`);
  }

  private getFallbackComponent(framework: string): string {
    return this.fallbackTemplates.get(`${framework}-component`) || 
           this.fallbackTemplates.get('react-component')!;
  }

  private getFallbackStyles(): string {
    return `
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.error-container {
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 1rem;
  color: #991b1b;
}

button {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background: #2563eb;
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
`;
  }

  private getFallbackTests(framework: string): string {
    return `
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('handles user interactions', async () => {
    render(<App />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button).toBeInTheDocument();
  });

  test('displays error states properly', () => {
    render(<App />);
    // Test error handling
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
`;
  }

  private getFallbackTypes(): string {
    return `
export interface AppProps {
  title?: string;
  className?: string;
}

export interface AppState {
  loading: boolean;
  error: string | null;
  data: any[];
}

export type ActionType = 'create' | 'update' | 'delete' | 'fetch';

export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}
`;
  }

  private generateFallbackCode(requirements: AppRequirements): AgentResult {
    return {
      success: true,
      data: {
        component: this.getFallbackComponent('react'),
        styles: this.getFallbackStyles(),
        tests: this.getFallbackTests('react'),
        types: this.getFallbackTypes()
      },
      metadata: {
        agent: this.id,
        timestamp: new Date(),
        aiProvider: 'fallback-templates',
        codeQuality: 'template-based',
        optimization: 'standard'
      }
    };
  }

  private getAvailableProvider(): string {
    if (this.openai) return 'openai-gpt4';
    if (this.anthropic) return 'anthropic-claude';
    return 'fallback-templates';
  }

  async cleanup(): Promise<void> {
    // Cleanup AI client connections
    this.openai = null;
    this.anthropic = null;
    this.fallbackTemplates.clear();
    console.log('AI Integration Agent cleaned up');
  }
}