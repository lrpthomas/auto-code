import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrchestratorAlpha } from '../../src/orchestrator';
import { AgentCommunicationBus, AgentCoordinator } from '../../src/integration/agent-communication';
import FrontendReactAgent from '../../agents/frontend-react-agent';
import BackendNodejsAgent from '../../agents/backend-nodejs-agent';
import { AppRequirements, Agent, AgentTask, AgentResult } from '../../src/types';

describe('Agent Integration Tests', () => {
  let orchestrator: OrchestratorAlpha;
  let communicationBus: AgentCommunicationBus;
  let coordinator: AgentCoordinator;
  let frontendAgent: Agent;
  let backendAgent: Agent;

  beforeEach(async () => {
    // Initialize components
    orchestrator = new OrchestratorAlpha({
      maxConcurrentTasks: 2,
      timeoutMinutes: 1,
      retryAttempts: 2,
      agents: {
        'frontend-react-agent': { maxInstances: 1, priority: 1 },
        'backend-nodejs-agent': { maxInstances: 1, priority: 2 }
      }
    });

    communicationBus = new AgentCommunicationBus();
    coordinator = new AgentCoordinator();
    
    frontendAgent = new FrontendReactAgent();
    backendAgent = new BackendNodejsAgent();

    // Initialize agents
    await frontendAgent.initialize();
    await backendAgent.initialize();
    
    // Register agents
    await communicationBus.registerAgent(frontendAgent);
    await communicationBus.registerAgent(backendAgent);
    await coordinator.registerAgent(frontendAgent);
    await coordinator.registerAgent(backendAgent);
  });

  afterEach(async () => {
    await orchestrator.shutdown();
    await frontendAgent.cleanup();
    await backendAgent.cleanup();
  });

  describe('Agent Communication', () => {
    it('should establish communication between agents', async () => {
      // Send message from frontend to backend
      const messageId = await communicationBus.sendMessage({
        from: frontendAgent.id,
        to: backendAgent.id,
        type: 'request',
        payload: { action: 'getApiEndpoints' },
        priority: 'medium'
      });

      expect(messageId).toBeTruthy();
      
      // Check metrics
      const frontendMetrics = communicationBus.getAgentMetrics(frontendAgent.id);
      expect(frontendMetrics?.messagesSent).toBe(1);
    });

    it('should handle request-response pattern', async () => {
      const mockResponse = { endpoints: ['/api/users', '/api/auth'] };
      
      // Setup response handler
      communicationBus.on(`message:${backendAgent.id}`, async (message) => {
        if (message.payload.action === 'getApiEndpoints') {
          await communicationBus.sendMessage({
            from: backendAgent.id,
            to: message.from,
            type: 'response',
            payload: { requestId: message.id, ...mockResponse },
            priority: 'medium'
          });
        }
      });

      // Make request
      const response = await communicationBus.requestResponse(
        frontendAgent.id,
        backendAgent.id,
        { action: 'getApiEndpoints' },
        5000
      );

      expect(response.endpoints).toEqual(['/api/users', '/api/auth']);
    });

    it('should handle broadcast messages', async () => {
      const receivedMessages: any[] = [];
      
      // Setup listeners
      communicationBus.on(`message:${backendAgent.id}`, (message) => {
        receivedMessages.push(message);
      });

      // Broadcast message
      await communicationBus.broadcastNotification(frontendAgent.id, {
        type: 'buildStarted',
        timestamp: new Date()
      });

      // Allow async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].payload.type).toBe('buildStarted');
    });
  });

  describe('Agent Coordination', () => {
    it('should coordinate collaborative tasks', async () => {
      const mockTaskData = {
        description: 'Build a simple web app',
        appType: 'web' as const,
        features: ['authentication', 'dashboard'],
        techStack: {
          frontend: 'react' as const,
          backend: 'nodejs' as const
        }
      };

      // Mock agent execution
      vi.spyOn(frontendAgent, 'execute').mockResolvedValue({
        success: true,
        data: { files: { 'src/App.tsx': 'React component code' } }
      });

      vi.spyOn(backendAgent, 'execute').mockResolvedValue({
        success: true,
        data: { files: { 'src/server.ts': 'Express server code' } }
      });

      const result = await coordinator.coordinateTask(
        'test-task-1',
        frontendAgent.id,
        [backendAgent.id],
        mockTaskData
      );

      expect(result.success).toBe(true);
      expect(result.data.files['src/App.tsx']).toBeTruthy();
      expect(result.metadata?.[`${backendAgent.id}_contribution`]).toBeTruthy();
    });

    it('should handle coordination failures gracefully', async () => {
      const mockTaskData = {
        description: 'Build a failing app',
        appType: 'web' as const,
        features: [],
        techStack: {}
      };

      // Mock failure
      vi.spyOn(frontendAgent, 'execute').mockRejectedValue(new Error('Frontend agent failed'));

      await expect(coordinator.coordinateTask(
        'test-task-2',
        frontendAgent.id,
        [backendAgent.id],
        mockTaskData
      )).rejects.toThrow('Frontend agent failed');
    });
  });

  describe('Full Integration Flow', () => {
    it('should build complete application with agent collaboration', async () => {
      const requirements: AppRequirements = {
        id: 'test-app-1',
        description: 'Build a React todo app with Node.js backend',
        appType: 'fullstack',
        features: ['User Authentication', 'Todo Management', 'Real-time Updates'],
        techStack: {
          frontend: 'react',
          backend: 'nodejs',
          database: 'postgresql',
          deployment: 'docker'
        },
        timeline: 300,
        priority: 'medium'
      };

      // Initialize orchestrator with test config
      await orchestrator.initialize();

      // Mock agent responses
      const mockFrontendFiles = {
        'src/App.tsx': 'React app component',
        'src/components/TodoList.tsx': 'Todo list component',
        'src/pages/Login.tsx': 'Login page',
        'package.json': 'Frontend dependencies'
      };

      const mockBackendFiles = {
        'src/server.ts': 'Express server',
        'src/routes/todos.ts': 'Todo routes',
        'src/routes/auth.ts': 'Auth routes',
        'package.json': 'Backend dependencies'
      };

      vi.spyOn(frontendAgent, 'execute').mockResolvedValue({
        success: true,
        data: {
          files: mockFrontendFiles,
          framework: 'react',
          buildTool: 'vite'
        }
      });

      vi.spyOn(backendAgent, 'execute').mockResolvedValue({
        success: true,
        data: {
          files: mockBackendFiles,
          framework: 'express',
          features: ['authentication', 'validation', 'database']
        }
      });

      // Build application
      const app = await orchestrator.buildApp(requirements.description);

      expect(app.id).toBeTruthy();
      expect(app.name).toBeTruthy();
      expect(app.metadata.techStack.frontend).toBe('react');
      expect(app.metadata.techStack.backend).toBe('nodejs');
      expect(app.metadata.buildStatus).toBe('success');
    });

    it('should handle complex multi-agent scenarios', async () => {
      // Test scenario with multiple agents contributing different capabilities
      const taskData = {
        description: 'E-commerce platform with microservices',
        complexity: 'high',
        services: ['user-service', 'product-service', 'order-service']
      };

      // Setup multiple mock agents
      const agents = [frontendAgent, backendAgent];
      const results = await Promise.allSettled(
        agents.map(agent => agent.execute({
          id: `task-${agent.id}`,
          type: 'generation' as const,
          agentId: agent.id,
          requirements: taskData,
          dependencies: [],
          status: 'pending' as const
        }))
      );

      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from agent failures', async () => {
      // Setup failing agent
      let attemptCount = 0;
      vi.spyOn(frontendAgent, 'execute').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return {
          success: true,
          data: { message: 'Success on retry' }
        };
      });

      const task: AgentTask = {
        id: 'retry-test',
        type: 'generation',
        agentId: frontendAgent.id,
        requirements: { test: true },
        dependencies: [],
        status: 'pending'
      };

      // This should eventually succeed after retries
      let result: AgentResult;
      for (let i = 0; i < 3; i++) {
        try {
          result = await frontendAgent.execute(task);
          break;
        } catch (error) {
          if (i === 2) throw error;
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      expect(result!.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should timeout gracefully', async () => {
      // Mock long-running task
      vi.spyOn(backendAgent, 'execute').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
        return { success: true, data: {} };
      });

      const task: AgentTask = {
        id: 'timeout-test',
        type: 'generation',
        agentId: backendAgent.id,
        requirements: {},
        dependencies: [],
        status: 'pending'
      };

      const startTime = Date.now();
      
      await expect(Promise.race([
        backendAgent.execute(task),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 1000)
        )
      ])).rejects.toThrow('Timeout');

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeLessThan(1500); // Should timeout within 1.5s
    });
  });

  describe('Performance Metrics', () => {
    it('should track communication metrics', async () => {
      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        await communicationBus.sendMessage({
          from: frontendAgent.id,
          to: backendAgent.id,
          type: 'notification',
          payload: { index: i },
          priority: 'low'
        });
      }

      const metrics = communicationBus.getAgentMetrics(frontendAgent.id);
      expect(metrics?.messagesSent).toBe(5);
      expect(metrics?.lastActivity).toBeInstanceOf(Date);
    });

    it('should provide system health status', async () => {
      await orchestrator.initialize();
      
      const status = await orchestrator.getStatus();
      expect(status.systemHealth).toBeDefined();
      expect(['healthy', 'degraded', 'critical']).toContain(status.systemHealth);
    });

    it('should track task execution times', async () => {
      const startTime = Date.now();
      
      vi.spyOn(frontendAgent, 'execute').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, data: {} };
      });

      const task: AgentTask = {
        id: 'perf-test',
        type: 'generation',
        agentId: frontendAgent.id,
        requirements: {},
        dependencies: [],
        status: 'pending'
      };

      await frontendAgent.execute(task);
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeGreaterThanOrEqual(100);
      expect(executionTime).toBeLessThan(500);
    });
  });
});