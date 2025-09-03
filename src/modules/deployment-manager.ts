import { AppRequirements, GeneratedApp } from '../types';

interface DeploymentConfig {
  platform: 'docker' | 'kubernetes' | 'vercel' | 'aws' | 'heroku';
  configuration: Record<string, any>;
  scripts: Record<string, string>;
  files: Record<string, string>;
}

interface DeploymentResult {
  success: boolean;
  platform: string;
  configs: Record<string, string>;
  instructions: string;
  estimatedDeployTime: number;
}

export class DeploymentManager {
  private deploymentTemplates: Map<string, any> = new Map();
  private platformHandlers: Map<string, (requirements: AppRequirements) => DeploymentConfig> = new Map();

  async initialize(): Promise<void> {
    this.initializeDeploymentTemplates();
    this.initializePlatformHandlers();
  }

  private initializeDeploymentTemplates(): void {
    // Docker templates
    this.deploymentTemplates.set('docker-frontend', {
      dockerfile: `# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile --prod

COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
      
      nginxConfig: `events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    keepalive_timeout  65;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain application/javascript text/css application/json application/xml+rss text/xml;

    server {
        listen       80;
        server_name  localhost;
        root   /usr/share/nginx/html;
        index  index.html index.htm;

        # Serve static files
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
    }
}`
    });

    this.deploymentTemplates.set('docker-backend', {
      dockerfile: `# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodeuser -u 1001

# Copy package files
COPY package*.json ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

# Copy application code
COPY . .
RUN pnpm run build

# Change ownership to non-root user
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["pnpm", "start"]`
    });

    // Kubernetes templates
    this.deploymentTemplates.set('kubernetes-deployment', {
      deployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{appName}}
  labels:
    app: {{appName}}
spec:
  replicas: {{replicas}}
  selector:
    matchLabels:
      app: {{appName}}
  template:
    metadata:
      labels:
        app: {{appName}}
    spec:
      containers:
      - name: {{appName}}
        image: {{imageName}}:{{imageTag}}
        ports:
        - containerPort: {{containerPort}}
        env:
        {{#each envVars}}
        - name: {{name}}
          value: "{{value}}"
        {{/each}}
        resources:
          requests:
            memory: "{{memoryRequest}}"
            cpu: "{{cpuRequest}}"
          limits:
            memory: "{{memoryLimit}}"
            cpu: "{{cpuLimit}}"
        livenessProbe:
          httpGet:
            path: /health
            port: {{containerPort}}
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: {{containerPort}}
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: {{appName}}-service
spec:
  selector:
    app: {{appName}}
  ports:
    - protocol: TCP
      port: 80
      targetPort: {{containerPort}}
  type: LoadBalancer`,

      ingress: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{appName}}-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - {{domain}}
    secretName: {{appName}}-tls
  rules:
  - host: {{domain}}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {{appName}}-service
            port:
              number: 80`
    });

    // Vercel template
    this.deploymentTemplates.set('vercel-config', {
      config: `{
  "version": 2,
  "name": "{{appName}}",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    {{#each envVars}}
    "{{name}}": "@{{name.toLowerCase}}"{{#unless @last}},{{/unless}}
    {{/each}}
  },
  "build": {
    "env": {
      {{#each buildEnvVars}}
      "{{name}}": "{{value}}"{{#unless @last}},{{/unless}}
      {{/each}}
    }
  }
}`,
      
      readme: `# Vercel Deployment

## Environment Variables
{{#each envVars}}
- \`{{name}}\`: {{description}}
{{/each}}

## Deployment Commands
\`\`\`bash
# Install Vercel CLI
pnpm add -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
\`\`\`

## Custom Domain
1. Go to your Vercel project settings
2. Add your custom domain
3. Configure DNS records as instructed
`
    });

    // AWS templates
    this.deploymentTemplates.set('aws-config', {
      buildspec: `version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
  build:
    commands:
      - echo Build started on \`date\`
      - echo Building the Docker image...
      - docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .
      - docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
  post_build:
    commands:
      - echo Build completed on \`date\`
      - echo Pushing the Docker image...
      - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG`,

      taskDefinition: `{
  "family": "{{appName}}-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "{{cpu}}",
  "memory": "{{memory}}",
  "executionRoleArn": "{{executionRoleArn}}",
  "taskRoleArn": "{{taskRoleArn}}",
  "containerDefinitions": [
    {
      "name": "{{appName}}",
      "image": "{{imageUri}}",
      "portMappings": [
        {
          "containerPort": {{containerPort}},
          "protocol": "tcp"
        }
      ],
      "environment": [
        {{#each envVars}}
        {
          "name": "{{name}}",
          "value": "{{value}}"
        }{{#unless @last}},{{/unless}}
        {{/each}}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/{{appName}}",
          "awslogs-region": "{{region}}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:{{containerPort}}/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}`
    });
  }

  private initializePlatformHandlers(): void {
    this.platformHandlers.set('docker', this.generateDockerConfig.bind(this));
    this.platformHandlers.set('kubernetes', this.generateKubernetesConfig.bind(this));
    this.platformHandlers.set('vercel', this.generateVercelConfig.bind(this));
    this.platformHandlers.set('aws', this.generateAWSConfig.bind(this));
  }

  async generateDeployment(app: GeneratedApp, requirements: AppRequirements): Promise<DeploymentResult> {
    const platform = requirements.techStack.deployment || 'docker';
    
    try {
      const handler = this.platformHandlers.get(platform);
      if (!handler) {
        throw new Error(`Unsupported deployment platform: ${platform}`);
      }

      const config = handler(requirements);
      const instructions = this.generateDeploymentInstructions(platform, config, requirements);
      const estimatedDeployTime = this.estimateDeploymentTime(platform, requirements);

      return {
        success: true,
        platform,
        configs: config.files,
        instructions,
        estimatedDeployTime
      };
    } catch (error) {
      return {
        success: false,
        platform,
        configs: {},
        instructions: '',
        estimatedDeployTime: 0
      };
    }
  }

  private generateDockerConfig(requirements: AppRequirements): DeploymentConfig {
    const files: Record<string, string> = {};
    const appName = this.getAppName(requirements);
    const hasBackend = !!requirements.techStack.backend;
    const hasFrontend = !!requirements.techStack.frontend;

    // Multi-service setup
    if (hasBackend && hasFrontend) {
      files['docker-compose.yml'] = this.generateDockerCompose(requirements);
      files['docker-compose.prod.yml'] = this.generateDockerComposeProd(requirements);
    }

    // Frontend Dockerfile
    if (hasFrontend) {
      files['frontend/Dockerfile'] = this.deploymentTemplates.get('docker-frontend').dockerfile;
      files['frontend/nginx.conf'] = this.deploymentTemplates.get('docker-frontend').nginxConfig;
      files['frontend/.dockerignore'] = this.generateDockerIgnore('frontend');
    }

    // Backend Dockerfile
    if (hasBackend) {
      files['backend/Dockerfile'] = this.deploymentTemplates.get('docker-backend').dockerfile;
      files['backend/.dockerignore'] = this.generateDockerIgnore('backend');
    }

    // Docker scripts
    const scripts = {
      'docker:build': hasBackend && hasFrontend ? 
        'docker-compose build' : 
        `docker build -t ${appName} .`,
      'docker:up': hasBackend && hasFrontend ? 
        'docker-compose up -d' : 
        `docker run -d -p 3000:3000 --name ${appName} ${appName}`,
      'docker:down': hasBackend && hasFrontend ? 
        'docker-compose down' : 
        `docker stop ${appName} && docker rm ${appName}`,
      'docker:logs': hasBackend && hasFrontend ? 
        'docker-compose logs -f' : 
        `docker logs -f ${appName}`,
      'docker:prod': 'docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d'
    };

    return {
      platform: 'docker',
      configuration: {
        hasMultiService: hasBackend && hasFrontend,
        appName,
        ports: this.getRequiredPorts(requirements)
      },
      scripts,
      files
    };
  }

  private generateKubernetesConfig(requirements: AppRequirements): DeploymentConfig {
    const files: Record<string, string> = {};
    const appName = this.getAppName(requirements);
    const hasBackend = !!requirements.techStack.backend;
    const hasFrontend = !!requirements.techStack.frontend;

    // Namespace
    files['k8s/namespace.yaml'] = `apiVersion: v1
kind: Namespace
metadata:
  name: ${appName}
---`;

    // ConfigMap for environment variables
    files['k8s/configmap.yaml'] = this.generateK8sConfigMap(requirements);

    // Secrets
    files['k8s/secrets.yaml'] = this.generateK8sSecrets(requirements);

    if (hasFrontend) {
      files['k8s/frontend-deployment.yaml'] = this.renderTemplate(
        this.deploymentTemplates.get('kubernetes-deployment').deployment,
        {
          appName: `${appName}-frontend`,
          replicas: 3,
          imageName: `${appName}-frontend`,
          imageTag: 'latest',
          containerPort: 80,
          envVars: this.getEnvironmentVars(requirements, 'frontend'),
          memoryRequest: '128Mi',
          cpuRequest: '100m',
          memoryLimit: '256Mi',
          cpuLimit: '200m'
        }
      );
    }

    if (hasBackend) {
      files['k8s/backend-deployment.yaml'] = this.renderTemplate(
        this.deploymentTemplates.get('kubernetes-deployment').deployment,
        {
          appName: `${appName}-backend`,
          replicas: 2,
          imageName: `${appName}-backend`,
          imageTag: 'latest',
          containerPort: 3000,
          envVars: this.getEnvironmentVars(requirements, 'backend'),
          memoryRequest: '256Mi',
          cpuRequest: '200m',
          memoryLimit: '512Mi',
          cpuLimit: '500m'
        }
      );
    }

    // Ingress
    files['k8s/ingress.yaml'] = this.renderTemplate(
      this.deploymentTemplates.get('kubernetes-deployment').ingress,
      {
        appName,
        domain: `${appName}.example.com`
      }
    );

    // HPA (Horizontal Pod Autoscaler)
    if (hasBackend) {
      files['k8s/hpa.yaml'] = `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${appName}-backend-hpa
  namespace: ${appName}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${appName}-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80`;
    }

    const scripts = {
      'k8s:apply': 'kubectl apply -f k8s/',
      'k8s:delete': 'kubectl delete -f k8s/',
      'k8s:status': `kubectl get all -n ${appName}`,
      'k8s:logs': `kubectl logs -f deployment/${appName}-backend -n ${appName}`,
      'k8s:scale': `kubectl scale deployment ${appName}-backend --replicas=3 -n ${appName}`
    };

    return {
      platform: 'kubernetes',
      configuration: {
        namespace: appName,
        hasMultiService: hasBackend && hasFrontend,
        monitoring: true,
        autoscaling: hasBackend
      },
      scripts,
      files
    };
  }

  private generateVercelConfig(requirements: AppRequirements): DeploymentConfig {
    const files: Record<string, string> = {};
    const appName = this.getAppName(requirements);

    files['vercel.json'] = this.renderTemplate(
      this.deploymentTemplates.get('vercel-config').config,
      {
        appName,
        envVars: this.getEnvironmentVars(requirements, 'frontend'),
        buildEnvVars: [
          { name: 'NODE_ENV', value: 'production' }
        ]
      }
    );

    files['DEPLOYMENT.md'] = this.deploymentTemplates.get('vercel-config').readme;

    const scripts = {
      'vercel:deploy': 'vercel --prod',
      'vercel:preview': 'vercel',
      'vercel:env': 'vercel env pull .env.local',
      'vercel:logs': 'vercel logs'
    };

    return {
      platform: 'vercel',
      configuration: {
        framework: requirements.techStack.frontend,
        buildCommand: 'pnpm run build',
        outputDirectory: 'dist',
        installCommand: 'pnpm install'
      },
      scripts,
      files
    };
  }

  private generateAWSConfig(requirements: AppRequirements): DeploymentConfig {
    const files: Record<string, string> = {};
    const appName = this.getAppName(requirements);
    const hasBackend = !!requirements.techStack.backend;

    if (hasBackend) {
      files['buildspec.yml'] = this.deploymentTemplates.get('aws-config').buildspec;
      
      files['task-definition.json'] = this.renderTemplate(
        this.deploymentTemplates.get('aws-config').taskDefinition,
        {
          appName,
          cpu: '512',
          memory: '1024',
          containerPort: 3000,
          envVars: this.getEnvironmentVars(requirements, 'backend'),
          region: 'us-east-1',
          executionRoleArn: 'arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole',
          taskRoleArn: 'arn:aws:iam::ACCOUNT:role/ecsTaskRole',
          imageUri: `ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/${appName}:latest`
        }
      );

      // CloudFormation template
      files['cloudformation.yaml'] = this.generateCloudFormationTemplate(requirements);
    }

    const scripts = {
      'aws:build': 'aws codebuild start-build --project-name $PROJECT_NAME',
      'aws:deploy': 'aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --task-definition $TASK_DEFINITION',
      'aws:logs': 'aws logs tail /ecs/$APP_NAME --follow',
      'aws:status': 'aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME'
    };

    return {
      platform: 'aws',
      configuration: {
        runtime: 'fargate',
        region: 'us-east-1',
        hasLoadBalancer: true,
        hasAutoScaling: true
      },
      scripts,
      files
    };
  }

  private generateDockerCompose(requirements: AppRequirements): string {
    const appName = this.getAppName(requirements);
    const hasDatabase = !!requirements.techStack.database;
    const services: string[] = [];

    // Frontend service
    if (requirements.techStack.frontend) {
      services.push(`  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:3001/api`);
    }

    // Backend service
    if (requirements.techStack.backend) {
      services.push(`  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      ${hasDatabase ? '- DATABASE_URL=postgresql://user:password@database:5432/app' : ''}
    ${hasDatabase ? 'depends_on:\n      - database' : ''}`);
    }

    // Database service
    if (hasDatabase) {
      const dbType = requirements.techStack.database;
      if (dbType === 'postgresql') {
        services.push(`  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"`);
      } else if (dbType === 'mongodb') {
        services.push(`  database:
    image: mongo:6-jammy
    environment:
      - MONGO_INITDB_ROOT_USERNAME=user
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=app
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"`);
      }
    }

    const volumes = hasDatabase ? 
      (requirements.techStack.database === 'postgresql' ? 
        '\nvolumes:\n  postgres_data:' : 
        '\nvolumes:\n  mongo_data:') : '';

    return `version: '3.8'

services:
${services.join('\n\n')}
${volumes}`;
  }

  private generateDockerComposeProd(requirements: AppRequirements): string {
    return `version: '3.8'

services:
  frontend:
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://api.${this.getAppName(requirements)}.com
  
  backend:
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M`;
  }

  private generateDockerIgnore(type: 'frontend' | 'backend'): string {
    const common = `node_modules
pnpm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.sass-cache
*.log`;

    if (type === 'frontend') {
      return `${common}
.env.local
.env.development.local
.env.test.local
.env.production.local`;
    } else {
      return `${common}
dist
.env.test`;
    }
  }

  private generateK8sConfigMap(requirements: AppRequirements): string {
    const appName = this.getAppName(requirements);
    const envVars = this.getEnvironmentVars(requirements, 'backend');
    
    const configData = envVars
      .filter(env => !env.name.includes('PASSWORD') && !env.name.includes('SECRET'))
      .map(env => `  ${env.name}: "${env.value}"`)
      .join('\n');

    return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${appName}-config
  namespace: ${appName}
data:
${configData}`;
  }

  private generateK8sSecrets(requirements: AppRequirements): string {
    const appName = this.getAppName(requirements);
    
    return `apiVersion: v1
kind: Secret
metadata:
  name: ${appName}-secrets
  namespace: ${appName}
type: Opaque
data:
  # Base64 encoded secrets
  jwt-secret: eW91ci1zdXBlci1zZWNyZXQta2V5LWhlcmU=
  database-password: cGFzc3dvcmQ=`;
  }

  private generateCloudFormationTemplate(requirements: AppRequirements): string {
    const appName = this.getAppName(requirements);
    
    return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Infrastructure for ${appName}'

Parameters:
  AppName:
    Type: String
    Default: ${appName}
  
  Environment:
    Type: String
    Default: production
    AllowedValues: [development, staging, production]

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-vpc

  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub \${AppName}-cluster
      CapacityProviders:
        - FARGATE
      DefaultCapacityProviderStrategy:
        - CapacityProvider: FARGATE
          Weight: 1

  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub \${AppName}-alb
      Scheme: internet-facing
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2

  ECSService:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: !Sub \${AppName}-service
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: 2
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          SecurityGroups:
            - !Ref ECSSecurityGroup
          Subnets:
            - !Ref PrivateSubnet1
            - !Ref PrivateSubnet2

Outputs:
  LoadBalancerDNS:
    Description: DNS name of the load balancer
    Value: !GetAtt LoadBalancer.DNSName`;
  }

  private generateDeploymentInstructions(
    platform: string, 
    config: DeploymentConfig, 
    requirements: AppRequirements
  ): string {
    const appName = this.getAppName(requirements);
    
    switch (platform) {
      case 'docker':
        return this.generateDockerInstructions(config, appName);
      case 'kubernetes':
        return this.generateK8sInstructions(config, appName);
      case 'vercel':
        return this.generateVercelInstructions(config, appName);
      case 'aws':
        return this.generateAWSInstructions(config, appName);
      default:
        return 'Deployment instructions not available for this platform.';
    }
  }

  private generateDockerInstructions(config: DeploymentConfig, appName: string): string {
    return `# Docker Deployment Instructions

## Prerequisites
- Docker and Docker Compose installed
- Application code in respective directories

## Development Deployment
\`\`\`bash
# Build and start services
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

## Production Deployment
\`\`\`bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Monitor health
docker-compose ps
\`\`\`

## Useful Commands
\`\`\`bash
# View running containers
docker ps

# Execute commands in containers
docker-compose exec backend bash
docker-compose exec frontend sh

# View container logs
docker logs <container-name>

# Clean up
docker system prune -a
\`\`\`

## Environment Variables
Create \`.env\` file in project root with required variables.

## Health Checks
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/health
- Database: Check logs for connection status`;
  }

  private generateK8sInstructions(config: DeploymentConfig, appName: string): string {
    return `# Kubernetes Deployment Instructions

## Prerequisites
- Kubernetes cluster access
- kubectl configured
- Container images built and pushed to registry

## Deployment Steps

### 1. Update Image References
Edit the deployment YAML files to reference your container registry:
\`\`\`bash
# Replace YOUR_REGISTRY with your container registry
sed -i 's/{{imageName}}/YOUR_REGISTRY\/${appName}/g' k8s/*-deployment.yaml
\`\`\`

### 2. Configure Secrets
\`\`\`bash
# Create secrets (update with your actual values)
kubectl create secret generic ${appName}-secrets \\
  --from-literal=jwt-secret=your-jwt-secret \\
  --from-literal=database-password=your-db-password \\
  -n ${appName}
\`\`\`

### 3. Deploy Application
\`\`\`bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get all -n ${appName}

# Watch pods come online
kubectl get pods -n ${appName} -w
\`\`\`

### 4. Access Application
\`\`\`bash
# Get external IP (if LoadBalancer)
kubectl get svc -n ${appName}

# Port forward for testing
kubectl port-forward svc/${appName}-frontend-service 8080:80 -n ${appName}
\`\`\`

## Monitoring
\`\`\`bash
# View logs
kubectl logs -f deployment/${appName}-backend -n ${appName}

# Describe resources
kubectl describe deployment ${appName}-backend -n ${appName}

# Check horizontal pod autoscaler
kubectl get hpa -n ${appName}
\`\`\`

## Scaling
\`\`\`bash
# Manual scaling
kubectl scale deployment ${appName}-backend --replicas=5 -n ${appName}

# Check autoscaler status
kubectl get hpa ${appName}-backend-hpa -n ${appName}
\`\`\`

## Cleanup
\`\`\`bash
# Delete all resources
kubectl delete namespace ${appName}
\`\`\``;
  }

  private generateVercelInstructions(config: DeploymentConfig, appName: string): string {
    return `# Vercel Deployment Instructions

## Prerequisites
- Vercel account
- Vercel CLI installed: \`pnpm add -g vercel\`

## Deployment Steps

### 1. Login to Vercel
\`\`\`bash
vercel login
\`\`\`

### 2. Configure Environment Variables
Set environment variables in Vercel dashboard or via CLI:
\`\`\`bash
# Set environment variables
vercel env add REACT_APP_API_URL
vercel env add VITE_API_URL
\`\`\`

### 3. Deploy
\`\`\`bash
# Preview deployment
vercel

# Production deployment
vercel --prod
\`\`\`

### 4. Custom Domain (Optional)
\`\`\`bash
# Add custom domain
vercel domains add your-domain.com
vercel alias set your-deployment-url.vercel.app your-domain.com
\`\`\`

## Configuration
The \`vercel.json\` file includes:
- Build configuration for ${config.configuration.framework}
- Routing rules for SPA
- Environment variable mapping

## Monitoring
- View deployments: https://vercel.com/dashboard
- Check logs: \`vercel logs\`
- Monitor performance: Vercel Analytics (if enabled)

## Tips
- Vercel automatically deploys on git push
- Use branch deployments for testing
- Enable preview deployments for pull requests`;
  }

  private generateAWSInstructions(config: DeploymentConfig, appName: string): string {
    return `# AWS ECS Deployment Instructions

## Prerequisites
- AWS CLI configured
- Docker installed
- ECR repository created

## Setup Steps

### 1. Create ECR Repository
\`\`\`bash
aws ecr create-repository --repository-name ${appName}
\`\`\`

### 2. Build and Push Docker Image
\`\`\`bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t ${appName} .

# Tag image
docker tag ${appName}:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/${appName}:latest

# Push image
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/${appName}:latest
\`\`\`

### 3. Deploy Infrastructure
\`\`\`bash
# Deploy CloudFormation stack
aws cloudformation create-stack \\
  --stack-name ${appName}-infrastructure \\
  --template-body file://cloudformation.yaml \\
  --capabilities CAPABILITY_IAM
\`\`\`

### 4. Register Task Definition
\`\`\`bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
\`\`\`

### 5. Create ECS Service
\`\`\`bash
aws ecs create-service \\
  --cluster ${appName}-cluster \\
  --service-name ${appName}-service \\
  --task-definition ${appName}-task \\
  --desired-count 2
\`\`\`

## CI/CD with CodeBuild
The \`buildspec.yml\` file configures automatic builds when integrated with AWS CodeBuild.

## Monitoring
\`\`\`bash
# Check service status
aws ecs describe-services --cluster ${appName}-cluster --services ${appName}-service

# View logs
aws logs tail /ecs/${appName} --follow
\`\`\`

## Scaling
\`\`\`bash
# Update service
aws ecs update-service \\
  --cluster ${appName}-cluster \\
  --service ${appName}-service \\
  --desired-count 4
\`\`\``;
  }

  private estimateDeploymentTime(platform: string, requirements: AppRequirements): number {
    const baseTime = {
      docker: 120,      // 2 minutes
      kubernetes: 300,  // 5 minutes
      vercel: 180,      // 3 minutes
      aws: 600         // 10 minutes
    };

    let time = baseTime[platform] || 180;

    // Add time based on complexity
    if (requirements.techStack.database) time += 60;
    if (requirements.techStack.frontend && requirements.techStack.backend) time += 60;
    if (requirements.features.length > 5) time += 30;

    return time; // seconds
  }

  private getAppName(requirements: AppRequirements): string {
    return requirements.description
      .split(' ')
      .slice(0, 3)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
  }

  private getRequiredPorts(requirements: AppRequirements): number[] {
    const ports = [];
    
    if (requirements.techStack.frontend) ports.push(3000, 80);
    if (requirements.techStack.backend) ports.push(3001, 8080);
    if (requirements.techStack.database === 'postgresql') ports.push(5432);
    if (requirements.techStack.database === 'mongodb') ports.push(27017);
    
    return ports;
  }

  private getEnvironmentVars(requirements: AppRequirements, type: 'frontend' | 'backend'): any[] {
    const vars = [];
    
    if (type === 'frontend') {
      vars.push({ name: 'NODE_ENV', value: 'production' });
      if (requirements.techStack.backend) {
        vars.push({ name: 'REACT_APP_API_URL', value: 'http://backend:3000/api' });
        vars.push({ name: 'VITE_API_URL', value: 'http://backend:3000/api' });
      }
    } else {
      vars.push({ name: 'NODE_ENV', value: 'production' });
      vars.push({ name: 'PORT', value: '3000' });
      
      if (requirements.techStack.database === 'postgresql') {
        vars.push({ name: 'DATABASE_URL', value: 'postgresql://user:password@database:5432/app' });
      } else if (requirements.techStack.database === 'mongodb') {
        vars.push({ name: 'MONGODB_URI', value: 'mongodb://database:27017/app' });
      }
      
      if (requirements.features.some(f => f.toLowerCase().includes('auth'))) {
        vars.push({ name: 'JWT_SECRET', value: 'your-jwt-secret' });
        vars.push({ name: 'JWT_EXPIRES_IN', value: '24h' });
      }
    }
    
    return vars;
  }

  private renderTemplate(template: string, context: any): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.');
      let value = context;
      
      for (const key of keys) {
        if (value && typeof value === 'object') {
          value = value[key];
        } else {
          return match;
        }
      }
      
      return String(value || '');
    });
  }
}