import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AppRequirements } from '../types';

interface TemplateConfig {
  path: string;
  output: string;
  type: 'frontend' | 'backend' | 'database' | 'config' | 'test';
  dependencies?: string[];
}

interface GeneratedFile {
  path: string;
  content: string;
  type: 'code' | 'config' | 'test' | 'docs';
}

export class CodeGenerator {
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private templateConfigs: Map<string, TemplateConfig[]> = new Map();

  async initialize(): Promise<void> {
    await this.loadTemplates();
    this.registerHelpers();
  }

  private async loadTemplates(): Promise<void> {
    const templateDir = path.join(process.cwd(), 'templates');
    
    // Initialize template configurations
    this.initializeTemplateConfigs();
    
    // Load all template files
    for (const [techStack, configs] of this.templateConfigs) {
      for (const config of configs) {
        try {
          const templatePath = path.join(templateDir, config.path);
          const templateContent = await fs.readFile(templatePath, 'utf-8');
          const template = Handlebars.compile(templateContent);
          this.templates.set(`${techStack}:${config.path}`, template);
        } catch (error) {
          // Template file doesn't exist yet, will create default
          this.templates.set(`${techStack}:${config.path}`, this.createDefaultTemplate(config.type));
        }
      }
    }
  }

  private initializeTemplateConfigs(): void {
    // React Frontend Templates
    this.templateConfigs.set('react', [
      { path: 'react/app.tsx.hbs', output: 'src/App.tsx', type: 'frontend' },
      { path: 'react/index.tsx.hbs', output: 'src/index.tsx', type: 'frontend' },
      { path: 'react/component.tsx.hbs', output: 'src/components/{{componentName}}.tsx', type: 'frontend' },
      { path: 'react/package.json.hbs', output: 'package.json', type: 'config' },
      { path: 'react/tsconfig.json.hbs', output: 'tsconfig.json', type: 'config' },
      { path: 'react/vite.config.ts.hbs', output: 'vite.config.ts', type: 'config' }
    ]);

    // Vue Frontend Templates
    this.templateConfigs.set('vue', [
      { path: 'vue/app.vue.hbs', output: 'src/App.vue', type: 'frontend' },
      { path: 'vue/main.ts.hbs', output: 'src/main.ts', type: 'frontend' },
      { path: 'vue/component.vue.hbs', output: 'src/components/{{componentName}}.vue', type: 'frontend' },
      { path: 'vue/package.json.hbs', output: 'package.json', type: 'config' },
      { path: 'vue/vite.config.ts.hbs', output: 'vite.config.ts', type: 'config' }
    ]);

    // Node.js Backend Templates
    this.templateConfigs.set('nodejs', [
      { path: 'nodejs/server.ts.hbs', output: 'src/server.ts', type: 'backend' },
      { path: 'nodejs/app.ts.hbs', output: 'src/app.ts', type: 'backend' },
      { path: 'nodejs/controller.ts.hbs', output: 'src/controllers/{{controllerName}}.ts', type: 'backend' },
      { path: 'nodejs/service.ts.hbs', output: 'src/services/{{serviceName}}.ts', type: 'backend' },
      { path: 'nodejs/middleware.ts.hbs', output: 'src/middleware/{{middlewareName}}.ts', type: 'backend' },
      { path: 'nodejs/package.json.hbs', output: 'package.json', type: 'config' }
    ]);

    // Database Templates
    this.templateConfigs.set('postgresql', [
      { path: 'database/schema.sql.hbs', output: 'database/schema.sql', type: 'database' },
      { path: 'database/migrations.ts.hbs', output: 'src/migrations/{{timestamp}}_{{migrationName}}.ts', type: 'database' },
      { path: 'database/seeds.ts.hbs', output: 'src/seeds/{{seedName}}.ts', type: 'database' }
    ]);

    this.templateConfigs.set('mongodb', [
      { path: 'database/models.ts.hbs', output: 'src/models/{{modelName}}.ts', type: 'database' },
      { path: 'database/schemas.ts.hbs', output: 'src/schemas/{{schemaName}}.ts', type: 'database' }
    ]);
  }

  private registerHelpers(): void {
    // Register Handlebars helpers
    Handlebars.registerHelper('camelCase', (str: string) => {
      return str.charAt(0).toLowerCase() + str.slice(1).replace(/\s+(.)/g, (match, chr) => chr.toUpperCase());
    });

    Handlebars.registerHelper('pascalCase', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1).replace(/\s+(.)/g, (match, chr) => chr.toUpperCase());
    });

    Handlebars.registerHelper('kebabCase', (str: string) => {
      return str.toLowerCase().replace(/\s+/g, '-');
    });

    Handlebars.registerHelper('snakeCase', (str: string) => {
      return str.toLowerCase().replace(/\s+/g, '_');
    });

    Handlebars.registerHelper('upperCase', (str: string) => {
      return str.toUpperCase();
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);

    Handlebars.registerHelper('includes', (array: any[], item: any) => {
      return Array.isArray(array) && array.includes(item);
    });

    Handlebars.registerHelper('timestamp', () => {
      return Date.now().toString();
    });

    Handlebars.registerHelper('isoDate', () => {
      return new Date().toISOString();
    });
  }

  async generateApplication(requirements: AppRequirements): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const context = this.buildTemplateContext(requirements);

    // Generate frontend files
    if (requirements.techStack.frontend) {
      const frontendFiles = await this.generateFrontend(requirements.techStack.frontend, context);
      files.push(...frontendFiles);
    }

    // Generate backend files
    if (requirements.techStack.backend) {
      const backendFiles = await this.generateBackend(requirements.techStack.backend, context);
      files.push(...backendFiles);
    }

    // Generate database files
    if (requirements.techStack.database) {
      const databaseFiles = await this.generateDatabase(requirements.techStack.database, context);
      files.push(...databaseFiles);
    }

    // Generate configuration files
    const configFiles = await this.generateConfiguration(requirements, context);
    files.push(...configFiles);

    return files;
  }

  private buildTemplateContext(requirements: AppRequirements): any {
    const appName = requirements.description.split(' ').slice(0, 3).join('').replace(/[^a-zA-Z0-9]/g, '');
    
    return {
      app: {
        name: appName,
        displayName: requirements.description.split(' ').slice(0, 3).join(' '),
        description: requirements.description,
        id: requirements.id,
        type: requirements.appType
      },
      techStack: requirements.techStack,
      features: requirements.features,
      components: this.extractComponents(requirements.features),
      models: this.extractModels(requirements.features),
      routes: this.extractRoutes(requirements.features),
      services: this.extractServices(requirements.features),
      timestamp: Date.now(),
      isoDate: new Date().toISOString(),
      author: 'ORCHESTRATOR-ALPHA',
      version: '1.0.0'
    };
  }

  private extractComponents(features: string[]): any[] {
    const components = ['Header', 'Footer', 'Navigation'];
    
    features.forEach(feature => {
      if (feature.includes('Auth')) {
        components.push('LoginForm', 'SignupForm', 'UserProfile');
      }
      if (feature.includes('Dashboard')) {
        components.push('Dashboard', 'Sidebar', 'Widget');
      }
      if (feature.includes('Search')) {
        components.push('SearchBar', 'SearchResults');
      }
      if (feature.includes('Payment')) {
        components.push('PaymentForm', 'CheckoutButton');
      }
    });

    return components.map(name => ({
      name,
      fileName: name,
      path: `components/${name}`
    }));
  }

  private extractModels(features: string[]): any[] {
    const models = ['User'];
    
    features.forEach(feature => {
      if (feature.includes('Product')) models.push('Product');
      if (feature.includes('Order')) models.push('Order');
      if (feature.includes('Payment')) models.push('Payment');
      if (feature.includes('Comment')) models.push('Comment');
      if (feature.includes('Post')) models.push('Post');
    });

    return models.map(name => ({
      name,
      tableName: name.toLowerCase() + 's',
      fields: this.getModelFields(name)
    }));
  }

  private extractRoutes(features: string[]): any[] {
    const routes = [
      { path: '/', method: 'GET', handler: 'home' },
      { path: '/api/health', method: 'GET', handler: 'health' }
    ];
    
    features.forEach(feature => {
      if (feature.includes('Auth')) {
        routes.push(
          { path: '/auth/login', method: 'POST', handler: 'login' },
          { path: '/auth/register', method: 'POST', handler: 'register' },
          { path: '/auth/logout', method: 'POST', handler: 'logout' }
        );
      }
      if (feature.includes('API')) {
        routes.push(
          { path: '/api/users', method: 'GET', handler: 'getUsers' },
          { path: '/api/users', method: 'POST', handler: 'createUser' },
          { path: '/api/users/:id', method: 'GET', handler: 'getUser' },
          { path: '/api/users/:id', method: 'PUT', handler: 'updateUser' },
          { path: '/api/users/:id', method: 'DELETE', handler: 'deleteUser' }
        );
      }
    });

    return routes;
  }

  private extractServices(features: string[]): any[] {
    const services = ['DatabaseService', 'LoggingService'];
    
    features.forEach(feature => {
      if (feature.includes('Auth')) services.push('AuthService');
      if (feature.includes('Email')) services.push('EmailService');
      if (feature.includes('Payment')) services.push('PaymentService');
      if (feature.includes('Storage')) services.push('StorageService');
    });

    return services.map(name => ({
      name,
      fileName: name,
      methods: this.getServiceMethods(name)
    }));
  }

  private getModelFields(modelName: string): any[] {
    const commonFields = [
      { name: 'id', type: 'string', primary: true },
      { name: 'createdAt', type: 'Date' },
      { name: 'updatedAt', type: 'Date' }
    ];

    switch (modelName) {
      case 'User':
        return [
          ...commonFields,
          { name: 'email', type: 'string', unique: true },
          { name: 'username', type: 'string', unique: true },
          { name: 'passwordHash', type: 'string' },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' }
        ];
      case 'Product':
        return [
          ...commonFields,
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'price', type: 'number' },
          { name: 'category', type: 'string' }
        ];
      case 'Order':
        return [
          ...commonFields,
          { name: 'userId', type: 'string' },
          { name: 'total', type: 'number' },
          { name: 'status', type: 'string' }
        ];
      default:
        return commonFields;
    }
  }

  private getServiceMethods(serviceName: string): any[] {
    switch (serviceName) {
      case 'AuthService':
        return [
          { name: 'login', params: ['email', 'password'] },
          { name: 'register', params: ['userData'] },
          { name: 'verifyToken', params: ['token'] },
          { name: 'refreshToken', params: ['refreshToken'] }
        ];
      case 'EmailService':
        return [
          { name: 'sendEmail', params: ['to', 'subject', 'body'] },
          { name: 'sendTemplate', params: ['to', 'template', 'data'] }
        ];
      case 'PaymentService':
        return [
          { name: 'processPayment', params: ['amount', 'paymentMethod'] },
          { name: 'refund', params: ['transactionId', 'amount'] }
        ];
      default:
        return [
          { name: 'create', params: ['data'] },
          { name: 'findById', params: ['id'] },
          { name: 'update', params: ['id', 'data'] },
          { name: 'delete', params: ['id'] }
        ];
    }
  }

  private async generateFrontend(framework: string, context: any): Promise<GeneratedFile[]> {
    const configs = this.templateConfigs.get(framework) || [];
    const files: GeneratedFile[] = [];

    for (const config of configs.filter(c => c.type === 'frontend' || c.type === 'config')) {
      const templateKey = `${framework}:${config.path}`;
      const template = this.templates.get(templateKey);
      
      if (template) {
        const content = template(context);
        const outputPath = this.processOutputPath(config.output, context);
        
        files.push({
          path: outputPath,
          content,
          type: config.type === 'config' ? 'config' : 'code'
        });
      }
    }

    // Generate component files
    for (const component of context.components) {
      const componentTemplate = this.templates.get(`${framework}:${framework}/component.${framework === 'react' ? 'tsx' : 'vue'}.hbs`);
      if (componentTemplate) {
        const content = componentTemplate({ ...context, component });
        files.push({
          path: `src/components/${component.name}.${framework === 'react' ? 'tsx' : 'vue'}`,
          content,
          type: 'code'
        });
      }
    }

    return files;
  }

  private async generateBackend(framework: string, context: any): Promise<GeneratedFile[]> {
    const configs = this.templateConfigs.get(framework) || [];
    const files: GeneratedFile[] = [];

    for (const config of configs.filter(c => c.type === 'backend' || c.type === 'config')) {
      const templateKey = `${framework}:${config.path}`;
      const template = this.templates.get(templateKey);
      
      if (template) {
        const content = template(context);
        const outputPath = this.processOutputPath(config.output, context);
        
        files.push({
          path: outputPath,
          content,
          type: config.type === 'config' ? 'config' : 'code'
        });
      }
    }

    // Generate service files
    for (const service of context.services) {
      const serviceTemplate = this.templates.get(`${framework}:${framework}/service.ts.hbs`);
      if (serviceTemplate) {
        const content = serviceTemplate({ ...context, service });
        files.push({
          path: `src/services/${service.fileName}.ts`,
          content,
          type: 'code'
        });
      }
    }

    // Generate controller files
    for (const model of context.models) {
      const controllerTemplate = this.templates.get(`${framework}:${framework}/controller.ts.hbs`);
      if (controllerTemplate) {
        const content = controllerTemplate({ ...context, model });
        files.push({
          path: `src/controllers/${model.name}Controller.ts`,
          content,
          type: 'code'
        });
      }
    }

    return files;
  }

  private async generateDatabase(database: string, context: any): Promise<GeneratedFile[]> {
    const configs = this.templateConfigs.get(database) || [];
    const files: GeneratedFile[] = [];

    for (const config of configs) {
      const templateKey = `${database}:${config.path}`;
      const template = this.templates.get(templateKey);
      
      if (template) {
        const content = template(context);
        const outputPath = this.processOutputPath(config.output, context);
        
        files.push({
          path: outputPath,
          content,
          type: 'code'
        });
      }
    }

    return files;
  }

  private async generateConfiguration(requirements: AppRequirements, context: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Docker configuration
    files.push({
      path: 'Dockerfile',
      content: this.generateDockerfile(requirements),
      type: 'config'
    });

    // Docker Compose
    files.push({
      path: 'docker-compose.yml',
      content: this.generateDockerCompose(requirements),
      type: 'config'
    });

    // Environment configuration
    files.push({
      path: '.env.example',
      content: this.generateEnvExample(requirements),
      type: 'config'
    });

    // README
    files.push({
      path: 'README.md',
      content: this.generateReadme(requirements, context),
      type: 'docs'
    });

    return files;
  }

  private createDefaultTemplate(type: string): Handlebars.TemplateDelegate {
    const defaultTemplates = {
      frontend: '// Generated by ORCHESTRATOR-ALPHA\n// {{app.name}} Frontend Component\nexport default function Component() {\n  return <div>Generated Component</div>;\n}',
      backend: '// Generated by ORCHESTRATOR-ALPHA\n// {{app.name}} Backend Service\nexport class Service {\n  // Implementation here\n}',
      database: '-- Generated by ORCHESTRATOR-ALPHA\n-- {{app.name}} Database Schema\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  created_at TIMESTAMP DEFAULT NOW()\n);',
      config: '{\n  "name": "{{app.name}}",\n  "version": "{{version}}"\n}',
      test: '// Generated by ORCHESTRATOR-ALPHA\n// {{app.name}} Tests\ndescribe("{{app.name}}", () => {\n  it("should work", () => {\n    expect(true).toBe(true);\n  });\n});'
    };

    return Handlebars.compile(defaultTemplates[type] || '// Generated template');
  }

  private processOutputPath(outputPath: string, context: any): string {
    const template = Handlebars.compile(outputPath);
    return template(context);
  }

  private generateDockerfile(requirements: AppRequirements): string {
    const nodeVersion = '18-alpine';
    
    return `# Generated by ORCHESTRATOR-ALPHA
FROM node:${nodeVersion}

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

${requirements.techStack.frontend ? 'RUN npm run build\n' : ''}

EXPOSE ${requirements.techStack.backend ? '3000' : '80'}

CMD ["npm", "start"]
`;
  }

  private generateDockerCompose(requirements: AppRequirements): string {
    const services: string[] = [];

    if (requirements.techStack.backend) {
      services.push(`  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - database`);
    }

    if (requirements.techStack.database === 'postgresql') {
      services.push(`  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=app
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"`);
    }

    if (requirements.techStack.database === 'mongodb') {
      services.push(`  database:
    image: mongo:6-jammy
    environment:
      - MONGO_INITDB_ROOT_USERNAME=user
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"`);
    }

    return `# Generated by ORCHESTRATOR-ALPHA
version: '3.8'

services:
${services.join('\n\n')}

volumes:
  ${requirements.techStack.database === 'postgresql' ? 'postgres_data:' : 'mongo_data:'}
`;
  }

  private generateEnvExample(requirements: AppRequirements): string {
    const vars = [
      'NODE_ENV=development',
      'PORT=3000'
    ];

    if (requirements.techStack.database === 'postgresql') {
      vars.push(
        'DATABASE_URL=postgresql://user:password@localhost:5432/app',
        'DB_HOST=localhost',
        'DB_PORT=5432',
        'DB_USER=user',
        'DB_PASSWORD=password',
        'DB_NAME=app'
      );
    }

    if (requirements.techStack.database === 'mongodb') {
      vars.push('MONGODB_URI=mongodb://user:password@localhost:27017/app');
    }

    if (requirements.features.some(f => f.includes('Auth'))) {
      vars.push(
        'JWT_SECRET=your-secret-key',
        'JWT_EXPIRES_IN=24h'
      );
    }

    return `# Generated by ORCHESTRATOR-ALPHA
# Environment Configuration

${vars.join('\n')}
`;
  }

  private generateReadme(requirements: AppRequirements, context: any): string {
    return `# ${context.app.displayName}

Generated by ORCHESTRATOR-ALPHA

## Description
${requirements.description}

## Features
${requirements.features.map(f => `- ${f}`).join('\n')}

## Tech Stack
- Frontend: ${requirements.techStack.frontend || 'None'}
- Backend: ${requirements.techStack.backend || 'None'}
- Database: ${requirements.techStack.database || 'None'}
- Deployment: ${requirements.techStack.deployment || 'None'}

## Getting Started

### Prerequisites
- Node.js 18+
- ${requirements.techStack.database === 'postgresql' ? 'PostgreSQL' : requirements.techStack.database === 'mongodb' ? 'MongoDB' : 'Database'}

### Installation
\`\`\`bash
npm install
cp .env.example .env
# Configure your environment variables
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

### Production
\`\`\`bash
npm run build
npm start
\`\`\`

### Docker
\`\`\`bash
docker-compose up
\`\`\`

## Generated: ${new Date().toISOString()}
## Build ID: ${requirements.id}
`;
  }
}