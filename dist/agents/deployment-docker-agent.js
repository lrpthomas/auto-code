"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DockerDeploymentAgent {
    id = 'deployment-docker-agent';
    name = 'Docker Deployment Agent';
    description = 'Handles Docker containerization and deployment configurations';
    capabilities = ['docker-config', 'container-orchestration', 'deployment-automation'];
    version = '1.0.0';
    async initialize() {
        // Docker deployment agent initialized
    }
    async execute(task) {
        const requirements = task.requirements;
        // Generate Docker deployment configuration
        const deploymentConfig = {
            dockerfile: this.generateDockerfile(requirements),
            dockerCompose: this.generateDockerCompose(requirements),
            deploymentYaml: this.generateK8sDeployment(requirements),
            buildScript: this.generateBuildScript(requirements)
        };
        return {
            success: true,
            data: deploymentConfig,
            metadata: {
                agent: this.id,
                timestamp: new Date(),
                deploymentType: 'docker',
                platform: 'kubernetes-ready'
            }
        };
    }
    generateDockerfile(requirements) {
        const techStack = requirements.techStack;
        if (techStack.frontend && !techStack.backend) {
            // Frontend-only app
            return `# Multi-stage build for ${requirements.description}
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
        }
        // Full-stack app
        return `# Production Dockerfile for ${requirements.description}
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]`;
    }
    generateDockerCompose(requirements) {
        const appName = requirements.description.toLowerCase().replace(/\s+/g, '-');
        return `# Docker Compose for ${requirements.description}
version: '3.8'

services:
  app:
    build: .
    container_name: ${appName}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: ${appName}-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

networks:
  default:
    name: ${appName}-network`;
    }
    generateK8sDeployment(requirements) {
        const appName = requirements.description.toLowerCase().replace(/\s+/g, '-');
        return `# Kubernetes Deployment for ${requirements.description}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
  labels:
    app: ${appName}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
      - name: ${appName}
        image: ${appName}:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: ${appName}-service
spec:
  selector:
    app: ${appName}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer`;
    }
    generateBuildScript(requirements) {
        const appName = requirements.description.toLowerCase().replace(/\s+/g, '-');
        return `#!/bin/bash
# Build and deployment script for ${requirements.description}

set -e

echo "🚀 Starting build process for ${appName}..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t ${appName}:latest .

# Tag for registry
echo "🏷️  Tagging for registry..."
docker tag ${appName}:latest registry.example.com/${appName}:latest
docker tag ${appName}:latest registry.example.com/${appName}:\$(date +%Y%m%d-%H%M%S)

# Push to registry (uncomment when ready)
# echo "⬆️  Pushing to registry..."
# docker push registry.example.com/${appName}:latest
# docker push registry.example.com/${appName}:\$(date +%Y%m%d-%H%M%S)

# Deploy to Kubernetes (uncomment when ready)
# echo "🚢 Deploying to Kubernetes..."
# kubectl apply -f deployment.yaml

echo "✅ Build process completed successfully!"
echo "📋 Next steps:"
echo "   1. Configure your container registry"
echo "   2. Update image URLs in deployment.yaml"
echo "   3. Run: chmod +x build.sh && ./build.sh"
echo "   4. Deploy: kubectl apply -f deployment.yaml"`;
    }
    async cleanup() {
        // Cleanup deployment resources
    }
}
exports.default = DockerDeploymentAgent;
//# sourceMappingURL=deployment-docker-agent.js.map