import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import CodeQualityAgent from './code-quality-agent';
import SecurityReviewAgent from './security-review-agent';
import PerformanceReviewAgent from './performance-review-agent';
import ArchitectureReviewAgent from './architecture-review-agent';
import DocumentationReviewAgent from './documentation-review-agent';

export interface CodeReviewReport {
  timestamp: Date;
  overallScore: number;
  summary: string;
  reviews: {
    quality: any;
    security: any;
    performance: any;
    architecture: any;
    documentation: any;
  };
  criticalIssues: number;
  highPriorityIssues: number;
  recommendations: string[];
  nextSteps: string[];
}

export default class CodeReviewOrchestrator implements Agent {
  id = 'code-review-orchestrator';
  name = 'Code Review Orchestrator';
  type = 'code-review-coordination';
  description = 'Coordinates multiple specialized code review agents for comprehensive analysis';
  capabilities = ['coordination', 'report-aggregation', 'priority-sorting', 'recommendation-synthesis'];
  version = '1.0.0';

  private reviewAgents: Map<string, Agent> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🎭 Initializing Code Review Orchestrator...');
    
    // Initialize all review agents
    const agents = [
      new CodeQualityAgent(),
      new SecurityReviewAgent(),
      new PerformanceReviewAgent(),
      new ArchitectureReviewAgent(),
      new DocumentationReviewAgent()
    ];

    for (const agent of agents) {
      await agent.initialize();
      this.reviewAgents.set(agent.type, agent);
      console.log(`✅ ${agent.name} initialized`);
    }

    this.isInitialized = true;
    console.log('🎭 Code Review Orchestrator ready');
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const { requirements } = task;
      const codebasePath = task.output?.codebasePath || '.';
      
      console.log(`🎭 Code Review Orchestrator: Starting comprehensive review of ${codebasePath}`);
      
      const report = await this.performComprehensiveReview(codebasePath, requirements);
      
      return {
        success: true,
        data: report,
        metadata: {
          agent: this.id,
          timestamp: new Date(),
          totalAgents: this.reviewAgents.size,
          criticalIssues: report.criticalIssues,
          highPriorityIssues: report.highPriorityIssues
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Code review orchestration failed: ${error}`,
        metadata: {
          agent: this.id,
          timestamp: new Date()
        }
      };
    }
  }

  private async performComprehensiveReview(codebasePath: string, requirements: AppRequirements): Promise<CodeReviewReport> {
    console.log('🔍 Starting comprehensive code review...');
    
    // Execute all review agents in parallel
    const reviewTasks = Array.from(this.reviewAgents.entries()).map(async ([type, agent]) => {
      const task: AgentTask = {
        id: `review-${type}-${Date.now()}`,
        type: 'analysis',
        agentId: agent.id,
        requirements,
        dependencies: [],
        status: 'pending',
        output: { codebasePath }
      };

      try {
        const result = await agent.execute(task);
        return { type, result, success: true };
      } catch (error) {
        console.error(`❌ ${agent.name} failed:`, error);
        return { type, result: null, success: false, error };
      }
    });

    const reviewResults = await Promise.all(reviewTasks);
    
    // Aggregate results
    const reviews: CodeReviewReport['reviews'] = {
      quality: null,
      security: null,
      performance: null,
      architecture: null,
      documentation: null
    };

    let totalCriticalIssues = 0;
    let totalHighPriorityIssues = 0;
    const allRecommendations: string[] = [];

    for (const { type, result, success, error } of reviewResults) {
      if (success && result?.success) {
        reviews[type as keyof typeof reviews] = result.data;
        
        // Count issues by severity
        if (result.data?.issues) {
          const criticalIssues = result.data.issues.filter((i: any) => i.severity === 'critical').length;
          const highIssues = result.data.issues.filter((i: any) => i.severity === 'high').length;
          
          totalCriticalIssues += criticalIssues;
          totalHighPriorityIssues += highIssues;
        }
        
        // Collect recommendations
        if (result.data?.recommendations) {
          allRecommendations.push(...result.data.recommendations);
        }
      } else {
        console.error(`❌ Review failed for ${type}:`, error);
      }
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(reviews);
    
    // Generate comprehensive summary
    const summary = this.generateComprehensiveSummary(reviews, totalCriticalIssues, totalHighPriorityIssues);
    
    // Synthesize recommendations
    const recommendations = this.synthesizeRecommendations(allRecommendations);
    
    // Determine next steps
    const nextSteps = this.determineNextSteps(reviews, totalCriticalIssues, totalHighPriorityIssues);

    return {
      timestamp: new Date(),
      overallScore,
      summary,
      reviews,
      criticalIssues: totalCriticalIssues,
      highPriorityIssues: totalHighPriorityIssues,
      recommendations,
      nextSteps
    };
  }

  private calculateOverallScore(reviews: CodeReviewReport['reviews']): number {
    let totalScore = 0;
    let validScores = 0;

    // Calculate weighted average of all review scores
    const weights = {
      quality: 0.25,
      security: 0.25,
      performance: 0.20,
      architecture: 0.20,
      documentation: 0.10
    };

    for (const [type, review] of Object.entries(reviews)) {
      if (review && typeof review.overallScore === 'number') {
        totalScore += review.overallScore * weights[type as keyof typeof weights];
        validScores++;
      }
    }

    return validScores > 0 ? Math.round(totalScore) : 0;
  }

  private generateComprehensiveSummary(reviews: CodeReviewReport['reviews'], criticalIssues: number, highPriorityIssues: number): string {
    let summary = 'Comprehensive code review completed. ';
    
    if (criticalIssues === 0 && highPriorityIssues === 0) {
      summary += 'Excellent code quality with no critical or high-priority issues found.';
    } else if (criticalIssues === 0) {
      summary += `Good code quality with ${highPriorityIssues} high-priority issues that need attention.`;
    } else {
      summary += `Code quality needs immediate attention with ${criticalIssues} critical and ${highPriorityIssues} high-priority issues.`;
    }

    return summary;
  }

  private synthesizeRecommendations(allRecommendations: string[]): string[] {
    // Remove duplicates and return unique recommendations
    return [...new Set(allRecommendations)];
  }

  private determineNextSteps(reviews: CodeReviewReport['reviews'], criticalIssues: number, highPriorityIssues: number): string[] {
    const nextSteps: string[] = [];

    if (criticalIssues > 0) {
      nextSteps.push('Immediately address all critical issues before any new development');
    }

    if (highPriorityIssues > 0) {
      nextSteps.push('Address high-priority issues within 1-2 weeks');
    }

    nextSteps.push('Establish regular code review process');
    nextSteps.push('Set up automated code quality checks in CI/CD');

    return nextSteps;
  }

  async cleanup(): Promise<void> {
    console.log('🎭 Code Review Orchestrator cleanup started...');
    
    // Cleanup all review agents
    for (const agent of this.reviewAgents.values()) {
      try {
        await agent.cleanup();
      } catch (error) {
        console.warn(`Warning: Failed to cleanup ${agent.name}:`, error);
      }
    }
    
    this.reviewAgents.clear();
    this.isInitialized = false;
    
    console.log('🎭 Code Review Orchestrator cleanup completed');
  }
}
