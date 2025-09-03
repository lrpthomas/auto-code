import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export interface CodeQualityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'style' | 'best-practice' | 'pattern' | 'maintainability' | 'readability';
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
  rule?: string;
}

export interface CodeQualityReport {
  overallScore: number;
  issues: CodeQualityIssue[];
  metrics: {
    cyclomaticComplexity: number;
    maintainabilityIndex: number;
    codeDuplication: number;
    testCoverage: number;
    documentationCoverage: number;
  };
  recommendations: string[];
  summary: string;
}

export default class CodeQualityAgent implements Agent {
  id = 'code-quality-agent';
  name = 'Code Quality Agent';
  type = 'code-review';
  description = 'Reviews code for quality, style, best practices, and maintainability';
  capabilities = ['code-analysis', 'style-checking', 'best-practice-review', 'complexity-analysis'];
  version = '1.0.0';

  private supportedLanguages = ['typescript', 'javascript', 'python', 'go', 'java', 'csharp'];
  private qualityRules = new Map<string, any[]>();

  async initialize(): Promise<void> {
    await this.loadQualityRules();
    console.log('🔍 Code Quality Agent initialized');
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { requirements } = task;
      const codebasePath = task.output?.codebasePath || '.';
      
      console.log(`🔍 Code Quality Agent: Analyzing codebase at ${codebasePath}`);
      
      const report = await this.analyzeCodebase(codebasePath, requirements);
      
      return {
        success: true,
        data: report,
        metadata: {
          agent: this.id,
          timestamp: new Date(),
          analyzedFiles: report.issues.length > 0 ? 
            [...new Set(report.issues.map(issue => issue.file))].length : 0,
          totalIssues: report.issues.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Code quality analysis failed: ${error}`,
        metadata: {
          agent: this.id,
          timestamp: new Date()
        }
      };
    }
  }

  private async loadQualityRules(): Promise<void> {
    // Load language-specific quality rules
    this.qualityRules.set('typescript', [
      { rule: 'no-any', severity: 'high', message: 'Avoid using "any" type, prefer specific types' },
      { rule: 'no-unused-vars', severity: 'medium', message: 'Remove unused variables' },
      { rule: 'prefer-const', severity: 'low', message: 'Use const for variables that are not reassigned' },
      { rule: 'no-console', severity: 'low', message: 'Remove console.log statements in production code' },
      { rule: 'max-len', severity: 'low', message: 'Keep lines under 120 characters' }
    ]);

    this.qualityRules.set('javascript', [
      { rule: 'no-var', severity: 'high', message: 'Use let/const instead of var' },
      { rule: 'prefer-arrow-functions', severity: 'medium', message: 'Use arrow functions when possible' },
      { rule: 'no-unused-vars', severity: 'medium', message: 'Remove unused variables' },
      { rule: 'no-console', severity: 'low', message: 'Remove console.log statements in production code' }
    ]);

    this.qualityRules.set('python', [
      { rule: 'pep8', severity: 'medium', message: 'Follow PEP 8 style guidelines' },
      { rule: 'no-unused-imports', severity: 'medium', message: 'Remove unused imports' },
      { rule: 'max-line-length', severity: 'low', message: 'Keep lines under 79 characters' }
    ]);
  }

  private async analyzeCodebase(codebasePath: string, requirements: AppRequirements): Promise<CodeQualityReport> {
    const issues: CodeQualityIssue[] = [];
    const files = await this.scanCodebase(codebasePath);
    
    for (const file of files) {
      const fileIssues = await this.analyzeFile(file, requirements);
      issues.push(...fileIssues);
    }

    const metrics = await this.calculateMetrics(files, issues);
    const overallScore = this.calculateOverallScore(metrics, issues);
    const recommendations = this.generateRecommendations(issues, metrics);

    return {
      overallScore,
      issues,
      metrics,
      recommendations,
      summary: this.generateSummary(issues, metrics, overallScore)
    };
  }

  private async scanCodebase(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dirPath: string) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            // Skip node_modules, .git, dist, build directories
            if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
              await scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs'].includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not scan directory ${dirPath}: ${error}`);
      }
    };

    await scanDirectory(rootPath);
    return files;
  }

  private async analyzeFile(filePath: string, requirements: AppRequirements): Promise<CodeQualityIssue[]> {
    const issues: CodeQualityIssue[] = [];
    const ext = path.extname(filePath).toLowerCase();
    const language = this.getLanguageFromExtension(ext);
    
    if (!language || !this.qualityRules.has(language)) {
      return issues;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Apply language-specific rules
      const rules = this.qualityRules.get(language) || [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        for (const rule of rules) {
          const issue = this.checkRule(line, rule, filePath, lineNumber);
          if (issue) {
            issues.push(issue);
          }
        }
        
        // Additional checks
        issues.push(...this.performAdditionalChecks(line, filePath, lineNumber, language));
      }
      
      // File-level checks
      issues.push(...this.performFileLevelChecks(content, filePath, language));
      
    } catch (error) {
      console.warn(`Warning: Could not analyze file ${filePath}: ${error}`);
    }
    
    return issues;
  }

  private getLanguageFromExtension(ext: string): string | null {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.java': 'java',
      '.cs': 'csharp'
    };
    
    return languageMap[ext] || null;
  }

  private checkRule(line: string, rule: any, filePath: string, lineNumber: number): CodeQualityIssue | null {
    switch (rule.rule) {
      case 'no-any':
        if (line.includes(': any') || line.includes(': any[')) {
          return {
            severity: rule.severity,
            category: 'best-practice',
            message: rule.message,
            file: filePath,
            line: lineNumber,
            suggestion: 'Replace "any" with a specific type or interface',
            rule: rule.rule
          };
        }
        break;
        
      case 'no-unused-vars':
        // Simple check for unused variables (basic implementation)
        if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
          const varMatch = line.match(/(?:const|let|var)\s+(\w+)/);
          if (varMatch && !this.isVariableUsed(line, varMatch[1])) {
            return {
              severity: rule.severity,
              category: 'best-practice',
              message: rule.message,
              file: filePath,
              line: lineNumber,
              suggestion: `Remove unused variable "${varMatch[1]}" or use it`,
              rule: rule.rule
            };
          }
        }
        break;
        
      case 'prefer-const':
        if (line.includes('let ') && !line.includes('=')) {
          return {
            severity: rule.severity,
            category: 'style',
            message: rule.message,
            file: filePath,
            line: lineNumber,
            suggestion: 'Use const if the variable is not reassigned',
            rule: rule.rule
          };
        }
        break;
        
      case 'no-console':
        if (line.includes('console.log') || line.includes('console.error')) {
          return {
            severity: rule.severity,
            category: 'best-practice',
            message: rule.message,
            file: filePath,
            line: lineNumber,
            suggestion: 'Use proper logging framework instead of console statements',
            rule: rule.rule
          };
        }
        break;
        
      case 'max-len':
        if (line.length > 120) {
          return {
            severity: rule.severity,
            category: 'style',
            message: rule.message,
            file: filePath,
            line: lineNumber,
            suggestion: 'Break long lines into multiple lines',
            rule: rule.rule
          };
        }
        break;
    }
    
    return null;
  }

  private isVariableUsed(line: string, variableName: string): boolean {
    // Simple check - in a real implementation, you'd need a proper parser
    return line.includes(variableName) && !line.includes(`const ${variableName}`) && !line.includes(`let ${variableName}`);
  }

  private performAdditionalChecks(line: string, filePath: string, lineNumber: number, language: string): CodeQualityIssue[] {
    const issues: CodeQualityIssue[] = [];
    
    // Check for magic numbers
    const magicNumberMatch = line.match(/\b\d{3,}\b/);
    if (magicNumberMatch && !line.includes('//')) {
      issues.push({
        severity: 'medium',
        category: 'best-practice',
        message: 'Magic number detected - consider using named constants',
        file: filePath,
        line: lineNumber,
        suggestion: 'Define a constant with a descriptive name',
        rule: 'no-magic-numbers'
      });
    }
    
    // Check for hardcoded strings
    if (line.includes('"') && line.includes('http') && !line.includes('const') && !line.includes('let')) {
      issues.push({
        severity: 'low',
        category: 'best-practice',
        message: 'Hardcoded URL detected - consider using configuration',
        file: filePath,
        line: lineNumber,
        suggestion: 'Move URLs to configuration files or environment variables',
        rule: 'no-hardcoded-urls'
      });
    }
    
    return issues;
  }

  private performFileLevelChecks(content: string, filePath: string, language: string): CodeQualityIssue[] {
    const issues: CodeQualityIssue[] = [];
    
    // Check file size
    if (content.length > 10000) {
      issues.push({
        severity: 'medium',
        category: 'maintainability',
        message: 'File is very large - consider breaking it into smaller modules',
        file: filePath,
        suggestion: 'Split into multiple files or extract classes/functions',
        rule: 'max-file-size'
      });
    }
    
    // Check for TODO comments
    const todoMatches = content.match(/TODO:/g);
    if (todoMatches && todoMatches.length > 3) {
      issues.push({
        severity: 'low',
        category: 'maintainability',
        message: 'Multiple TODO comments found - consider addressing technical debt',
        file: filePath,
        suggestion: 'Review and address TODO items',
        rule: 'max-todo-comments'
      });
    }
    
    return issues;
  }

  private async calculateMetrics(files: string[], issues: CodeQualityIssue[]): Promise<CodeQualityReport['metrics']> {
    // Calculate cyclomatic complexity (simplified)
    const cyclomaticComplexity = Math.min(10, Math.max(1, Math.floor(issues.length / 10)));
    
    // Calculate maintainability index (simplified)
    const maintainabilityIndex = Math.max(0, 100 - (issues.length * 2));
    
    // Calculate code duplication (simplified)
    const codeDuplication = Math.min(30, Math.floor(issues.length / 5));
    
    // Mock test coverage
    const testCoverage = Math.max(60, 100 - (issues.length * 3));
    
    // Mock documentation coverage
    const documentationCoverage = Math.max(40, 100 - (issues.length * 2));
    
    return {
      cyclomaticComplexity,
      maintainabilityIndex,
      codeDuplication,
      testCoverage,
      documentationCoverage
    };
  }

  private calculateOverallScore(metrics: CodeQualityReport['metrics'], issues: CodeQualityIssue[]): number {
    let score = 100;
    
    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 10;
          break;
        case 'high':
          score -= 5;
          break;
        case 'medium':
          score -= 2;
          break;
        case 'low':
          score -= 1;
          break;
      }
    }
    
    // Deduct points for poor metrics
    if (metrics.maintainabilityIndex < 50) score -= 20;
    if (metrics.testCoverage < 70) score -= 15;
    if (metrics.documentationCoverage < 60) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(issues: CodeQualityIssue[], metrics: CodeQualityReport['metrics']): string[] {
    const recommendations: string[] = [];
    
    // High priority issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical issues immediately`);
    }
    
    // Code quality improvements
    if (metrics.maintainabilityIndex < 70) {
      recommendations.push('Improve code maintainability by reducing complexity and improving structure');
    }
    
    if (metrics.testCoverage < 80) {
      recommendations.push('Increase test coverage to improve code reliability');
    }
    
    if (metrics.documentationCoverage < 70) {
      recommendations.push('Improve code documentation and add inline comments');
    }
    
    // Specific recommendations based on common issues
    const styleIssues = issues.filter(i => i.category === 'style');
    if (styleIssues.length > 10) {
      recommendations.push('Implement automated code formatting and linting');
    }
    
    const bestPracticeIssues = issues.filter(i => i.category === 'best-practice');
    if (bestPracticeIssues.length > 15) {
      recommendations.push('Review and update coding standards and best practices');
    }
    
    return recommendations;
  }

  private generateSummary(issues: CodeQualityIssue[], metrics: CodeQualityReport['metrics'], overallScore: number): string {
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    let summary = `Code quality analysis completed. Overall score: ${overallScore}/100. `;
    
    if (totalIssues === 0) {
      summary += 'No quality issues found. Excellent code quality!';
    } else {
      summary += `Found ${totalIssues} issues (${criticalIssues} critical, ${highIssues} high priority). `;
      
      if (overallScore >= 80) {
        summary += 'Code quality is good with room for minor improvements.';
      } else if (overallScore >= 60) {
        summary += 'Code quality needs attention. Focus on high-priority issues first.';
      } else {
        summary += 'Code quality requires immediate attention. Consider refactoring.';
      }
    }
    
    return summary;
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
    console.log('🔍 Code Quality Agent cleanup completed');
  }
}
