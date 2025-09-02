import { EventEmitter } from 'events';
import { Agent, AgentResult } from '../types';
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
export declare class AgentCommunicationBus extends EventEmitter {
    private agents;
    private messageQueue;
    private metrics;
    private messageHistory;
    private maxHistorySize;
    registerAgent(agent: Agent): Promise<void>;
    sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string>;
    requestResponse(from: string, to: string, payload: any, timeoutMs?: number): Promise<any>;
    broadcastNotification(from: string, payload: any): Promise<void>;
    getAgentMetrics(agentId: string): CommunicationMetrics | undefined;
    getAllMetrics(): Map<string, CommunicationMetrics>;
    getMessageHistory(limit?: number): AgentMessage[];
    getQueuedMessages(agentId: string): AgentMessage[];
    processQueuedMessages(agentId: string): Promise<void>;
    private routeMessage;
    private broadcastMessage;
    private deliverMessage;
    private generateMessageId;
    private addToHistory;
    private updateSenderMetrics;
    private updateReceiverMetrics;
    private updateFailedMetrics;
}
export declare class AgentCoordinator {
    private communicationBus;
    private agents;
    private taskDependencies;
    private taskResults;
    constructor();
    registerAgent(agent: Agent): Promise<void>;
    coordinateTask(taskId: string, primaryAgent: string, collaboratingAgents: string[], taskData: any): Promise<AgentResult>;
    private requestCollaboration;
    private handleAgentMessage;
    private handleCollaborationRequest;
    private handleStatusUpdate;
    private handleErrorReport;
    private initiateErrorRecovery;
    private setupEventHandlers;
    getCommunicationMetrics(): Map<string, CommunicationMetrics>;
    getTaskResults(): Map<string, AgentResult>;
}
export {};
//# sourceMappingURL=agent-communication.d.ts.map