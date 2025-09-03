# Code Review Agents

A comprehensive set of AI-powered agents designed to automatically review codebases for quality, security, performance, architecture, and documentation issues.

## 🎯 Overview

This system provides five specialized code review agents that work together to provide comprehensive code analysis:

1. **🔍 Code Quality Agent** - Reviews code style, best practices, and patterns
2. **🔒 Security Review Agent** - Focuses on security vulnerabilities and compliance
3. **⚡ Performance Review Agent** - Analyzes performance issues and optimization opportunities
4. **🏗️ Architecture Review Agent** - Reviews overall system design and architecture
5. **📝 Documentation Review Agent** - Ensures code is well-documented

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- TypeScript (for development)
- Access to the codebase you want to review

### Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

3. Build the TypeScript agents:
```bash
pnpm run build
```

### Basic Usage

```javascript
const { CodeReviewOrchestrator } = require('./agents/code-review-orchestrator');

async function reviewCodebase() {
  const orchestrator = new CodeReviewOrchestrator();
  await orchestrator.initialize();
  
  const task = {
    id: 'review-1',
    type: 'analysis',
    agentId: orchestrator.id,
    requirements: {
      // Your project requirements
    },
    output: {
      codebasePath: './your-project'
    }
  };
  
  const result = await orchestrator.execute(task);
  console.log('Review completed:', result.data);
  
  await orchestrator.cleanup();
}
```

### Run Demo

```bash
node code-review-demo.js
```

## 🔍 Agent Capabilities

### Code Quality Agent

**What it checks:**
- Code style violations
- Best practice adherence
- Unused variables and imports
- Magic numbers and hardcoded values
- File size and complexity

**Output:**
- Overall quality score (0-100)
- Detailed issue list with severity levels
- Specific recommendations for improvement
- Code metrics (cyclomatic complexity, maintainability index)

### Security Review Agent

**What it checks:**
- SQL injection vulnerabilities
- XSS (Cross-Site Scripting) risks
- Command injection patterns
- Path traversal vulnerabilities
- Hardcoded secrets
- Weak authentication patterns
- Dependency vulnerabilities

**Output:**
- Overall risk score (0-10)
- Risk level classification (low/medium/high/critical)
- CWE and OWASP references
- Compliance status (OWASP, GDPR, SOC2, HIPAA)
- Security recommendations

### Performance Review Agent

**What it checks:**
- Memory leak patterns
- Inefficient algorithms
- Large bundle indicators
- Network performance issues
- Database performance problems
- Anti-patterns (N+1 queries, unnecessary re-renders)

**Output:**
- Overall performance score (0-100)
- Performance metrics (bundle size, load time, memory usage)
- Optimization opportunities
- Specific performance recommendations

### Architecture Review Agent

**What it checks:**
- Design pattern usage
- Separation of concerns
- Coupling and cohesion
- Scalability considerations
- Maintainability factors
- Testability aspects

**Output:**
- Overall architecture score (0-100)
- Architectural strengths and weaknesses
- Design principle violations
- Refactoring recommendations

### Documentation Review Agent

**What it checks:**
- Missing documentation files
- Code documentation coverage
- README quality and completeness
- API documentation
- Inline comments for complex code
- Documentation consistency

**Output:**
- Overall documentation score (0-100)
- Documentation coverage metrics
- Missing documentation identification
- Quality improvement suggestions

## 📊 Understanding Results

### Score Interpretation

- **90-100**: Excellent - Minimal issues, best practices followed
- **80-89**: Good - Some minor issues, room for improvement
- **70-79**: Fair - Several issues, attention needed
- **60-69**: Poor - Many issues, significant improvement required
- **Below 60**: Critical - Major problems, immediate action needed

### Issue Severity Levels

- **Critical**: Must be fixed immediately, blocking deployment
- **High**: Should be fixed within 48 hours
- **Medium**: Fix within 1-2 weeks
- **Low**: Address during regular maintenance

### Report Structure

```javascript
{
  timestamp: Date,
  overallScore: number, // 0-100
  summary: string,
  reviews: {
    quality: QualityReport,
    security: SecurityReport,
    performance: PerformanceReport,
    architecture: ArchitectureReport,
    documentation: DocumentationReport
  },
  criticalIssues: number,
  highPriorityIssues: number,
  recommendations: string[],
  nextSteps: string[]
}
```

## 🛠️ Customization

### Adding Custom Rules

Each agent can be extended with custom rules:

```typescript
// Example: Adding custom quality rules
class CustomQualityAgent extends CodeQualityAgent {
  private async loadCustomRules() {
    // Add your custom patterns
    this.qualityRules.set('custom-rule', [
      /your-pattern/gi
    ]);
  }
}
```

### Configuration Options

Agents can be configured with different thresholds and patterns:

```typescript
const agent = new CodeQualityAgent({
  maxLineLength: 120,
  enableStrictMode: true,
  customRules: [...]
});
```

## 🔧 Integration

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Code Review
  run: |
    pnpm run build
    node code-review-demo.js
  continue-on-error: true
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "node code-review-demo.js"
    }
  }
}
```

### IDE Integration

The agents can be integrated with VS Code, IntelliJ, or other IDEs to provide real-time feedback.

## 📈 Best Practices

### Regular Reviews

- Run comprehensive reviews weekly
- Use agents in CI/CD for every pull request
- Schedule monthly deep-dive reviews

### Actionable Results

- Prioritize critical and high-priority issues
- Create tickets for each identified issue
- Track resolution progress

### Team Adoption

- Start with one agent type
- Gradually introduce more agents
- Provide training on interpreting results

## 🚨 Troubleshooting

### Common Issues

1. **Agent initialization fails**: Check Node.js version and dependencies
2. **No issues found**: Verify codebase path and file permissions
3. **Performance issues**: Large codebases may take time to analyze

### Debug Mode

Enable debug logging:

```javascript
process.env.DEBUG = 'code-review:*';
```

### Performance Optimization

For large codebases:
- Use file filtering
- Run agents in parallel
- Implement caching for repeated reviews

## 🤝 Contributing

### Adding New Agents

1. Create a new agent class implementing the `Agent` interface
2. Add it to the orchestrator
3. Update documentation and tests

### Improving Existing Agents

1. Enhance pattern detection
2. Add new rule types
3. Improve accuracy and performance

## 📚 Resources

- [Agent Interface Documentation](./src/types/index.ts)
- [Example Agent Implementation](./agents/testing-agent.ts)
- [Orchestrator Pattern](./agents/code-review-orchestrator.ts)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: These agents provide automated analysis but should not replace human code review. Always have human developers review critical code changes.
