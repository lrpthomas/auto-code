/**
 * Agent Communication Hub
 * Handles all inter-agent communication, task coordination, and workflow management
 */

const EventEmitter = require('events');
const Queue = require('bull');
const WebSocket = require('ws');

class AgentCommunicationHub extends EventEmitter {
    constructor() {
        super();
        this.agents = new Map();
        this.conversations = new Map();
        this.messageQueue = new Queue('agent-messages');
        this.taskQueue = new Queue('agent-tasks');
        this.workflowEngine = new WorkflowEngine();
        this.collaborationPatterns = new Map();
        this.learningSystem = new AgentLearningSystem();
        this.performanceMetrics = new Map();
    }

    /**
     * Register agent with communication hub
     */
    async registerAgent(agent) {
        this.agents.set(agent.id, {
            agent: agent,
            role: agent.role,
            capabilities: agent.capabilities,
            status: 'available',
            currentTasks: [],
            performanceHistory: [],
            collaborationScore: 100,
            expertise: agent.expertise
        });

        // Set up agent event listeners
        agent.on('task-completed', (result) => this.handleTaskCompletion(agent.id, result));
        agent.on('help-needed', (request) => this.handleHelpRequest(agent.id, request));
        agent.on('knowledge-shared', (knowledge) => this.handleKnowledgeSharing(agent.id, knowledge));

        console.log(`📡 Agent ${agent.name} registered with communication hub`);
    }

    /**
     * Facilitate communication between agents
     */
    async facilitateCommunication(fromAgentId, toAgentId, message) {
        const conversationId = this.getOrCreateConversation(fromAgentId, toAgentId);
        const conversation = this.conversations.get(conversationId);

        const messageObj = {
            id: `msg_${Date.now()}`,
            from: fromAgentId,
            to: toAgentId,
            content: message,
            timestamp: new Date(),
            conversationId: conversationId,
            type: message.type || 'standard'
        };

        // Log message
        conversation.messages.push(messageObj);

        // Route message based on type
        switch (message.type) {
            case 'task-request':
                return await this.handleTaskRequest(messageObj);
            case 'collaboration-invite':
                return await this.handleCollaborationInvite(messageObj);
            case 'knowledge-query':
                return await this.handleKnowledgeQuery(messageObj);
            case 'review-request':
                return await this.handleReviewRequest(messageObj);
            case 'status-update':
                return await this.handleStatusUpdate(messageObj);
            default:
                return await this.routeMessage(messageObj);
        }
    }

    /**
     * Intelligent task delegation
     */
    async delegateTask(task, requirements = {}) {
        console.log(`🎯 Delegating task: ${task.name}`);

        // Find best agent for the task
        const candidates = this.findSuitableAgents(task, requirements);
        const selectedAgent = this.selectBestAgent(candidates, task);

        if (!selectedAgent) {
            // Try collaborative approach
            return await this.createCollaborativeTask(task, requirements);
        }

        // Assign task to agent
        const agentInfo = this.agents.get(selectedAgent.id);
        agentInfo.currentTasks.push(task);
        agentInfo.status = 'working';

        // Execute task
        try {
            const result = await selectedAgent.executeTask(task);
            await this.handleTaskCompletion(selectedAgent.id, result);
            return result;
        } catch (error) {
            return await this.handleTaskFailure(selectedAgent.id, task, error);
        }
    }

    /**
     * Find agents suitable for a task
     */
    findSuitableAgents(task, requirements) {
        const candidates = [];

        for (const [agentId, agentInfo] of this.agents) {
            const suitabilityScore = this.calculateSuitability(agentInfo, task, requirements);
            
            if (suitabilityScore > 0.6) { // 60% threshold
                candidates.push({
                    agent: agentInfo.agent,
                    score: suitabilityScore,
                    availability: this.calculateAvailability(agentInfo),
                    expertise: agentInfo.expertise,
                    performance: this.getPerformanceScore(agentId)
                });
            }
        }

        return candidates.sort((a, b) => b.score - a.score);
    }

    /**
     * Calculate agent suitability for task
     */
    calculateSuitability(agentInfo, task, requirements) {
        let score = 0;

        // Check capabilities match
        const capabilityMatch = task.requiredCapabilities?.every(cap => 
            agentInfo.capabilities.includes(cap)
        ) || false;
        score += capabilityMatch ? 0.4 : 0;

        // Check expertise relevance
        const expertiseMatch = this.calculateExpertiseMatch(agentInfo.expertise, task);
        score += expertiseMatch * 0.3;

        // Check current workload
        const workloadScore = Math.max(0, 1 - (agentInfo.currentTasks.length / 5));
        score += workloadScore * 0.2;

        // Check historical performance
        const performanceScore = this.getPerformanceScore(agentInfo.agent.id) / 100;
        score += performanceScore * 0.1;

        return Math.min(1, score);
    }

    /**
     * Create collaborative task when no single agent is suitable
     */
    async createCollaborativeTask(task, requirements) {
        console.log(`🤝 Creating collaborative approach for: ${task.name}`);

        // Break down task into subtasks
        const subtasks = this.decomposeTask(task);
        const collaborationPlan = {
            mainTask: task,
            subtasks: subtasks,
            participants: [],
            coordinator: null,
            workflow: null
        };

        // Assign coordinator (usually PM agent)
        collaborationPlan.coordinator = this.agents.get(
            Array.from(this.agents.values())
                .find(a => a.role === 'project-manager')?.agent.id
        );

        // Assign subtasks to specialized agents
        for (const subtask of subtasks) {
            const suitableAgents = this.findSuitableAgents(subtask, requirements);
            if (suitableAgents.length > 0) {
                const assignedAgent = suitableAgents[0].agent;
                subtask.assignedTo = assignedAgent.id;
                collaborationPlan.participants.push(assignedAgent);
            }
        }

        // Create workflow
        collaborationPlan.workflow = this.workflowEngine.createWorkflow(collaborationPlan);

        // Execute collaborative task
        return await this.executeCollaborativeTask(collaborationPlan);
    }

    /**
     * Execute collaborative task with coordination
     */
    async executeCollaborativeTask(plan) {
        const results = new Map();
        const coordinator = plan.coordinator;

        console.log(`🎭 Executing collaborative task with ${plan.participants.length} agents`);

        // Phase-based execution
        const phases = this.groupSubtasksByPhase(plan.subtasks);
        
        for (const [phaseName, phaseTasks] of phases) {
            console.log(`  📍 Phase: ${phaseName}`);
            
            // Execute tasks in parallel within phase
            const phaseResults = await Promise.allSettled(
                phaseTasks.map(async (subtask) => {
                    const agent = this.agents.get(subtask.assignedTo).agent;
                    return await agent.executeTask(subtask);
                })
            );

            // Handle phase results
            phaseResults.forEach((result, index) => {
                const subtask = phaseTasks[index];
                if (result.status === 'fulfilled') {
                    results.set(subtask.id, result.value);
                } else {
                    console.error(`Subtask ${subtask.id} failed:`, result.reason);
                    // Attempt recovery or reassignment
                }
            });

            // Coordinate between phases
            if (coordinator) {
                await this.facilitateCommunication(
                    'system', 
                    coordinator.agent.id, 
                    {
                        type: 'phase-completed',
                        phase: phaseName,
                        results: Object.fromEntries(results)
                    }
                );
            }
        }

        // Merge all results
        return this.mergeCollaborationResults(results, plan);
    }

    /**
     * Handle inter-agent knowledge sharing
     */
    async handleKnowledgeSharing(agentId, knowledge) {
        const sharingEvent = {
            from: agentId,
            knowledge: knowledge,
            timestamp: new Date(),
            relevantAgents: this.findRelevantAgents(knowledge)
        };

        // Distribute knowledge to relevant agents
        for (const relevantAgentId of sharingEvent.relevantAgents) {
            if (relevantAgentId !== agentId) {
                await this.facilitateCommunication(agentId, relevantAgentId, {
                    type: 'knowledge-share',
                    content: knowledge
                });
            }
        }

        // Update global knowledge base
        this.learningSystem.addKnowledge(knowledge);
    }

    /**
     * Workflow patterns for common collaboration scenarios
     */
    defineCollaborationPatterns() {
        // Full-Stack Development Pattern
        this.collaborationPatterns.set('full-stack-development', {
            participants: ['architect', 'frontend-developer', 'backend-developer', 'database-specialist'],
            coordinator: 'project-manager',
            workflow: 'sequential-with-parallel',
            phases: [
                { name: 'architecture', parallel: false, required: ['architect'] },
                { name: 'development', parallel: true, required: ['frontend-developer', 'backend-developer', 'database-specialist'] },
                { name: 'integration', parallel: false, required: ['frontend-developer', 'backend-developer'] }
            ]
        });

        // API Development Pattern
        this.collaborationPatterns.set('api-development', {
            participants: ['architect', 'backend-developer', 'database-specialist', 'technical-writer'],
            coordinator: 'project-manager',
            workflow: 'pipeline',
            phases: [
                { name: 'design', parallel: false, required: ['architect'] },
                { name: 'implementation', parallel: true, required: ['backend-developer', 'database-specialist'] },
                { name: 'documentation', parallel: false, required: ['technical-writer'] }
            ]
        });

        // Quality Assurance Pattern
        this.collaborationPatterns.set('quality-assurance', {
            participants: ['qa-engineer', 'security-specialist', 'performance-specialist'],
            coordinator: 'qa-engineer',
            workflow: 'parallel-then-merge',
            phases: [
                { name: 'testing', parallel: true, required: ['qa-engineer', 'security-specialist', 'performance-specialist'] },
                { name: 'report', parallel: false, required: ['qa-engineer'] }
            ]
        });
    }

    /**
     * Real-time agent monitoring dashboard data
     */
    getAgentStatus() {
        const status = {
            agents: {},
            activeConversations: this.conversations.size,
            queuedTasks: this.taskQueue.waiting(),
            systemHealth: this.calculateSystemHealth()
        };

        for (const [agentId, agentInfo] of this.agents) {
            status.agents[agentId] = {
                role: agentInfo.role,
                status: agentInfo.status,
                currentTasks: agentInfo.currentTasks.length,
                performance: this.getPerformanceScore(agentId),
                collaborationScore: agentInfo.collaborationScore,
                lastActive: agentInfo.agent.lastActivity || 'Unknown'
            };
        }

        return status;
    }

    /**
     * Performance metrics and optimization
     */
    updatePerformanceMetrics(agentId, task, result) {
        if (!this.performanceMetrics.has(agentId)) {
            this.performanceMetrics.set(agentId, {
                tasksCompleted: 0,
                averageTime: 0,
                successRate: 1.0,
                qualityScore: 100,
                collaborationEffectiveness: 100
            });
        }

        const metrics = this.performanceMetrics.get(agentId);
        metrics.tasksCompleted++;
        
        if (result.success) {
            metrics.successRate = (metrics.successRate * 0.9) + 0.1;
        } else {
            metrics.successRate = metrics.successRate * 0.9;
        }

        // Update quality based on result feedback
        if (result.qualityRating) {
            metrics.qualityScore = (metrics.qualityScore * 0.8) + (result.qualityRating * 0.2);
        }

        this.performanceMetrics.set(agentId, metrics);
    }

    /**
     * Automatic conflict resolution
     */
    async resolveConflict(conflict) {
        const resolutionStrategies = {
            'resource-contention': this.resolveResourceContention.bind(this),
            'expertise-overlap': this.resolveExpertiseOverlap.bind(this),
            'timeline-conflict': this.resolveTimelineConflict.bind(this),
            'quality-dispute': this.resolveQualityDispute.bind(this)
        };

        const strategy = resolutionStrategies[conflict.type];
        if (strategy) {
            return await strategy(conflict);
        }

        // Default: escalate to PM agent
        return await this.escalateToProjectManager(conflict);
    }
}

/**
 * Workflow Engine for complex multi-agent processes
 */
class WorkflowEngine {
    constructor() {
        this.activeWorkflows = new Map();
        this.workflowTemplates = new Map();
        this.executionHistory = [];
    }

    createWorkflow(collaborationPlan) {
        const workflow = {
            id: `workflow_${Date.now()}`,
            type: this.detectWorkflowType(collaborationPlan),
            phases: this.createPhases(collaborationPlan),
            dependencies: this.analyzeDependencies(collaborationPlan),
            timeline: this.estimateTimeline(collaborationPlan),
            checkpoints: this.defineCheckpoints(collaborationPlan)
        };

        this.activeWorkflows.set(workflow.id, workflow);
        return workflow;
    }

    async executeWorkflow(workflow) {
        console.log(`⚡ Executing workflow: ${workflow.id}`);

        for (const phase of workflow.phases) {
            await this.executePhase(phase, workflow);
            await this.validatePhaseCompletion(phase);
        }

        return this.finalizeWorkflow(workflow);
    }
}

/**
 * Agent Learning System
 */
class AgentLearningSystem {
    constructor() {
        this.knowledgeBase = new Map();
        this.patterns = new Map();
        this.improvements = [];
        this.feedbackLoop = true;
    }

    addKnowledge(knowledge) {
        const category = this.categorizeKnowledge(knowledge);
        if (!this.knowledgeBase.has(category)) {
            this.knowledgeBase.set(category, []);
        }
        this.knowledgeBase.get(category).push({
            content: knowledge,
            timestamp: new Date(),
            useCount: 0,
            effectiveness: 0
        });
    }

    learnFromExecution(execution) {
        // Identify successful patterns
        const patterns = this.extractPatterns(execution);
        
        for (const pattern of patterns) {
            this.updatePattern(pattern, execution.success);
        }

        // Suggest improvements
        if (!execution.success) {
            const improvement = this.generateImprovement(execution);
            this.improvements.push(improvement);
        }
    }

    getRecommendations(context) {
        // Provide AI-powered recommendations based on learned patterns
        return this.generateRecommendations(context);
    }
}

module.exports = {
    AgentCommunicationHub,
    WorkflowEngine,
    AgentLearningSystem
};