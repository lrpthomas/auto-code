import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export interface ArchitectureIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'design-pattern' | 'separation-of-concerns' | 'coupling' | 'scalability' | 'maintainability' | 'testability';
  title: string;
  description: string;
  file: string;
  line?: number;
  impact: string;
  recommendation: string;
  architecturalPrinciple: string;
}

export interface ArchitectureReport {
  overallScore: number;
  issues: ArchitectureIssue[];
  metrics: {
    cyclomaticComplexity: number;
    couplingScore: number;
    cohesionScore: number;
    maintainabilityIndex: number;
    testabilityScore: number;
  };
  summary: string;
  recommendations: string[];
  architecturalStrengths: string[];
  architecturalWeaknesses: string[];
}

export default class ArchitectureReviewAgent implements Agent {
  id = 'architecture-review-agent';
  name = 'Architecture Review Agent';
  type = 'architecture-analysis';
  description = 'Reviews overall system design and architecture for best practices and patterns';
  capabilities = ['architecture-analysis', 'design-pattern-review', 'coupling-analysis', 'scalability-assessment'];
  version = '1.0.0';

  private architecturalPatterns = new Map<string, RegExp[]>();
  private antiPatterns = new Map<string, RegExp[]>();
  private designPrinciples = [
    'Single Responsibility Principle',
    'Open/Closed Principle',
    'Liskov Substitution Principle',
    'Interface Segregation Principle',
    'Dependency Inversion Principle'
  ];

  async initialize(): Promise<void> {
    await this.loadArchitecturalPatterns();
    await this.loadAntiPatterns();
    console.log('🏗️ Architecture Review Agent initialized');
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { requirements } = task;
      const codebasePath = task.output?.codebasePath || '.';
      
      console.log(`🏗️ Architecture Review Agent: Analyzing codebase at ${codebasePath}`);
      
      const report = await this.analyzeArchitecture(codebasePath, requirements);
      
      return {
        success: true,
        data: report,
        metadata: {
          agent: this.id,
          timestamp: new Date(),
          totalIssues: report.issues.length,
          criticalIssues: report.issues.filter(i => i.severity === 'critical').length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Architecture analysis failed: ${error}`,
        metadata: {
          agent: this.id,
          timestamp: new Date()
        }
      };
    }
  }

  private async loadArchitecturalPatterns(): Promise<void> {
    // MVC pattern indicators
    this.architecturalPatterns.set('mvc', [
      /class\s+\w+Controller/gi,
      /class\s+\w+Model/gi,
      /class\s+\w+View/gi,
      /extends\s+Controller/gi
    ]);

    // Repository pattern
    this.architecturalPatterns.set('repository', [
      /interface\s+\w+Repository/gi,
      /class\s+\w+Repository/gi,
      /implements\s+\w+Repository/gi
    ]);

    // Factory pattern
    this.architecturalPatterns.set('factory', [
      /class\s+\w+Factory/gi,
      /create\w+\(\)/gi,
      /new\s+\w+Factory/gi
    ]);

    // Observer pattern
    this.architecturalPatterns.set('observer', [
      /addEventListener/gi,
      /on\s*\(\s*['"][^'"]+['"]/gi,
      /emit\s*\(\s*['"][^'"]+['"]/gi
    ]);

    // Dependency injection
    this.architecturalPatterns.set('dependency-injection', [
      /@Inject/gi,
      /@Injectable/gi,
      /constructor\s*\(\s*[^)]*private\s+\w+/gi
    ]);
  }

  private async loadAntiPatterns(): Promise<void> {
    // God object anti-pattern
    this.antiPatterns.set('god-object', [
      /class\s+\w+\s*\{[\s\S]{1000,}\}/gi,
      /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{500,}\}/gi
    ]);

    // Tight coupling
    this.antiPatterns.set('tight-coupling', [
      /new\s+\w+\(/gi,
      /import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"]/gi,
      /require\s*\(\s*['"][^'"]+['"]\s*\)/gi
    ]);

    // Violation of SRP
    this.antiPatterns.set('srp-violation', [
      /class\s+\w+\s*\{[^}]*function\s+\w+[^}]*function\s+\w+[^}]*function\s+\w+/gi
    ]);

    // Hardcoded dependencies
    this.antiPatterns.set('hardcoded-dependencies', [
      /new\s+Database\(/gi,
      /new\s+HttpClient\(/gi,
      /new\s+Logger\(/gi
    ]);
  }

  private async analyzeArchitecture(codebasePath: string, requirements: AppRequirements): Promise<ArchitectureReport> {
    const issues: ArchitectureIssue[] = [];
    
    // Analyze architectural patterns
    const patternIssues = await this.analyzeArchitecturalPatterns(codebasePath);
    issues.push(...patternIssues);
    
    // Check for anti-patterns
    const antiPatternIssues = await this.checkAntiPatterns(codebasePath);
    issues.push(...antiPatternIssues);
    
    // Analyze code structure
    const structureIssues = await this.analyzeCodeStructure(codebasePath);
    issues.push(...structureIssues);
    
    // Calculate metrics
    const metrics = await this.calculateArchitecturalMetrics(codebasePath, issues);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics, issues);
    
    // Generate recommendations
    const recommendations = this.generateArchitecturalRecommendations(issues, metrics);
    const strengths = this.identifyArchitecturalStrengths(issues, metrics);
    const weaknesses = this.identifyArchitecturalWeaknesses(issues, metrics);
    
    return {
      overallScore,
      issues,
      metrics,
      summary: this.generateArchitectureSummary(issues, metrics, overallScore),
      recommendations,
      architecturalStrengths: strengths,
      architecturalWeaknesses: weaknesses
    };
  }

  private async analyzeArchitecturalPatterns(codebasePath: string): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];
    const files = await this.scanCodebase(codebasePath);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for architectural patterns
        for (const [pattern, patterns] of this.architecturalPatterns) {
          for (const regex of patterns) {
            if (regex.test(content)) {
              const issue = this.createPatternIssue(pattern, file, 'positive');
              if (issue) {
                issues.push(issue);
              }
            }
          }
        }
        
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${file}: ${error}`);
      }
    }
    
    return issues;
  }

  private async checkAntiPatterns(codebasePath: string): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];
    const files = await this.scanCodebase(codebasePath);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check each anti-pattern
        for (const [category, patterns] of this.antiPatterns) {
          for (const pattern of patterns) {
            if (pattern.test(content)) {
              const issue = this.createAntiPatternIssue(category, file);
              if (issue) {
                issues.push(issue);
              }
            }
          }
        }
        
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${file}: ${error}`);
      }
    }
    
    return issues;
  }

  private async analyzeCodeStructure(codebasePath: string): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];
    
    try {
      // Analyze directory structure
      const structureIssues = await this.analyzeDirectoryStructure(codebasePath);
      issues.push(...structureIssues);
      
      // Analyze file organization
      const fileIssues = await this.analyzeFileOrganization(codebasePath);
      issues.push(...fileIssues);
      
      // Analyze module dependencies
      const dependencyIssues = await this.analyzeModuleDependencies(codebasePath);
      issues.push(...dependencyIssues);
      
    } catch (error) {
      console.warn('Warning: Could not analyze code structure:', error);
    }
    
    return issues;
  }

  private async analyzeDirectoryStructure(codebasePath: string): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];
    
    try {
      const entries = fs.readdirSync(codebasePath, { withFileTypes: true });
      
      // Check for flat structure (too many files in root)
      const rootFiles = entries.filter(entry => entry.isFile()).length;
      if (rootFiles > 10) {
        issues.push({
          severity: 'medium',
          category: 'maintainability',
          title: 'Flat Directory Structure',
          description: 'Too many files in root directory suggests poor organization',
          file: codebasePath,
          impact: 'Harder to navigate and maintain codebase',
          recommendation: 'Organize files into logical directories by feature or type',
          architecturalPrinciple: 'Separation of Concerns'
        });
      }
      
      // Check for proper separation of concerns
      const hasSrc = entries.some(entry => entry.name === 'src');
      const hasTests = entries.some(entry => entry.name === 'tests' || entry.name === 'test');
      const hasDocs = entries.some(entry => entry.name === 'docs' || entry.name === 'documentation');
      
      if (!hasSrc) {
        issues.push({
          severity: 'low',
          category: 'maintainability',
          title: 'Missing Source Directory',
          description: 'No dedicated source code directory found',
          file: codebasePath,
          impact: 'Source code mixed with configuration and other files',
          recommendation: 'Create a src/ directory for source code',
          architecturalPrinciple: 'Separation of Concerns'
        });
      }
      
      if (!hasTests) {
        issues.push({
          severity: 'medium',
          category: 'testability',
          title: 'Missing Test Directory',
          description: 'No dedicated test directory found',
          file: codebasePath,
          impact: 'Tests may be scattered or missing',
          recommendation: 'Create a tests/ directory and organize test files',
          architecturalPrinciple: 'Testability'
        });
      }
      
    } catch (error) {
      console.warn(`Warning: Could not analyze directory structure: ${error}`);
    }
    
    return issues;
  }

  private async analyzeFileOrganization(codebasePath: string): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];
    
    try {
      const files = await this.scanCodebase(codebasePath);
      
      // Check for large files
      for (const file of files) {
        try {
          const stats = fs.statSync(file);
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n').length;
          
          if (lines > 500) {
            issues.push({
              severity: 'medium',
              category: 'maintainability',
              title: 'Large File Detected',
              description: `File ${path.basename(file)} is very large (${lines} lines)`,
              file,
              impact: 'Harder to understand and maintain',
              recommendation: 'Break into smaller, focused files or modules',
              architecturalPrinciple: 'Single Responsibility Principle'
            });
          }
          
        } catch (error) {
          console.warn(`Warning: Could not analyze file ${file}: ${error}`);
        }
      }
      
    } catch (error) {
      console.warn(`Warning: Could not analyze file organization: ${error}`);
    }
    
    return issues;
  }

  private async analyzeModuleDependencies(codebasePath: string): Promise<ArchitectureIssue[]> {
    const issues: ArchitectureIssue[] = [];
    
    try {
      const files = await this.scanCodebase(codebasePath);
      
      // Check for circular dependencies (simplified check)
      const importMap = new Map<string, string[]>();
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const imports = this.extractImports(content);
          importMap.set(file, imports);
        } catch (error) {
          console.warn(`Warning: Could not analyze file ${file}: ${error}`);
        }
      }
      
      // Check for high coupling
      for (const [file, imports] of importMap) {
        if (imports.length > 10) {
          issues.push({
            severity: 'medium',
            category: 'coupling',
            title: 'High Module Coupling',
            description: `File ${path.basename(file)} has many dependencies (${imports.length})`,
            file,
            impact: 'Tight coupling makes the system harder to modify and test',
            recommendation: 'Reduce dependencies and use dependency injection',
            architecturalPrinciple: 'Dependency Inversion Principle'
          });
        }
      }
      
    } catch (error) {
      console.warn(`Warning: Could not analyze module dependencies: ${error}`);
    }
    
    return issues;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    
    // Extract import statements (simplified)
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  private createPatternIssue(pattern: string, file: string, type: 'positive' | 'negative'): ArchitectureIssue | null {
    if (type === 'positive') {
      // This is a good pattern, so we don't create an issue
      return null;
    }
    
    return null;
  }

  private createAntiPatternIssue(category: string, file: string): ArchitectureIssue | null {
    const antiPatternMap: Record<string, Partial<ArchitectureIssue>> = {
      'god-object': {
        title: 'God Object Anti-Pattern',
        description: 'Class or function with too many responsibilities',
        impact: 'Hard to maintain, test, and understand',
        recommendation: 'Break into smaller, focused classes/functions',
        architecturalPrinciple: 'Single Responsibility Principle'
      },
      'tight-coupling': {
        title: 'Tight Coupling',
        description: 'Direct instantiation of dependencies creates tight coupling',
        impact: 'Hard to test and modify components independently',
        recommendation: 'Use dependency injection and interfaces',
        architecturalPrinciple: 'Dependency Inversion Principle'
      },
      'srp-violation': {
        title: 'Single Responsibility Principle Violation',
        description: 'Class has multiple responsibilities',
        impact: 'Harder to maintain and modify',
        recommendation: 'Split into multiple focused classes',
        architecturalPrinciple: 'Single Responsibility Principle'
      },
      'hardcoded-dependencies': {
        title: 'Hardcoded Dependencies',
        description: 'Dependencies are hardcoded instead of injected',
        impact: 'Tight coupling and difficult testing',
        recommendation: 'Use dependency injection and configuration',
        architecturalPrinciple: 'Dependency Inversion Principle'
      }
    };
    
    const issueInfo = antiPatternMap[category];
    if (!issueInfo) return null;
    
    const severity = this.determineArchitectureIssueSeverity(category);
    
    return {
      severity,
      category: category as any,
      title: issueInfo.title!,
      description: issueInfo.description!,
      file,
      impact: issueInfo.impact!,
      recommendation: issueInfo.recommendation!,
      architecturalPrinciple: issueInfo.architecturalPrinciple!
    };
  }

  private determineArchitectureIssueSeverity(category: string): ArchitectureIssue['severity'] {
    // Critical architecture issues
    if (['god-object'].includes(category)) {
      return 'critical';
    }
    
    // High architecture issues
    if (['tight-coupling', 'srp-violation'].includes(category)) {
      return 'high';
    }
    
    // Medium architecture issues
    if (['hardcoded-dependencies'].includes(category)) {
      return 'medium';
    }
    
    return 'medium';
  }

  private async scanCodebase(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dirPath: string) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
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

  private async calculateArchitecturalMetrics(codebasePath: string, issues: ArchitectureIssue[]): Promise<ArchitectureReport['metrics']> {
    // Mock metrics calculation - in a real implementation, you'd use actual tools
    const cyclomaticComplexity = Math.max(1, Math.min(10, Math.floor(issues.length / 5)));
    const couplingScore = Math.max(0, 100 - (issues.length * 8));
    const cohesionScore = Math.max(0, 100 - (issues.length * 6));
    const maintainabilityIndex = Math.max(0, 100 - (issues.length * 4));
    const testabilityScore = Math.max(0, 100 - (issues.length * 7));
    
    return {
      cyclomaticComplexity,
      couplingScore,
      cohesionScore,
      maintainabilityIndex,
      testabilityScore
    };
  }

  private calculateOverallScore(metrics: ArchitectureReport['metrics'], issues: ArchitectureIssue[]): number {
    let score = 100;
    
    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    }
    
    // Deduct points for poor metrics
    if (metrics.couplingScore < 60) score -= 25;
    if (metrics.cohesionScore < 60) score -= 20;
    if (metrics.maintainabilityIndex < 60) score -= 20;
    if (metrics.testabilityScore < 60) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateArchitecturalRecommendations(issues: ArchitectureIssue[], metrics: ArchitectureReport['metrics']): string[] {
    const recommendations: string[] = [];
    
    // Critical recommendations
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`Immediately address ${criticalIssues.length} critical architectural issues`);
    }
    
    // High priority recommendations
    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      recommendations.push(`Address ${highIssues.length} high-priority architectural issues within 2 weeks`);
    }
    
    // Specific recommendations
    const categories = new Set(issues.map(i => i.category));
    
    if (categories.has('god-object')) {
      recommendations.push('Break down large classes into smaller, focused components');
    }
    
    if (categories.has('tight-coupling')) {
      recommendations.push('Implement dependency injection and use interfaces');
    }
    
    if (categories.has('srp-violation')) {
      recommendations.push('Ensure each class has a single, well-defined responsibility');
    }
    
    if (categories.has('maintainability')) {
      recommendations.push('Improve code organization and documentation');
    }
    
    // Metric-based recommendations
    if (metrics.couplingScore < 70) {
      recommendations.push('Reduce module dependencies and implement loose coupling');
    }
    
    if (metrics.cohesionScore < 70) {
      recommendations.push('Improve module cohesion by grouping related functionality');
    }
    
    if (metrics.testabilityScore < 70) {
      recommendations.push('Improve testability through better separation of concerns');
    }
    
    // General recommendations
    recommendations.push('Implement architectural decision records (ADRs)');
    recommendations.push('Establish code review process focused on architecture');
    recommendations.push('Use dependency injection containers and service locators');
    
    return recommendations;
  }

  private identifyArchitecturalStrengths(issues: ArchitectureIssue[], metrics: ArchitectureReport['metrics']): string[] {
    const strengths: string[] = [];
    
    // Identify positive patterns
    if (metrics.couplingScore > 80) {
      strengths.push('Good separation of concerns and loose coupling');
    }
    
    if (metrics.cohesionScore > 80) {
      strengths.push('High module cohesion and focused functionality');
    }
    
    if (metrics.maintainabilityIndex > 80) {
      strengths.push('Good maintainability and code organization');
    }
    
    if (metrics.testabilityScore > 80) {
      strengths.push('High testability and good separation of concerns');
    }
    
    // Check for good patterns
    const hasGoodPatterns = issues.some(issue => issue.severity === 'low');
    if (hasGoodPatterns) {
      strengths.push('Follows established architectural patterns');
    }
    
    return strengths;
  }

  private identifyArchitecturalWeaknesses(issues: ArchitectureIssue[], metrics: ArchitectureReport['metrics']): string[] {
    const weaknesses: string[] = [];
    
    // Identify areas for improvement
    if (metrics.couplingScore < 60) {
      weaknesses.push('High coupling between modules');
    }
    
    if (metrics.cohesionScore < 60) {
      weaknesses.push('Low module cohesion');
    }
    
    if (metrics.maintainabilityIndex < 60) {
      weaknesses.push('Poor maintainability');
    }
    
    if (metrics.testabilityScore < 60) {
      weaknesses.push('Low testability');
    }
    
    // Check for critical issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      weaknesses.push('Critical architectural violations present');
    }
    
    return weaknesses;
  }

  private generateArchitectureSummary(issues: ArchitectureIssue[], metrics: ArchitectureReport['metrics'], overallScore: number): string {
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    let summary = `Architecture analysis completed. Overall score: ${overallScore}/100. `;
    
    if (totalIssues === 0) {
      summary += 'No architectural issues found. Excellent architecture!';
    } else {
      summary += `Found ${totalIssues} architectural issues (${criticalIssues} critical, ${highIssues} high priority). `;
      
      if (overallScore >= 80) {
        summary += 'Architecture is solid with room for minor improvements.';
      } else if (overallScore >= 60) {
        summary += 'Architecture needs attention. Focus on high-priority issues first.';
      } else {
        summary += 'Architecture requires significant refactoring. Consider architectural redesign.';
      }
    }
    
    // Add metric highlights
    if (metrics.couplingScore < 60) {
      summary += ' High coupling detected - consider refactoring for better separation.';
    }
    
    if (metrics.maintainabilityIndex < 60) {
      summary += ' Maintainability is poor - improve code organization and documentation.';
    }
    
    return summary;
  }

  async cleanup(): Promise<void> {
    console.log('🏗️ Architecture Review Agent cleanup completed');
  }
}
