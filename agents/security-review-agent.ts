import { Agent, AgentTask, AgentResult, AppRequirements } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export interface SecurityVulnerability {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'input-validation' | 'data-exposure' | 'injection' | 'configuration';
  title: string;
  description: string;
  file: string;
  line?: number;
  cwe?: string;
  owasp?: string;
  recommendation: string;
  riskScore: number;
}

export interface SecurityReport {
  overallRiskScore: number;
  vulnerabilities: SecurityVulnerability[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  recommendations: string[];
  compliance: {
    owasp: boolean;
    gdpr: boolean;
    soc2: boolean;
    hipaa: boolean;
  };
}

export default class SecurityReviewAgent implements Agent {
  id = 'security-review-agent';
  name = 'Security Review Agent';
  type = 'security-audit';
  description = 'Reviews code for security vulnerabilities and compliance with security best practices';
  capabilities = ['vulnerability-scanning', 'security-audit', 'compliance-checking', 'risk-assessment'];
  version = '1.0.0';

  private securityPatterns = new Map<string, RegExp[]>();
  private vulnerableDependencies: string[] = [];

  async initialize(): Promise<void> {
    await this.loadSecurityPatterns();
    await this.loadVulnerableDependencies();
    console.log('🔒 Security Review Agent initialized');
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { requirements } = task;
      const codebasePath = task.output?.codebasePath || '.';
      
      console.log(`🔒 Security Review Agent: Scanning codebase at ${codebasePath}`);
      
      const report = await this.performSecurityAudit(codebasePath, requirements);
      
      return {
        success: true,
        data: report,
        metadata: {
          agent: this.id,
          timestamp: new Date(),
          riskLevel: report.riskLevel,
          totalVulnerabilities: report.vulnerabilities.length,
          criticalVulnerabilities: report.vulnerabilities.filter(v => v.severity === 'critical').length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Security audit failed: ${error}`,
        metadata: {
          agent: this.id,
          timestamp: new Date()
        }
      };
    }
  }

  private async loadSecurityPatterns(): Promise<void> {
    // SQL Injection patterns
    this.securityPatterns.set('sql-injection', [
      /executeQuery\s*\(\s*[\w$]+\s*\+\s*[\w$]+/gi,
      /execute\s*\(\s*[\w$]+\s*\+\s*[\w$]+/gi,
      /query\s*\(\s*[\w$]+\s*\+\s*[\w$]+/gi
    ]);

    // XSS patterns
    this.securityPatterns.set('xss', [
      /innerHTML\s*=\s*[\w$]+/gi,
      /outerHTML\s*=\s*[\w$]+/gi,
      /document\.write\s*\(\s*[\w$]+/gi,
      /eval\s*\(\s*[\w$]+/gi
    ]);

    // Command injection patterns
    this.securityPatterns.set('command-injection', [
      /exec\s*\(\s*[\w$]+\s*\+\s*[\w$]+/gi,
      /spawn\s*\(\s*[\w$]+\s*\+\s*[\w$]+/gi,
      /system\s*\(\s*[\w$]+\s*\+\s*[\w$]+/gi
    ]);

    // Path traversal patterns
    this.securityPatterns.set('path-traversal', [
      /fs\.readFile\s*\(\s*[\w$]+\s*\+\s*[\w$]+/gi,
      /fs\.writeFile\s*\(\s*[\w$]+\s*\+\s*[\w$]+/gi,
      /path\.join\s*\(\s*[\w$]+\s*,\s*[\w$]+/gi
    ]);

    // Hardcoded secrets
    this.securityPatterns.set('hardcoded-secrets', [
      /password\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      /api_key\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      /secret\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      /token\s*[:=]\s*['"][^'"]{8,}['"]/gi
    ]);

    // Weak authentication
    this.securityPatterns.set('weak-auth', [
      /bcrypt\.hash\s*\(\s*[\w$]+\s*,\s*1\s*\)/gi,
      /crypto\.createHash\s*\(\s*['"]md5['"]/gi,
      /crypto\.createHash\s*\(\s*['"]sha1['"]/gi
    ]);

    // Insecure headers
    this.securityPatterns.set('insecure-headers', [
      /Access-Control-Allow-Origin\s*:\s*\*/gi,
      /X-Frame-Options\s*:\s*['"]DENY['"]/gi,
      /Strict-Transport-Security/gi
    ]);
  }

  private async loadVulnerableDependencies(): Promise<void> {
    // This would typically load from a vulnerability database
    // For now, we'll use some common examples
    this.vulnerableDependencies = [
      'lodash < 4.17.21',
      'moment < 2.29.4',
      'axios < 1.6.0',
      'express < 4.18.2'
    ];
  }

  private async performSecurityAudit(codebasePath: string, requirements: AppRequirements): Promise<SecurityReport> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Scan for security issues in code
    const codeVulnerabilities = await this.scanCodeForVulnerabilities(codebasePath);
    vulnerabilities.push(...codeVulnerabilities);
    
    // Check dependencies
    const dependencyVulnerabilities = await this.checkDependencies(codebasePath);
    vulnerabilities.push(...dependencyVulnerabilities);
    
    // Check configuration files
    const configVulnerabilities = await this.checkConfigurationFiles(codebasePath);
    vulnerabilities.push(...configVulnerabilities);
    
    // Calculate overall risk score
    const overallRiskScore = this.calculateRiskScore(vulnerabilities);
    const riskLevel = this.determineRiskLevel(overallRiskScore);
    
    // Generate recommendations
    const recommendations = this.generateSecurityRecommendations(vulnerabilities);
    
    // Check compliance
    const compliance = this.checkCompliance(vulnerabilities);
    
    return {
      overallRiskScore,
      vulnerabilities,
      riskLevel,
      summary: this.generateSecuritySummary(vulnerabilities, riskLevel),
      recommendations,
      compliance
    };
  }

  private async scanCodeForVulnerabilities(codebasePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const files = await this.scanCodebase(codebasePath);
    
    for (const file of files) {
      const fileVulnerabilities = await this.analyzeFileForVulnerabilities(file);
      vulnerabilities.push(...fileVulnerabilities);
    }
    
    return vulnerabilities;
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

  private async analyzeFileForVulnerabilities(filePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Check each security pattern
        for (const [category, patterns] of this.securityPatterns) {
          for (const pattern of patterns) {
            if (pattern.test(line)) {
              const vulnerability = this.createVulnerability(category, line, filePath, lineNumber);
              if (vulnerability) {
                vulnerabilities.push(vulnerability);
              }
            }
          }
        }
        
        // Additional security checks
        vulnerabilities.push(...this.performAdditionalSecurityChecks(line, filePath, lineNumber));
      }
      
    } catch (error) {
      console.warn(`Warning: Could not analyze file ${filePath}: ${error}`);
    }
    
    return vulnerabilities;
  }

  private createVulnerability(category: string, line: string, file: string, lineNumber: number): SecurityVulnerability | null {
    const vulnerabilityMap: Record<string, Partial<SecurityVulnerability>> = {
      'sql-injection': {
        title: 'Potential SQL Injection',
        description: 'User input is concatenated directly into SQL queries, creating injection vulnerabilities',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
        recommendation: 'Use parameterized queries or prepared statements instead of string concatenation'
      },
      'xss': {
        title: 'Cross-Site Scripting (XSS)',
        description: 'User input is directly inserted into DOM without proper sanitization',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        recommendation: 'Sanitize all user inputs and use safe DOM manipulation methods'
      },
      'command-injection': {
        title: 'Command Injection',
        description: 'User input is used directly in system commands',
        cwe: 'CWE-78',
        owasp: 'A03:2021',
        recommendation: 'Avoid executing system commands with user input, use APIs instead'
      },
      'path-traversal': {
        title: 'Path Traversal',
        description: 'User input is used in file operations without proper path validation',
        cwe: 'CWE-22',
        owasp: 'A01:2021',
        recommendation: 'Validate and sanitize file paths, use path.resolve() for absolute paths'
      },
      'hardcoded-secrets': {
        title: 'Hardcoded Secrets',
        description: 'Sensitive information like passwords or API keys are hardcoded in source code',
        cwe: 'CWE-259',
        owasp: 'A02:2021',
        recommendation: 'Use environment variables or secure secret management systems'
      },
      'weak-auth': {
        title: 'Weak Authentication',
        description: 'Weak hashing algorithms or insufficient salt rounds are used',
        cwe: 'CWE-327',
        owasp: 'A07:2021',
        recommendation: 'Use strong hashing algorithms (bcrypt, Argon2) with sufficient salt rounds'
      },
      'insecure-headers': {
        title: 'Insecure Security Headers',
        description: 'Missing or insecure security headers that could lead to various attacks',
        cwe: 'CWE-693',
        owasp: 'A05:2021',
        recommendation: 'Implement proper security headers and Content Security Policy'
      }
    };
    
    const vulnInfo = vulnerabilityMap[category];
    if (!vulnInfo) return null;
    
    const severity = this.determineVulnerabilitySeverity(category, line);
    const riskScore = this.calculateVulnerabilityRiskScore(severity, category);
    
    return {
      severity,
      category: category as any,
      title: vulnInfo.title!,
      description: vulnInfo.description!,
      file,
      line: lineNumber,
      cwe: vulnInfo.cwe,
      owasp: vulnInfo.owasp,
      recommendation: vulnInfo.recommendation!,
      riskScore
    };
  }

  private determineVulnerabilitySeverity(category: string, line: string): SecurityVulnerability['severity'] {
    // Critical vulnerabilities
    if (['sql-injection', 'command-injection'].includes(category)) {
      return 'critical';
    }
    
    // High vulnerabilities
    if (['xss', 'path-traversal', 'hardcoded-secrets'].includes(category)) {
      return 'high';
    }
    
    // Medium vulnerabilities
    if (['weak-auth'].includes(category)) {
      return 'medium';
    }
    
    // Low vulnerabilities
    if (['insecure-headers'].includes(category)) {
      return 'low';
    }
    
    return 'medium';
  }

  private calculateVulnerabilityRiskScore(severity: SecurityVulnerability['severity'], category: string): number {
    let baseScore = 0;
    
    switch (severity) {
      case 'critical':
        baseScore = 10;
        break;
      case 'high':
        baseScore = 8;
        break;
      case 'medium':
        baseScore = 5;
        break;
      case 'low':
        baseScore = 2;
        break;
    }
    
    // Adjust score based on category
    if (['sql-injection', 'command-injection'].includes(category)) {
      baseScore += 2;
    }
    
    return Math.min(10, baseScore);
  }

  private performAdditionalSecurityChecks(line: string, file: string, lineNumber: number): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for disabled security features
    if (line.includes('// eslint-disable') || line.includes('// tslint:disable')) {
      vulnerabilities.push({
        severity: 'low',
        category: 'configuration',
        title: 'Security Linting Disabled',
        description: 'Security-related linting rules are disabled',
        file,
        line: lineNumber,
        recommendation: 'Review why security rules are disabled and enable them if possible',
        riskScore: 2
      });
    }
    
    // Check for debug statements in production code
    if (line.includes('debugger') || line.includes('console.log')) {
      vulnerabilities.push({
        severity: 'low',
        category: 'configuration',
        title: 'Debug Code in Production',
        description: 'Debug statements found in production code',
        file,
        line: lineNumber,
        recommendation: 'Remove debug statements before production deployment',
        riskScore: 1
      });
    }
    
    return vulnerabilities;
  }

  private async checkDependencies(codebasePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    try {
      const packageJsonPath = path.join(codebasePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Check for known vulnerable dependencies
        for (const dep of this.vulnerableDependencies) {
          const [name, version] = dep.split(' < ');
          if (packageJson.dependencies?.[name] || packageJson.devDependencies?.[name]) {
            vulnerabilities.push({
              severity: 'high',
              category: 'configuration',
              title: 'Vulnerable Dependency',
              description: `Dependency ${name} has known security vulnerabilities`,
              file: packageJsonPath,
              cwe: 'CWE-400',
              owasp: 'A06:2021',
              recommendation: `Update ${name} to version ${version} or later`,
              riskScore: 7
            });
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not check dependencies:', error);
    }
    
    return vulnerabilities;
  }

  private async checkConfigurationFiles(codebasePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for common configuration files
    const configFiles = [
      '.env',
      'config.json',
      'config.js',
      'docker-compose.yml',
      'Dockerfile'
    ];
    
    for (const configFile of configFiles) {
      const configPath = path.join(codebasePath, configFile);
      if (fs.existsSync(configPath)) {
        const configVulns = await this.analyzeConfigFile(configPath, configFile);
        vulnerabilities.push(...configVulns);
      }
    }
    
    return vulnerabilities;
  }

  private async analyzeConfigFile(configPath: string, fileName: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      
      // Check for exposed secrets in .env files
      if (fileName === '.env') {
        const secretPatterns = [
          /PASSWORD\s*=\s*[^#\n]+/gi,
          /API_KEY\s*=\s*[^#\n]+/gi,
          /SECRET\s*=\s*[^#\n]+/gi
        ];
        
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            vulnerabilities.push({
              severity: 'high',
              category: 'data-exposure',
              title: 'Exposed Secrets in Environment File',
              description: 'Sensitive information is exposed in environment configuration',
              file: configPath,
              cwe: 'CWE-532',
              owasp: 'A02:2021',
              recommendation: 'Use .env.example for templates and ensure .env is in .gitignore',
              riskScore: 8
            });
            break;
          }
        }
      }
      
      // Check Docker configuration
      if (fileName === 'Dockerfile') {
        if (content.includes('USER root') && !content.includes('USER node')) {
          vulnerabilities.push({
            severity: 'medium',
            category: 'configuration',
            title: 'Container Running as Root',
            description: 'Docker container is configured to run as root user',
            file: configPath,
            cwe: 'CWE-250',
            owasp: 'A05:2021',
            recommendation: 'Create and use a non-root user in the container',
            riskScore: 5
          });
        }
      }
      
    } catch (error) {
      console.warn(`Warning: Could not analyze config file ${configPath}: ${error}`);
    }
    
    return vulnerabilities;
  }

  private calculateRiskScore(vulnerabilities: SecurityVulnerability[]): number {
    let totalScore = 0;
    let maxScore = 0;
    
    for (const vuln of vulnerabilities) {
      totalScore += vuln.riskScore;
      maxScore = Math.max(maxScore, vuln.riskScore);
    }
    
    // Weight critical vulnerabilities more heavily
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    
    return Math.min(10, (totalScore + (criticalCount * 3) + (highCount * 2)) / 10);
  }

  private determineRiskLevel(riskScore: number): SecurityReport['riskLevel'] {
    if (riskScore >= 8) return 'critical';
    if (riskScore >= 6) return 'high';
    if (riskScore >= 4) return 'medium';
    return 'low';
  }

  private generateSecurityRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations: string[] = [];
    
    // Critical recommendations
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      recommendations.push(`Immediately address ${criticalVulns.length} critical security vulnerabilities`);
    }
    
    // High priority recommendations
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');
    if (highVulns.length > 0) {
      recommendations.push(`Address ${highVulns.length} high-priority security issues within 48 hours`);
    }
    
    // Specific recommendations
    const categories = new Set(vulnerabilities.map(v => v.category));
    
    if (categories.has('sql-injection')) {
      recommendations.push('Implement parameterized queries and input validation for all database operations');
    }
    
    if (categories.has('xss')) {
      recommendations.push('Implement proper input sanitization and Content Security Policy');
    }
    
    if (categories.has('hardcoded-secrets')) {
      recommendations.push('Move all secrets to environment variables or secure secret management');
    }
    
    if (categories.has('weak-auth')) {
      recommendations.push('Implement strong authentication with proper password hashing');
    }
    
    // General recommendations
    recommendations.push('Implement automated security scanning in CI/CD pipeline');
    recommendations.push('Regular security training for development team');
    recommendations.push('Establish security code review process');
    
    return recommendations;
  }

  private checkCompliance(vulnerabilities: SecurityVulnerability[]): SecurityReport['compliance'] {
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');
    
    // Basic compliance checks
    const owasp = criticalVulns.length === 0 && highVulns.length <= 2;
    const gdpr = !vulnerabilities.some(v => v.category === 'data-exposure');
    const soc2 = criticalVulns.length === 0;
    const hipaa = criticalVulns.length === 0 && !vulnerabilities.some(v => v.category === 'data-exposure');
    
    return { owasp, gdpr, soc2, hipaa };
  }

  private generateSecuritySummary(vulnerabilities: SecurityVulnerability[], riskLevel: SecurityReport['riskLevel']): string {
    const totalVulns = vulnerabilities.length;
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    
    let summary = `Security audit completed. Overall risk level: ${riskLevel.toUpperCase()}. `;
    
    if (totalVulns === 0) {
      summary += 'No security vulnerabilities found. Excellent security posture!';
    } else {
      summary += `Found ${totalVulns} security issues (${criticalCount} critical, ${highCount} high priority). `;
      
      if (riskLevel === 'critical') {
        summary += 'Immediate action required to address critical security risks.';
      } else if (riskLevel === 'high') {
        summary += 'High-priority security issues need immediate attention.';
      } else if (riskLevel === 'medium') {
        summary += 'Security issues should be addressed in the next development cycle.';
      } else {
        summary += 'Minor security issues found, address during regular maintenance.';
      }
    }
    
    return summary;
  }

  async cleanup(): Promise<void> {
    console.log('🔒 Security Review Agent cleanup completed');
  }
}
