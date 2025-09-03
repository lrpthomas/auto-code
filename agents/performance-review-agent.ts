import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'algorithm' | 'memory' | 'network' | 'database' | 'rendering' | 'bundling';
  title: string;
  description: string;
  file: string;
  line?: number;
  impact: string;
  recommendation: string;
  estimatedImprovement: string;
}

export interface PerformanceReport {
  overallScore: number;
  issues: PerformanceIssue[];
  metrics: {
    bundleSize: number;
    loadTime: number;
    memoryUsage: number;
    databaseQueries: number;
    renderTime: number;
  };
  summary: string;
  recommendations: string[];
  optimizationOpportunities: string[];
}

export default class PerformanceReviewAgent implements Agent {
  id = 'performance-review-agent';
  name = 'Performance Review Agent';
  type = 'performance-analysis';
  description = 'Reviews code for performance issues and optimization opportunities';
  capabilities = ['performance-analysis', 'optimization-suggestions', 'bundle-analysis', 'memory-profiling'];
  version = '1.0.0';

  private performancePatterns = new Map<string, RegExp[]>();
  private antiPatterns = new Map<string, RegExp[]>();

  async initialize(): Promise<void> {
    await this.loadPerformancePatterns();
    await this.loadAntiPatterns();
    console.log('⚡ Performance Review Agent initialized');
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { requirements } = task;
      const codebasePath = task.output?.codebasePath || '.';
      
      console.log(`⚡ Performance Review Agent: Analyzing codebase at ${codebasePath}`);
      
      const report = await this.analyzePerformance(codebasePath, requirements);
      
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
        error: `Performance analysis failed: ${error}`,
        metadata: {
          agent: this.id,
          timestamp: new Date()
        }
      };
    }
  }

  private async loadPerformancePatterns(): Promise<void> {
    // Memory leak patterns
    this.performancePatterns.set('memory-leak', [
      /setInterval\s*\(\s*[^,]+,\s*\d+\s*\)/gi,
      /setTimeout\s*\(\s*[^,]+,\s*\d+\s*\)/gi,
      /addEventListener\s*\(\s*[^,]+,\s*[^)]+\)/gi
    ]);

    // Inefficient algorithms
    this.performancePatterns.set('inefficient-algorithm', [
      /\.forEach\s*\(\s*[^)]*\.filter\s*\(/gi,
      /\.map\s*\(\s*[^)]*\.filter\s*\(/gi,
      /for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*array\.length/gi
    ]);

    // Large bundle indicators
    this.performancePatterns.set('large-bundle', [
      /import\s+\*\s+as\s+\w+\s+from/gi,
      /require\s*\(\s*['"]lodash['"]\s*\)/gi,
      /import\s+\{[^}]*\}\s+from\s+['"]moment['"]/gi
    ]);

    // Network performance
    this.performancePatterns.set('network-performance', [
      /fetch\s*\(\s*[^)]+\)/gi,
      /axios\.get\s*\(\s*[^)]+\)/gi,
      /XMLHttpRequest/gi
    ]);

    // Database performance
    this.performancePatterns.set('database-performance', [
      /SELECT\s+\*/gi,
      /WHERE\s+[^)]*LIKE\s+['"]%[^'"]*['"]/gi,
      /ORDER\s+BY\s+[^)]*DESC/gi
    ]);
  }

  private async loadAntiPatterns(): Promise<void> {
    // N+1 query patterns
    this.antiPatterns.set('n-plus-one', [
      /for\s*\(\s*const\s+\w+\s+of\s+\w+\)\s*\{[^}]*await\s+\w+\.find/gi,
      /\.map\s*\(\s*async\s*\(\s*\w+\)\s*=>\s*await\s+\w+\.find/gi
    ]);

    // Unnecessary re-renders
    this.antiPatterns.set('unnecessary-rerenders', [
      /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\},\s*\[\s*\]\s*\)/gi,
      /React\.memo\s*\(\s*\w+\s*\)/gi
    ]);

    // Large component patterns
    this.antiPatterns.set('large-component', [
      /function\s+\w+\s*\(\s*[^)]*\)\s*\{[\s\S]{500,}\}/gi,
      /const\s+\w+\s*=\s*\(\s*[^)]*\)\s*=>\s*\{[\s\S]{500,}\}/gi
    ]);
  }

  private async analyzePerformance(codebasePath: string, requirements: AppRequirements): Promise<PerformanceReport> {
    const issues: PerformanceIssue[] = [];
    
    // Scan for performance issues in code
    const codeIssues = await this.scanCodeForPerformanceIssues(codebasePath);
    issues.push(...codeIssues);
    
    // Analyze bundle and dependencies
    const bundleIssues = await this.analyzeBundle(codebasePath);
    issues.push(...bundleIssues);
    
    // Check for anti-patterns
    const antiPatternIssues = await this.checkAntiPatterns(codebasePath);
    issues.push(...antiPatternIssues);
    
    // Calculate metrics
    const metrics = await this.calculatePerformanceMetrics(codebasePath, issues);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics, issues);
    
    // Generate recommendations
    const recommendations = this.generatePerformanceRecommendations(issues, metrics);
    const optimizationOpportunities = this.identifyOptimizationOpportunities(issues, metrics);
    
    return {
      overallScore,
      issues,
      metrics,
      summary: this.generatePerformanceSummary(issues, metrics, overallScore),
      recommendations,
      optimizationOpportunities
    };
  }

  private async scanCodeForPerformanceIssues(codebasePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    const files = await this.scanCodebase(codebasePath);
    
    for (const file of files) {
      const fileIssues = await this.analyzeFileForPerformance(file);
      issues.push(...fileIssues);
    }
    
    return issues;
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

  private async analyzeFileForPerformance(filePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Check each performance pattern
        for (const [category, patterns] of this.performancePatterns) {
          for (const pattern of patterns) {
            if (pattern.test(line)) {
              const issue = this.createPerformanceIssue(category, line, filePath, lineNumber);
              if (issue) {
                issues.push(issue);
              }
            }
          }
        }
        
        // Additional performance checks
        issues.push(...this.performAdditionalPerformanceChecks(line, filePath, lineNumber));
      }
      
    } catch (error) {
      console.warn(`Warning: Could not analyze file ${filePath}: ${error}`);
    }
    
    return issues;
  }

  private createPerformanceIssue(category: string, line: string, file: string, lineNumber: number): PerformanceIssue | null {
    const issueMap: Record<string, Partial<PerformanceIssue>> = {
      'memory-leak': {
        title: 'Potential Memory Leak',
        description: 'Event listeners or timers may not be properly cleaned up',
        impact: 'Memory usage will grow over time, potentially causing crashes',
        recommendation: 'Ensure proper cleanup in useEffect cleanup or componentWillUnmount',
        estimatedImprovement: '20-40% memory reduction'
      },
      'inefficient-algorithm': {
        title: 'Inefficient Algorithm',
        description: 'Multiple array operations that could be combined',
        impact: 'Slower execution time, especially with large datasets',
        recommendation: 'Combine operations or use more efficient methods',
        estimatedImprovement: '30-60% performance improvement'
      },
      'large-bundle': {
        title: 'Large Bundle Size',
        description: 'Importing entire libraries instead of specific functions',
        impact: 'Larger initial download size, slower page load',
        recommendation: 'Use tree-shaking and import specific functions',
        estimatedImprovement: '15-30% bundle size reduction'
      },
      'network-performance': {
        title: 'Network Performance Issue',
        description: 'Multiple network requests that could be batched',
        impact: 'Slower data loading and more server load',
        recommendation: 'Implement request batching and caching',
        estimatedImprovement: '25-50% faster data loading'
      },
      'database-performance': {
        title: 'Database Performance Issue',
        description: 'Inefficient database queries that could be optimized',
        impact: 'Slower database operations and higher server load',
        recommendation: 'Optimize queries, add indexes, and use pagination',
        estimatedImprovement: '40-70% faster database operations'
      }
    };
    
    const issueInfo = issueMap[category];
    if (!issueInfo) return null;
    
    const severity = this.determinePerformanceIssueSeverity(category, line);
    
    return {
      severity,
      category: category as any,
      title: issueInfo.title!,
      description: issueInfo.description!,
      file,
      line: lineNumber,
      impact: issueInfo.impact!,
      recommendation: issueInfo.recommendation!,
      estimatedImprovement: issueInfo.estimatedImprovement!
    };
  }

  private determinePerformanceIssueSeverity(category: string, line: string): PerformanceIssue['severity'] {
    // Critical performance issues
    if (['memory-leak'].includes(category)) {
      return 'critical';
    }
    
    // High performance issues
    if (['inefficient-algorithm', 'n-plus-one'].includes(category)) {
      return 'high';
    }
    
    // Medium performance issues
    if (['large-bundle', 'database-performance'].includes(category)) {
      return 'medium';
    }
    
    // Low performance issues
    if (['network-performance', 'unnecessary-rerenders'].includes(category)) {
      return 'low';
    }
    
    return 'medium';
  }

  private performAdditionalPerformanceChecks(line: string, file: string, lineNumber: number): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    
    // Check for large loops
    if (line.includes('for') && line.includes('1000')) {
      issues.push({
        severity: 'medium',
        category: 'algorithm',
        title: 'Large Loop Detected',
        description: 'Loop with large iteration count may cause performance issues',
        file,
        line: lineNumber,
        impact: 'Potential UI blocking and slow execution',
        recommendation: 'Consider pagination, virtualization, or breaking into smaller chunks',
        estimatedImprovement: '50-80% faster execution'
      });
    }
    
    // Check for synchronous operations
    if (line.includes('JSON.parse') && line.includes('localStorage')) {
      issues.push({
        severity: 'low',
        category: 'rendering',
        title: 'Synchronous Storage Operation',
        description: 'Synchronous localStorage operations can block the main thread',
        file,
        line: lineNumber,
        impact: 'Potential UI freezing during large data operations',
        recommendation: 'Use async operations or move to background thread',
        estimatedImprovement: '10-20% smoother UI'
      });
    }
    
    return issues;
  }

  private async analyzeBundle(codebasePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    
    try {
      const packageJsonPath = path.join(codebasePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Check for heavy dependencies
        const heavyDependencies = ['moment', 'lodash', 'jquery', 'bootstrap'];
        for (const dep of heavyDependencies) {
          if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
            issues.push({
              severity: 'medium',
              category: 'bundling',
              title: 'Heavy Dependency',
              description: `Dependency ${dep} significantly increases bundle size`,
              file: packageJsonPath,
              impact: 'Larger bundle size and slower initial load',
              recommendation: `Consider alternatives or tree-shaking for ${dep}`,
              estimatedImprovement: '20-40% bundle size reduction'
            });
          }
        }
      }
      
      // Check for webpack configuration
      const webpackConfigPath = path.join(codebasePath, 'webpack.config.js');
      if (fs.existsSync(webpackConfigPath)) {
        const webpackConfig = fs.readFileSync(webpackConfigPath, 'utf-8');
        
        if (!webpackConfig.includes('optimization') || !webpackConfig.includes('splitChunks')) {
          issues.push({
            severity: 'medium',
            category: 'bundling',
            title: 'Missing Bundle Optimization',
            description: 'Webpack configuration lacks optimization settings',
            file: webpackConfigPath,
            impact: 'Larger bundle size and no code splitting',
            recommendation: 'Add optimization and splitChunks configuration',
            estimatedImprovement: '25-45% bundle optimization'
          });
        }
      }
      
    } catch (error) {
      console.warn('Warning: Could not analyze bundle:', error);
    }
    
    return issues;
  }

  private async checkAntiPatterns(codebasePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
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

  private createAntiPatternIssue(category: string, file: string): PerformanceIssue | null {
    const antiPatternMap: Record<string, Partial<PerformanceIssue>> = {
      'n-plus-one': {
        title: 'N+1 Query Problem',
        description: 'Multiple database queries in loops instead of batch operations',
        impact: 'Exponential increase in database calls and slower performance',
        recommendation: 'Use batch queries, eager loading, or data prefetching',
        estimatedImprovement: '60-90% faster data loading'
      },
      'unnecessary-rerenders': {
        title: 'Unnecessary Re-renders',
        description: 'Components re-rendering when not needed',
        impact: 'Slower UI updates and wasted CPU cycles',
        recommendation: 'Use React.memo, useMemo, useCallback, and proper dependency arrays',
        estimatedImprovement: '30-50% faster rendering'
      },
      'large-component': {
        title: 'Large Component',
        description: 'Component with too many responsibilities and large size',
        impact: 'Harder to maintain and potential performance issues',
        recommendation: 'Break into smaller, focused components',
        estimatedImprovement: '20-40% better maintainability'
      }
    };
    
    const issueInfo = antiPatternMap[category];
    if (!issueInfo) return null;
    
    return {
      severity: 'high',
      category: category as any,
      title: issueInfo.title!,
      description: issueInfo.description!,
      file,
      impact: issueInfo.impact!,
      recommendation: issueInfo.recommendation!,
      estimatedImprovement: issueInfo.estimatedImprovement!
    };
  }

  private async calculatePerformanceMetrics(codebasePath: string, issues: PerformanceIssue[]): Promise<PerformanceReport['metrics']> {
    // Mock metrics calculation - in a real implementation, you'd use actual tools
    const bundleSize = Math.max(100, 500 - (issues.length * 20)); // KB
    const loadTime = Math.max(1, 5 - (issues.length * 0.5)); // seconds
    const memoryUsage = Math.max(50, 200 - (issues.length * 10)); // MB
    const databaseQueries = Math.max(5, 20 - (issues.length * 2));
    const renderTime = Math.max(10, 100 - (issues.length * 8)); // ms
    
    return {
      bundleSize,
      loadTime,
      memoryUsage,
      databaseQueries,
      renderTime
    };
  }

  private calculateOverallScore(metrics: PerformanceReport['metrics'], issues: PerformanceIssue[]): number {
    let score = 100;
    
    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }
    
    // Deduct points for poor metrics
    if (metrics.bundleSize > 400) score -= 20;
    if (metrics.loadTime > 3) score -= 15;
    if (metrics.memoryUsage > 150) score -= 10;
    if (metrics.databaseQueries > 15) score -= 10;
    if (metrics.renderTime > 80) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private generatePerformanceRecommendations(issues: PerformanceIssue[], metrics: PerformanceReport['metrics']): string[] {
    const recommendations: string[] = [];
    
    // Critical recommendations
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`Immediately address ${criticalIssues.length} critical performance issues`);
    }
    
    // High priority recommendations
    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      recommendations.push(`Address ${highIssues.length} high-priority performance issues within 1 week`);
    }
    
    // Specific recommendations
    const categories = new Set(issues.map(i => i.category));
    
    if (categories.has('memory-leak')) {
      recommendations.push('Implement proper cleanup for event listeners, timers, and subscriptions');
    }
    
    if (categories.has('inefficient-algorithm')) {
      recommendations.push('Optimize algorithms and data structures for better performance');
    }
    
    if (categories.has('large-bundle')) {
      recommendations.push('Implement code splitting, tree-shaking, and lazy loading');
    }
    
    if (categories.has('database-performance')) {
      recommendations.push('Optimize database queries and implement proper indexing');
    }
    
    // Metric-based recommendations
    if (metrics.bundleSize > 400) {
      recommendations.push('Reduce bundle size through code splitting and dependency optimization');
    }
    
    if (metrics.loadTime > 3) {
      recommendations.push('Implement lazy loading, caching, and CDN optimization');
    }
    
    if (metrics.memoryUsage > 150) {
      recommendations.push('Optimize memory usage and implement proper cleanup');
    }
    
    return recommendations;
  }

  private identifyOptimizationOpportunities(issues: PerformanceIssue[], metrics: PerformanceReport['metrics']): string[] {
    const opportunities: string[] = [];
    
    // Bundle optimization
    if (metrics.bundleSize > 300) {
      opportunities.push('Implement dynamic imports and route-based code splitting');
      opportunities.push('Use tree-shaking and eliminate unused dependencies');
    }
    
    // Caching opportunities
    if (metrics.loadTime > 2) {
      opportunities.push('Implement service worker for offline caching');
      opportunities.push('Add Redis or in-memory caching for frequently accessed data');
    }
    
    // Database optimization
    if (metrics.databaseQueries > 10) {
      opportunities.push('Implement query result caching with Redis');
      opportunities.push('Use database connection pooling and query optimization');
    }
    
    // Rendering optimization
    if (metrics.renderTime > 50) {
      opportunities.push('Implement virtual scrolling for large lists');
      opportunities.push('Use React.lazy and Suspense for component lazy loading');
    }
    
    // General opportunities
    opportunities.push('Implement performance monitoring and alerting');
    opportunities.push('Add performance budgets to CI/CD pipeline');
    opportunities.push('Use Lighthouse CI for automated performance testing');
    
    return opportunities;
  }

  private generatePerformanceSummary(issues: PerformanceIssue[], metrics: PerformanceReport['metrics'], overallScore: number): string {
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    let summary = `Performance analysis completed. Overall score: ${overallScore}/100. `;
    
    if (totalIssues === 0) {
      summary += 'No performance issues found. Excellent performance!';
    } else {
      summary += `Found ${totalIssues} performance issues (${criticalIssues} critical, ${highIssues} high priority). `;
      
      if (overallScore >= 80) {
        summary += 'Performance is good with room for optimization.';
      } else if (overallScore >= 60) {
        summary += 'Performance needs attention. Focus on high-priority issues first.';
      } else {
        summary += 'Performance requires immediate attention. Consider performance refactoring.';
      }
    }
    
    // Add metric highlights
    if (metrics.bundleSize > 400) {
      summary += ' Bundle size is large and should be optimized.';
    }
    
    if (metrics.loadTime > 3) {
      summary += ' Page load time is slow and needs improvement.';
    }
    
    return summary;
  }

  async cleanup(): Promise<void> {
    console.log('⚡ Performance Review Agent cleanup completed');
  }
}
