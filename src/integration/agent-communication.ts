import { EventEmitter } from 'events';
import { Agent, AgentTask, AgentResult } from '../types';

interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'broadcast' | 'notification';
  payload: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface CommunicationMetrics {
  messagesSent: number;
  messagesReceived: number;
  averageResponseTime: number;
  failedMessages: number;
  lastActivity: Date;
}

export class AgentCommunicationBus extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private messageQueue: Map<string, AgentMessage[]> = new Map();
  private metrics: Map<string, CommunicationMetrics> = new Map();
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize = 1000;

  async registerAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
    this.messageQueue.set(agent.id, []);
    this.metrics.set(agent.id, {
      messagesSent: 0,
      messagesReceived: 0,
      averageResponseTime: 0,
      failedMessages: 0,
      lastActivity: new Date()
    });

    this.emit('agentRegistered', { agentId: agent.id, agent });
  }

  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date()
    };

    // Add to history
    this.addToHistory(fullMessage);

    // Update sender metrics
    this.updateSenderMetrics(message.from);

    // Route message
    if (message.type === 'broadcast') {
      await this.broadcastMessage(fullMessage);
    } else {
      await this.routeMessage(fullMessage);
    }

    this.emit('messageSent', fullMessage);
    return fullMessage.id;
  }

  async requestResponse(
    from: string,
    to: string,
    payload: any,
    timeoutMs: number = 30000
  ): Promise<any> {
    const requestId = await this.sendMessage({
      from,
      to,
      type: 'request',
      payload,
      priority: 'medium'
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeAllListeners(`response:${requestId}`);
        reject(new Error(`Request timeout: ${requestId}`));
      }, timeoutMs);

      this.once(`response:${requestId}`, (response) => {
        clearTimeout(timeout);
        resolve(response.payload);
      });
    });
  }

  async broadcastNotification(from: string, payload: any): Promise<void> {
    await this.sendMessage({
      from,
      to: '*',
      type: 'broadcast',
      payload,
      priority: 'low'
    });
  }

  getAgentMetrics(agentId: string): CommunicationMetrics | undefined {
    return this.metrics.get(agentId);
  }

  getAllMetrics(): Map<string, CommunicationMetrics> {
    return new Map(this.metrics);
  }

  getMessageHistory(limit: number = 100): AgentMessage[] {
    return this.messageHistory.slice(-limit);
  }

  getQueuedMessages(agentId: string): AgentMessage[] {
    return this.messageQueue.get(agentId) || [];
  }

  async processQueuedMessages(agentId: string): Promise<void> {
    const messages = this.messageQueue.get(agentId) || [];
    this.messageQueue.set(agentId, []);

    for (const message of messages) {
      await this.deliverMessage(message);
    }
  }

  private async routeMessage(message: AgentMessage): Promise<void> {
    const targetAgent = this.agents.get(message.to);
    
    if (!targetAgent) {
      // Queue message if agent not available
      const queue = this.messageQueue.get(message.to) || [];
      queue.push(message);
      this.messageQueue.set(message.to, queue);
      return;
    }

    await this.deliverMessage(message);
  }

  private async broadcastMessage(message: AgentMessage): Promise<void> {
    const deliveryPromises = Array.from(this.agents.keys())
      .filter(agentId => agentId !== message.from)
      .map(agentId => this.deliverMessage({ ...message, to: agentId }));

    await Promise.allSettled(deliveryPromises);
  }

  private async deliverMessage(message: AgentMessage): Promise<void> {
    try {
      // Update receiver metrics
      this.updateReceiverMetrics(message.to);

      // Emit for listeners
      this.emit('messageReceived', message);
      this.emit(`message:${message.to}`, message);

      // Handle responses
      if (message.type === 'response') {
        this.emit(`response:${message.payload.requestId}`, message);
      }

    } catch (error) {
      this.updateFailedMetrics(message.to);
      this.emit('deliveryFailed', { message, error });
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message);
    
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  private updateSenderMetrics(agentId: string): void {
    const metrics = this.metrics.get(agentId);
    if (metrics) {
      metrics.messagesSent++;
      metrics.lastActivity = new Date();
    }
  }

  private updateReceiverMetrics(agentId: string): void {
    const metrics = this.metrics.get(agentId);
    if (metrics) {
      metrics.messagesReceived++;
      metrics.lastActivity = new Date();
    }
  }

  private updateFailedMetrics(agentId: string): void {
    const metrics = this.metrics.get(agentId);
    if (metrics) {
      metrics.failedMessages++;
      metrics.lastActivity = new Date();
    }
  }
}

// Advanced Agent Coordination
export class AgentCoordinator {
  private communicationBus: AgentCommunicationBus;
  private agents: Map<string, Agent> = new Map();
  private taskDependencies: Map<string, string[]> = new Map();
  private taskResults: Map<string, AgentResult> = new Map();

  constructor() {
    this.communicationBus = new AgentCommunicationBus();
    this.setupEventHandlers();
  }

  async registerAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
    await this.communicationBus.registerAgent(agent);
    
    // Setup agent message handler
    this.communicationBus.on(`message:${agent.id}`, this.handleAgentMessage.bind(this, agent.id));
  }

  async coordinateTask(
    taskId: string,
    primaryAgent: string,
    collaboratingAgents: string[],
    taskData: any
  ): Promise<AgentResult> {
    // Notify all agents about the collaborative task
    await this.communicationBus.broadcastNotification(primaryAgent, {
      type: 'taskStarted',
      taskId,
      primaryAgent,
      collaboratingAgents,
      taskData
    });

    // Execute primary task
    const primaryAgent_ = this.agents.get(primaryAgent);
    if (!primaryAgent_) {
      throw new Error(`Primary agent not found: ${primaryAgent}`);
    }

    const task: AgentTask = {
      id: taskId,
      type: 'generation',
      agentId: primaryAgent,
      requirements: taskData,
      dependencies: [],
      status: 'pending'
    };

    // Request collaboration from other agents
    const collaborationPromises = collaboratingAgents.map(agentId => 
      this.requestCollaboration(agentId, taskId, taskData)
    );

    // Execute primary task and collaborations in parallel
    const [primaryResult, ...collaborationResults] = await Promise.allSettled([
      primaryAgent_.execute(task),
      ...collaborationPromises
    ]);

    // Combine results
    if (primaryResult.status === 'fulfilled') {
      const result = primaryResult.value;
      
      // Merge collaboration data
      collaborationResults.forEach((colabResult, index) => {
        if (colabResult.status === 'fulfilled' && colabResult.value.success) {
          const agentId = collaboratingAgents[index];
          result.metadata = result.metadata || {};
          result.metadata[`${agentId}_contribution`] = colabResult.value.data;
        }
      });

      this.taskResults.set(taskId, result);
      
      // Notify completion
      await this.communicationBus.broadcastNotification(primaryAgent, {
        type: 'taskCompleted',
        taskId,
        success: result.success
      });

      return result;
    } else {
      throw primaryResult.reason;
    }
  }

  private async requestCollaboration(
    agentId: string,
    taskId: string,
    taskData: any
  ): Promise<AgentResult> {
    try {
      const response = await this.communicationBus.requestResponse(
        'coordinator',
        agentId,
        {
          type: 'collaborationRequest',
          taskId,
          taskData
        },
        30000
      );

      return response;
    } catch (error) {
      return {
        success: false,
        error: `Collaboration failed with ${agentId}: ${error}`
      };
    }
  }

  private async handleAgentMessage(agentId: string, message: AgentMessage): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    switch (message.payload?.type) {
      case 'collaborationRequest':
        await this.handleCollaborationRequest(agentId, message);
        break;
      
      case 'statusUpdate':
        this.handleStatusUpdate(agentId, message);
        break;
      
      case 'errorReport':
        await this.handleErrorReport(agentId, message);
        break;
    }
  }

  private async handleCollaborationRequest(
    agentId: string,
    message: AgentMessage
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      const { taskId, taskData } = message.payload;
      
      // Create collaboration task
      const collabTask: AgentTask = {
        id: `${taskId}_collab_${agentId}`,
        type: 'analysis',
        agentId,
        requirements: taskData,
        dependencies: [],
        status: 'pending'
      };

      const result = await agent.execute(collabTask);
      
      // Send response
      await this.communicationBus.sendMessage({
        from: 'coordinator',
        to: message.from,
        type: 'response',
        payload: {
          requestId: message.id,
          ...result
        },
        priority: 'medium'
      });

    } catch (error) {
      // Send error response
      await this.communicationBus.sendMessage({
        from: 'coordinator',
        to: message.from,
        type: 'response',
        payload: {
          requestId: message.id,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        },
        priority: 'medium'
      });
    }
  }

  private handleStatusUpdate(agentId: string, message: AgentMessage): void {
    // Log status update
    console.log(`Agent ${agentId} status:`, message.payload);
  }

  private async handleErrorReport(agentId: string, message: AgentMessage): Promise<void> {
    // Handle error recovery
    console.error(`Agent ${agentId} reported error:`, message.payload);
    
    // Implement error recovery strategies
    await this.initiateErrorRecovery(agentId, message.payload);
  }

  private async initiateErrorRecovery(agentId: string, error: any): Promise<void> {
    // Implement recovery strategies based on error type
    switch (error.type) {
      case 'timeout':
        // Retry with longer timeout
        break;
      case 'resource_exhausted':
        // Scale resources or queue task
        break;
      case 'dependency_failed':
        // Restart dependencies
        break;
      default:
        // Generic recovery
        break;
    }
  }

  private setupEventHandlers(): void {
    this.communicationBus.on('messageSent', (message) => {
      console.log(`📤 Message sent: ${message.from} → ${message.to}`);
    });

    this.communicationBus.on('messageReceived', (message) => {
      console.log(`📥 Message received: ${message.from} → ${message.to}`);
    });

    this.communicationBus.on('deliveryFailed', ({ message, error }) => {
      console.error(`❌ Message delivery failed: ${message.id}`, error);
    });
  }

  getCommunicationMetrics(): Map<string, CommunicationMetrics> {
    return this.communicationBus.getAllMetrics();
  }

  getTaskResults(): Map<string, AgentResult> {
    return new Map(this.taskResults);
  }
}