import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export interface DocumentationIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'missing-docs' | 'outdated-docs' | 'poor-quality' | 'inconsistent' | 'missing-examples';
  title: string;
  description: string;
  file: string;
  line?: number;
  impact: string;
  recommendation: string;
  documentationType: string;
}

export interface DocumentationReport {
  overallScore: number;
  issues: DocumentationIssue[];
  metrics: {
    documentationCoverage: number;
    readmeQuality: number;
    apiDocCoverage: number;
    codeCommentCoverage: number;
    exampleCoverage: number;
  };
  summary: string;
  recommendations: string[];
  documentationStrengths: string[];
  documentationGaps: string[];
}

export default class DocumentationReviewAgent implements Agent {
  id = 'documentation-review-agent';
  name = 'Documentation Review Agent';
  type = 'documentation-review';
  description = 'Reviews code documentation for completeness, quality, and consistency';
  capabilities = ['documentation-analysis', 'coverage-checking', 'quality-assessment', 'consistency-review'];
  version = '1.0.0';

  private documentationPatterns = new Map<string, RegExp[]>();
  private requiredFiles = [
    'README.md',
    'package.json',
    'CHANGELOG.md',
    'LICENSE',
    'CONTRIBUTING.md'
  ];

  async initialize(): Promise<void> {
    await this.loadDocumentationPatterns();
    console.log('📝 Documentation Review Agent initialized');
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { requirements } = task;
      const codebasePath = task.output?.codebasePath || '.';
      
      console.log(`📝 Documentation Review Agent: Analyzing codebase at ${codebasePath}`);
      
      const report = await this.analyzeDocumentation(codebasePath, requirements);
      
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
        error: `Documentation analysis failed: ${error}`,
        metadata: {
          agent: this.id,
          timestamp: new Date()
        }
      };
    }
  }

  private async loadDocumentationPatterns(): Promise<void> {
    // JSDoc patterns
    this.documentationPatterns.set('jsdoc', [
      /\/\*\*[\s\S]*?\*\//gi,
      /\/\/\/[\s\S]*$/gm,
      /@param\s+\{[^}]*\}\s+\w+/gi,
      /@returns?\/gi,
      /@throws?/gi
    ]);

    // Python docstring patterns
    this.documentationPatterns.set('python-docstring', [
      /"""[^"]*"""/gi,
      /'''[^']*'''/gi,
      /def\s+\w+\s*\([^)]*\)\s*->\s*\w+/gi
    ]);

    // Go documentation patterns
    this.documentationPatterns.set('go-docs', [
      /\/\/\s+\w+[\s\S]*$/gm,
      /func\s+\w+\s*\([^)]*\)\s*[\w\[\]]*\s*\{/gi
    ]);

    // Inline comment patterns
    this.documentationPatterns.set('inline-comments', [
      /\/\/\s+[^\/\n]+$/gm,
      /\/\*\s+[^*]+\*\//gi,
      /#\s+[^\n]+$/gm
    ]);
  }

  private async analyzeDocumentation(codebasePath: string, requirements: AppRequirements): Promise<DocumentationReport> {
    const issues: DocumentationIssue[] = [];
    
    // Check for required documentation files
    const fileIssues = await this.checkRequiredFiles(codebasePath);
    issues.push(...fileIssues);
    
    // Analyze code documentation
    const codeDocIssues = await this.analyzeCodeDocumentation(codebasePath);
    issues.push(...codeDocIssues);
    
    // Check documentation quality
    const qualityIssues = await this.checkDocumentationQuality(codebasePath);
    issues.push(...qualityIssues);
    
    // Calculate metrics
    const metrics = await this.calculateDocumentationMetrics(codebasePath, issues);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics, issues);
    
    // Generate recommendations
    const recommendations = this.generateDocumentationRecommendations(issues, metrics);
    const strengths = this.identifyDocumentationStrengths(issues, metrics);
    const gaps = this.identifyDocumentationGaps(issues, metrics);
    
    return {
      overallScore,
      issues,
      metrics,
      summary: this.generateDocumentationSummary(issues, metrics, overallScore),
      recommendations,
      documentationStrengths: strengths,
      documentationGaps: gaps
    };
  }

  private async checkRequiredFiles(codebasePath: string): Promise<DocumentationIssue[]> {
    const issues: DocumentationIssue[] = [];
    
    for (const requiredFile of this.requiredFiles) {
      const filePath = path.join(codebasePath, requiredFile);
      
      if (!fs.existsSync(filePath)) {
        const severity = this.determineFileSeverity(requiredFile);
        
        issues.push({
          severity,
          category: 'missing-docs',
          title: `Missing ${requiredFile}`,
          description: `Required documentation file ${requiredFile} is missing`,
          file: codebasePath,
          impact: 'Users and developers lack essential information',
          recommendation: `Create ${requiredFile} with appropriate content`,
          documentationType: 'project-documentation'
        });
      } else {
        // Check file quality
        const qualityIssues = await this.analyzeFileQuality(filePath, requiredFile);
        issues.push(...qualityIssues);
      }
    }
    
    return issues;
  }

  private determineFileSeverity(fileName: string): DocumentationIssue['severity'] {
    switch (fileName) {
      case 'README.md':
        return 'critical';
      case 'package.json':
        return 'critical';
      case 'LICENSE':
        return 'high';
      case 'CHANGELOG.md':
        return 'medium';
      case 'CONTRIBUTING.md':
        return 'low';
      default:
        return 'medium';
    }
  }

  private async analyzeFileQuality(filePath: string, fileName: string): Promise<DocumentationIssue[]> {
    const issues: DocumentationIssue[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (fileName === 'README.md') {
        const readmeIssues = this.analyzeReadmeQuality(content, filePath);
        issues.push(...readmeIssues);
      } else if (fileName === 'package.json') {
        const packageIssues = this.analyzePackageJsonQuality(content, filePath);
        issues.push(...packageIssues);
      }
      
    } catch (error) {
      console.warn(`Warning: Could not analyze file ${filePath}: ${error}`);
    }
    
    return issues;
  }

  private analyzeReadmeQuality(content: string, filePath: string): DocumentationIssue[] {
    const issues: DocumentationIssue[] = [];
    
    // Check for minimum content
    if (content.length < 500) {
      issues.push({
        severity: 'high',
        category: 'poor-quality',
        title: 'README Too Short',
        description: 'README.md is too short and lacks sufficient information',
        file: filePath,
        impact: 'Users cannot understand the project or get started',
        recommendation: 'Expand README with installation, usage, and contribution guidelines',
        documentationType: 'readme'
      });
    }
    
    // Check for essential sections
    const essentialSections = ['installation', 'usage', 'getting started', 'examples'];
    const missingSections = essentialSections.filter(section => 
      !content.toLowerCase().includes(section)
    );
    
    if (missingSections.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'missing-docs',
        title: 'Missing Essential README Sections',
        description: `README is missing: ${missingSections.join(', ')}`,
        file: filePath,
        impact: 'Users cannot effectively use the project',
        recommendation: 'Add missing sections to improve user experience',
        documentationType: 'readme'
      });
    }
    
    // Check for code examples
    if (!content.includes('```') && !content.includes('`')) {
      issues.push({
        severity: 'medium',
        category: 'missing-examples',
        title: 'No Code Examples in README',
        description: 'README lacks code examples for usage',
        file: filePath,
        impact: 'Users cannot see how to use the project',
        recommendation: 'Add code examples showing basic usage',
        documentationType: 'readme'
      });
    }
    
    return issues;
  }

  private analyzePackageJsonQuality(content: string, filePath: string): DocumentationIssue[] {
    const issues: DocumentationIssue[] = [];
    
    try {
      const packageJson = JSON.parse(content);
      
      // Check for required fields
      if (!packageJson.description) {
        issues.push({
          severity: 'high',
          category: 'missing-docs',
          title: 'Missing Package Description',
          description: 'package.json lacks a description field',
          file: filePath,
          impact: 'Users cannot understand what the package does',
          recommendation: 'Add a clear description of the package functionality',
          documentationType: 'package-json'
        });
      }
      
      if (!packageJson.author) {
        issues.push({
          severity: 'medium',
          category: 'missing-docs',
          title: 'Missing Package Author',
          description: 'package.json lacks author information',
          file: filePath,
          impact: 'Users cannot identify who maintains the package',
          recommendation: 'Add author information and contact details',
          documentationType: 'package-json'
        });
      }
      
      if (!packageJson.repository) {
        issues.push({
          severity: 'medium',
          category: 'missing-docs',
          title: 'Missing Repository Information',
          description: 'package.json lacks repository information',
          file: filePath,
          impact: 'Users cannot find the source code or contribute',
          recommendation: 'Add repository URL and type',
          documentationType: 'package-json'
        });
      }
      
      if (!packageJson.scripts || !packageJson.scripts.test) {
        issues.push({
          severity: 'low',
          category: 'missing-docs',
          title: 'Missing Test Scripts',
          description: 'package.json lacks test scripts',
          file: filePath,
          impact: 'Developers cannot easily run tests',
          recommendation: 'Add test, build, and other essential scripts',
          documentationType: 'package-json'
        });
      }
      
    } catch (error) {
      issues.push({
        severity: 'critical',
        category: 'poor-quality',
        title: 'Invalid package.json',
        description: 'package.json contains invalid JSON',
        file: filePath,
        impact: 'Package cannot be installed or used',
        recommendation: 'Fix JSON syntax errors in package.json',
        documentationType: 'package-json'
      });
    }
    
    return issues;
  }

  private async analyzeCodeDocumentation(codebasePath: string): Promise<DocumentationIssue[]> {
    const issues: DocumentationIssue[] = [];
    const files = await this.scanCodebase(codebasePath);
    
    for (const file of files) {
      const fileIssues = await this.analyzeFileDocumentation(file);
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

  private async analyzeFileDocumentation(filePath: string): Promise<DocumentationIssue[]> {
    const issues: DocumentationIssue[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();
      const language = this.getLanguageFromExtension(ext);
      
      if (!language) return issues;
      
      // Check for function/class documentation
      const functionIssues = this.checkFunctionDocumentation(content, filePath, language);
      issues.push(...functionIssues);
      
      // Check for inline comments
      const commentIssues = this.checkInlineComments(content, filePath);
      issues.push(...commentIssues);
      
      // Check for complex code without documentation
      const complexityIssues = this.checkComplexCodeDocumentation(content, filePath);
      issues.push(...complexityIssues);
      
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

  private checkFunctionDocumentation(content: string, filePath: string, language: string): DocumentationIssue[] {
    const issues: DocumentationIssue[] = [];
    
    // Find function/class definitions
    const functionRegex = this.getFunctionRegex(language);
    const classRegex = this.getClassRegex(language);
    
    const functions = [...content.matchAll(functionRegex)];
    const classes = [...content.matchAll(classRegex)];
    
    // Check function documentation
    for (const func of functions) {
      const funcName = func[1] || func[2] || 'unknown';
      const hasDocs = this.hasDocumentation(content, func.index || 0, language);
      
      if (!hasDocs) {
        issues.push({
          severity: 'medium',
          category: 'missing-docs',
          title: `Undocumented Function: ${funcName}`,
          description: `Function ${funcName} lacks documentation`,
          file: filePath,
          impact: 'Developers cannot understand function purpose and usage',
          recommendation: `Add ${this.getDocStyle(language)} documentation for ${funcName}`,
          documentationType: 'function-documentation'
        });
      }
    }
    
    // Check class documentation
    for (const cls of classes) {
      const className = cls[1] || 'unknown';
      const hasDocs = this.hasDocumentation(content, cls.index || 0, language);
      
      if (!hasDocs) {
        issues.push({
          severity: 'medium',
          category: 'missing-docs',
          title: `Undocumented Class: ${className}`,
          description: `Class ${className} lacks documentation`,
          file: filePath,
          impact: 'Developers cannot understand class purpose and responsibilities',
          recommendation: `Add ${this.getDocStyle(language)} documentation for ${className}`,
          documentationType: 'class-documentation'
        });
      }
    }
    
    return issues;
  }

  private getFunctionRegex(language: string): RegExp {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|async\s*\([^)]*\)\s*=>))/gi;
      case 'python':
        return /def\s+(\w+)\s*\(/gi;
      case 'go':
        return /func\s+(\w+)\s*\(/gi;
      case 'java':
      case 'csharp':
        return /(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/gi;
      default:
        return /function\s+(\w+)/gi;
    }
  }

  private getClassRegex(language: string): RegExp {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return /class\s+(\w+)/gi;
      case 'python':
        return /class\s+(\w+)/gi;
      case 'go':
        return /type\s+(\w+)\s+struct/gi;
      case 'java':
      case 'csharp':
        return /class\s+(\w+)/gi;
      default:
        return /class\s+(\w+)/gi;
    }
  }

  private hasDocumentation(content: string, index: number, language: string): boolean {
    // Look for documentation before the function/class
    const beforeContent = content.substring(Math.max(0, index - 200), index);
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        return /\*\//.test(beforeContent) || /\/\/\//.test(beforeContent);
      case 'python':
        return /"""/.test(beforeContent) || /'''/.test(beforeContent);
      case 'go':
        return /\/\/\s+\w+/.test(beforeContent);
      case 'java':
      case 'csharp':
        return /\*\//.test(beforeContent) || /\/\/\//.test(beforeContent);
      default:
        return /\*\//.test(beforeContent) || /\/\//.test(beforeContent);
    }
  }

  private getDocStyle(language: string): string {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return 'JSDoc';
      case 'python':
        return 'docstring';
      case 'go':
        return 'Go comment';
      case 'java':
      case 'csharp':
        return 'XML documentation';
      default:
        return 'documentation comment';
    }
  }

  private checkInlineComments(content: string, filePath: string): DocumentationIssue[] {
    const issues: DocumentationIssue[] = [];
    const lines = content.split('\n');
    
    let complexCodeCount = 0;
    let documentedComplexCodeCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Identify complex code patterns
      if (this.isComplexCode(line)) {
        complexCodeCount++;
        
        // Check if there's a comment explaining it
        if (this.hasExplanatoryComment(lines, i)) {
          documentedComplexCodeCount++;
        }
      }
    }
    
    // If more than 30% of complex code lacks explanation
    if (complexCodeCount > 0 && (documentedComplexCodeCount / complexCodeCount) < 0.7) {
      issues.push({
        severity: 'low',
        category: 'missing-docs',
        title: 'Complex Code Lacks Explanation',
        description: `${Math.round((1 - documentedComplexCodeCount / complexCodeCount) * 100)}% of complex code lacks explanatory comments`,
        file: filePath,
        impact: 'Code is harder to understand and maintain',
        recommendation: 'Add inline comments explaining complex logic and algorithms',
        documentationType: 'inline-comments'
      });
    }
    
    return issues;
  }

  private isComplexCode(line: string): boolean {
    // Simple heuristics for complex code
    return (
      line.includes('regex') ||
      line.includes('algorithm') ||
      line.includes('optimization') ||
      line.includes('workaround') ||
      line.includes('hack') ||
      line.length > 120 ||
      (line.includes('if') && line.includes('&&') && line.includes('||')) ||
      (line.includes('for') && line.includes('in') && line.includes('of'))
    );
  }

  private hasExplanatoryComment(lines: string[], lineIndex: number): boolean {
    // Check if there's a comment above or on the same line
    const currentLine = lines[lineIndex];
    const previousLine = lineIndex > 0 ? lines[lineIndex - 1] : '';
    
    return (
      currentLine.includes('//') ||
      currentLine.includes('/*') ||
      currentLine.includes('#') ||
      previousLine.includes('//') ||
      previousLine.includes('/*') ||
      previousLine.includes('#')
    );
  }

  private checkComplexCodeDocumentation(content: string, filePath: string): DocumentationIssue[] {
    const issues: DocumentationIssue[] = [];
    
    // Check for TODO comments without explanation
    const todoMatches = content.match(/TODO[^:]*:/gi);
    if (todoMatches) {
      const unexplainedTodos = todoMatches.filter(todo => 
        todo.length < 20 || !todo.includes('explain') || !todo.includes('why')
      );
      
      if (unexplainedTodos.length > 0) {
        issues.push({
          severity: 'low',
          category: 'poor-quality',
          title: 'Unexplained TODO Comments',
          description: `${unexplainedTodos.length} TODO comments lack sufficient explanation`,
          file: filePath,
          impact: 'Developers cannot understand what needs to be done',
          recommendation: 'Add detailed explanations to TODO comments',
          documentationType: 'todo-comments'
        });
      }
    }
    
    return issues;
  }

  private async checkDocumentationQuality(codebasePath: string): Promise<DocumentationIssue[]> {
    const issues: DocumentationIssue[] = [];
    
    // Check for outdated documentation
    const outdatedIssues = await this.checkOutdatedDocumentation(codebasePath);
    issues.push(...outdatedIssues);
    
    // Check for inconsistent documentation
    const consistencyIssues = await this.checkDocumentationConsistency(codebasePath);
    issues.push(...consistencyIssues);
    
    return issues;
  }

  private async checkOutdatedDocumentation(codebasePath: string): Promise<DocumentationIssue[]> {
    const issues: DocumentationIssue[] = [];
    
    // This would typically check for outdated documentation
    // For now, we'll check for common outdated patterns
    
    try {
      const packageJsonPath = path.join(codebasePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Check for outdated Node.js version requirements
        if (packageJson.engines?.node && packageJson.engines.node.includes('12')) {
          issues.push({
            severity: 'medium',
            category: 'outdated-docs',
            title: 'Outdated Node.js Version Requirement',
            description: 'Package requires Node.js 12 which is end-of-life',
            file: packageJsonPath,
            impact: 'Users may encounter security and compatibility issues',
            recommendation: 'Update to Node.js 18+ LTS version',
            documentationType: 'package-requirements'
          });
        }
      }
    } catch (error) {
      console.warn('Warning: Could not check for outdated documentation:', error);
    }
    
    return issues;
  }

  private async checkDocumentationConsistency(codebasePath: string): Promise<DocumentationIssue[]> {
    const issues: DocumentationIssue[] = [];
    
    // This would check for consistent documentation style
    // For now, we'll add a placeholder issue if needed
    
    return issues;
  }

  private async calculateDocumentationMetrics(codebasePath: string, issues: DocumentationIssue[]): Promise<DocumentationReport['metrics']> {
    // Mock metrics calculation - in a real implementation, you'd use actual tools
    const documentationCoverage = Math.max(0, 100 - (issues.length * 5));
    const readmeQuality = Math.max(0, 100 - (issues.filter(i => i.documentationType === 'readme').length * 10));
    const apiDocCoverage = Math.max(0, 100 - (issues.filter(i => i.documentationType === 'api-documentation').length * 8));
    const codeCommentCoverage = Math.max(0, 100 - (issues.filter(i => i.documentationType === 'function-documentation').length * 6));
    const exampleCoverage = Math.max(0, 100 - (issues.filter(i => i.documentationType === 'missing-examples').length * 12));
    
    return {
      documentationCoverage,
      readmeQuality,
      apiDocCoverage,
      codeCommentCoverage,
      exampleCoverage
    };
  }

  private calculateOverallScore(metrics: DocumentationReport['metrics'], issues: DocumentationIssue[]): number {
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
          score -= 6;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }
    
    // Deduct points for poor metrics
    if (metrics.documentationCoverage < 70) score -= 20;
    if (metrics.readmeQuality < 70) score -= 15;
    if (metrics.apiDocCoverage < 70) score -= 15;
    if (metrics.codeCommentCoverage < 70) score -= 10;
    if (metrics.exampleCoverage < 70) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateDocumentationRecommendations(issues: DocumentationIssue[], metrics: DocumentationReport['metrics']): string[] {
    const recommendations: string[] = [];
    
    // Critical recommendations
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`Immediately address ${criticalIssues.length} critical documentation issues`);
    }
    
    // High priority recommendations
    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      recommendations.push(`Address ${highIssues.length} high-priority documentation issues within 1 week`);
    }
    
    // Specific recommendations
    const categories = new Set(issues.map(i => i.category));
    
    if (categories.has('missing-docs')) {
      recommendations.push('Create missing essential documentation files');
    }
    
    if (categories.has('poor-quality')) {
      recommendations.push('Improve documentation quality and completeness');
    }
    
    if (categories.has('missing-examples')) {
      recommendations.push('Add code examples and usage demonstrations');
    }
    
    // Metric-based recommendations
    if (metrics.documentationCoverage < 70) {
      recommendations.push('Increase overall documentation coverage');
    }
    
    if (metrics.readmeQuality < 70) {
      recommendations.push('Improve README quality and completeness');
    }
    
    if (metrics.codeCommentCoverage < 70) {
      recommendations.push('Add documentation to functions and classes');
    }
    
    // General recommendations
    recommendations.push('Establish documentation standards and templates');
    recommendations.push('Implement automated documentation generation');
    recommendations.push('Regular documentation reviews and updates');
    
    return recommendations;
  }

  private identifyDocumentationStrengths(issues: DocumentationIssue[], metrics: DocumentationReport['metrics']): string[] {
    const strengths: string[] = [];
    
    // Identify positive aspects
    if (metrics.documentationCoverage > 80) {
      strengths.push('High overall documentation coverage');
    }
    
    if (metrics.readmeQuality > 80) {
      strengths.push('High-quality README documentation');
    }
    
    if (metrics.codeCommentCoverage > 80) {
      strengths.push('Good code documentation coverage');
    }
    
    if (metrics.exampleCoverage > 80) {
      strengths.push('Comprehensive code examples');
    }
    
    // Check for good practices
    const hasGoodDocs = issues.some(issue => issue.severity === 'low');
    if (hasGoodDocs) {
      strengths.push('Follows documentation best practices');
    }
    
    return strengths;
  }

  private identifyDocumentationGaps(issues: DocumentationIssue[], metrics: DocumentationReport['metrics']): string[] {
    const gaps: string[] = [];
    
    // Identify areas for improvement
    if (metrics.documentationCoverage < 60) {
      gaps.push('Low overall documentation coverage');
    }
    
    if (metrics.readmeQuality < 60) {
      gaps.push('Poor README quality');
    }
    
    if (metrics.apiDocCoverage < 60) {
      gaps.push('Missing API documentation');
    }
    
    if (metrics.codeCommentCoverage < 60) {
      gaps.push('Lack of code documentation');
    }
    
    if (metrics.exampleCoverage < 60) {
      gaps.push('Missing code examples');
    }
    
    // Check for critical gaps
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      gaps.push('Critical documentation missing');
    }
    
    return gaps;
  }

  private generateDocumentationSummary(issues: DocumentationIssue[], metrics: DocumentationReport['metrics'], overallScore: number): string {
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    let summary = `Documentation review completed. Overall score: ${overallScore}/100. `;
    
    if (totalIssues === 0) {
      summary += 'No documentation issues found. Excellent documentation!';
    } else {
      summary += `Found ${totalIssues} documentation issues (${criticalIssues} critical, ${highIssues} high priority). `;
      
      if (overallScore >= 80) {
        summary += 'Documentation is good with room for minor improvements.';
      } else if (overallScore >= 60) {
        summary += 'Documentation needs attention. Focus on high-priority issues first.';
      } else {
        summary += 'Documentation requires significant improvement. Consider documentation overhaul.';
      }
    }
    
    // Add metric highlights
    if (metrics.documentationCoverage < 70) {
      summary += ' Overall documentation coverage is low.';
    }
    
    if (metrics.readmeQuality < 70) {
      summary += ' README quality needs improvement.';
    }
    
    return summary;
  }

  async cleanup(): Promise<void> {
    console.log('📝 Documentation Review Agent cleanup completed');
  }
}
