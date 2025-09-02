export interface AppRequirements {
  id: string;
  description: string;
  appType: 'web' | 'api' | 'fullstack' | 'mobile';
  features: string[];
  techStack: {
    frontend?: 'react' | 'vue' | 'angular' | 'svelte';
    backend?: 'nodejs' | 'python' | 'golang' | 'java';
    database?: 'postgresql' | 'mongodb' | 'sqlite' | 'mysql';
    deployment?: 'docker' | 'kubernetes' | 'vercel' | 'aws';
  };
  timeline: number; // minutes
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentTask {
  id: string;
  type: 'analysis' | 'generation' | 'testing' | 'deployment';
  agentId: string;
  requirements: AppRequirements;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  execute(task: AgentTask): Promise<AgentResult>;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface GeneratedApp {
  id: string;
  name: string;
  structure: Record<string, string>;
  tests: Record<string, string>;
  documentation: string;
  deployment: Record<string, any>;
  metadata: {
    techStack: AppRequirements['techStack'];
    generatedAt: Date;
    testCoverage: number;
    buildStatus: 'success' | 'failed';
  };
}

export interface OrchestratorConfig {
  maxConcurrentTasks: number;
  timeoutMinutes: number;
  retryAttempts: number;
  agents: {
    [agentType: string]: {
      maxInstances: number;
      priority: number;
    };
  };
}