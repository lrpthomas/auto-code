import { EventEmitter } from 'events';
import { Agent, AgentTask, AgentResult } from '../types';

export interface TaskProgress {
  taskId: string;
  agentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  progress: number; // 0-100
  estimatedDuration?: number; // in milliseconds
  actualDuration?: number; // in milliseconds
  logs: ProgressLog[];
  metadata?: Record<string, any>;
}

export interface ProgressLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

export interface AgentStatus {
  agentId: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  tasksCompleted: number;
  tasksInQueue: number;
  averageTaskDuration: number;
  lastActivity: Date;
  performance: AgentPerformance;
}

export interface AgentPerformance {
  successRate: number; // 0-100
  averageResponseTime: number; // in milliseconds
  totalTasks: number;
  failedTasks: number;
  uptime: number; // in milliseconds
}

export interface SystemMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageCompletionTime: number;
  systemUptime: number;
  activeAgents: number;
  queuedTasks: number;
  throughput: number; // tasks per minute
  errorRate: number; // percentage
}

export interface DashboardData {
  tasks: TaskProgress[];
  agents: AgentStatus[];
  metrics: SystemMetrics;
  alerts: Alert[];
  timeline: TimelineEvent[];
  buildProgress?: BuildProgress;
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  agentId?: string;
  taskId?: string;
  acknowledged: boolean;
}

export interface TimelineEvent {
  timestamp: Date;
  type: 'task_started' | 'task_completed' | 'task_failed' | 'agent_status_change' | 'system_event';
  title: string;
  description?: string;
  agentId?: string;
  taskId?: string;
}

export interface BuildProgress {
  phase: string;
  overallProgress: number;
  estimatedTimeRemaining: number;
  startTime: Date;
  phases: BuildPhase[];
}

export interface BuildPhase {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  tasks: string[];
}

export class ProgressDashboard extends EventEmitter {
  private tasks: Map<string, TaskProgress> = new Map();
  private agents: Map<string, AgentStatus> = new Map();
  private alerts: Alert[] = [];
  private timeline: TimelineEvent[] = [];
  private systemStartTime: Date = new Date();
  private buildProgress: BuildProgress | null = null;
  
  private readonly MAX_TIMELINE_EVENTS = 1000;
  private readonly MAX_ALERTS = 100;
  
  constructor() {
    super();
    this.startPeriodicUpdates();
  }

  // Task Management
  registerTask(task: AgentTask): void {
    const taskProgress: TaskProgress = {
      taskId: task.id,
      agentId: task.agentId,
      status: 'pending',
      progress: 0,
      logs: [],
      metadata: {
        type: task.type,
        requirements: task.requirements,
        dependencies: task.dependencies
      }
    };

    this.tasks.set(task.id, taskProgress);
    this.addTimelineEvent({
      timestamp: new Date(),
      type: 'task_started',
      title: `Task ${task.id} registered`,
      description: `Task assigned to agent ${task.agentId}`,
      agentId: task.agentId,
      taskId: task.id
    });

    this.emit('taskRegistered', taskProgress);
  }

  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'in_progress';
    task.startTime = new Date();
    task.progress = 0;

    this.addTaskLog(taskId, 'info', 'Task started');
    this.updateAgentStatus(task.agentId, 'busy', taskId);
    
    this.addTimelineEvent({
      timestamp: new Date(),
      type: 'task_started',
      title: `Task ${taskId} started`,
      agentId: task.agentId,
      taskId: taskId
    });

    this.emit('taskStarted', task);
  }

  updateTaskProgress(taskId: string, progress: number, message?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.progress = Math.max(0, Math.min(100, progress));
    
    if (message) {
      this.addTaskLog(taskId, 'info', message);
    }

    // Estimate completion time based on progress
    if (task.startTime && progress > 0) {
      const elapsed = Date.now() - task.startTime.getTime();
      const estimatedTotal = (elapsed / progress) * 100;
      task.estimatedDuration = estimatedTotal;
    }

    this.emit('taskProgressUpdated', task);
  }

  completeTask(taskId: string, result: AgentResult): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = result.success ? 'completed' : 'failed';
    task.endTime = new Date();
    task.progress = result.success ? 100 : task.progress;

    if (task.startTime) {
      task.actualDuration = task.endTime.getTime() - task.startTime.getTime();
    }

    const logLevel = result.success ? 'success' : 'error';
    const message = result.success ? 'Task completed successfully' : `Task failed: ${result.error}`;
    this.addTaskLog(taskId, logLevel, message, result);

    // Update agent status
    this.updateAgentTaskCompletion(task.agentId, result.success, task.actualDuration || 0);
    
    this.addTimelineEvent({
      timestamp: new Date(),
      type: result.success ? 'task_completed' : 'task_failed',
      title: `Task ${taskId} ${result.success ? 'completed' : 'failed'}`,
      agentId: task.agentId,
      taskId: taskId
    });

    if (!result.success) {
      this.addAlert({
        level: 'error',
        message: `Task ${taskId} failed: ${result.error}`,
        agentId: task.agentId,
        taskId: taskId
      });
    }

    this.emit('taskCompleted', task, result);
  }

  // Agent Management
  registerAgent(agent: Agent): void {
    const status: AgentStatus = {
      agentId: agent.id,
      status: 'idle',
      tasksCompleted: 0,
      tasksInQueue: 0,
      averageTaskDuration: 0,
      lastActivity: new Date(),
      performance: {
        successRate: 100,
        averageResponseTime: 0,
        totalTasks: 0,
        failedTasks: 0,
        uptime: 0
      }
    };

    this.agents.set(agent.id, status);
    this.addTimelineEvent({
      timestamp: new Date(),
      type: 'agent_status_change',
      title: `Agent ${agent.id} registered`,
      description: `${agent.name} (${agent.type}) is now available`,
      agentId: agent.id
    });

    this.emit('agentRegistered', status);
  }

  updateAgentStatus(agentId: string, status: AgentStatus['status'], currentTask?: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const previousStatus = agent.status;
    agent.status = status;
    agent.currentTask = currentTask;
    agent.lastActivity = new Date();

    if (previousStatus !== status) {
      this.addTimelineEvent({
        timestamp: new Date(),
        type: 'agent_status_change',
        title: `Agent ${agentId} status changed`,
        description: `Status changed from ${previousStatus} to ${status}`,
        agentId: agentId
      });
    }

    this.emit('agentStatusUpdated', agent);
  }

  private updateAgentTaskCompletion(agentId: string, success: boolean, duration: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.tasksCompleted++;
    agent.performance.totalTasks++;
    agent.status = 'idle';
    agent.currentTask = undefined;
    agent.lastActivity = new Date();

    if (!success) {
      agent.performance.failedTasks++;
    }

    // Update average task duration
    if (agent.averageTaskDuration === 0) {
      agent.averageTaskDuration = duration;
    } else {
      agent.averageTaskDuration = (agent.averageTaskDuration + duration) / 2;
    }

    // Update success rate
    agent.performance.successRate = 
      ((agent.performance.totalTasks - agent.performance.failedTasks) / agent.performance.totalTasks) * 100;

    // Update average response time
    agent.performance.averageResponseTime = agent.averageTaskDuration;
  }

  // Build Progress Management
  startBuild(phases: BuildPhase[]): void {
    this.buildProgress = {
      phase: phases[0]?.name || 'Starting',
      overallProgress: 0,
      estimatedTimeRemaining: 0,
      startTime: new Date(),
      phases: phases.map(phase => ({ ...phase, status: 'pending' }))
    };

    this.addTimelineEvent({
      timestamp: new Date(),
      type: 'system_event',
      title: 'Build started',
      description: `Starting build with ${phases.length} phases`
    });

    this.emit('buildStarted', this.buildProgress);
  }

  updateBuildPhase(phaseName: string, status: BuildPhase['status'], progress: number): void {
    if (!this.buildProgress) return;

    const phase = this.buildProgress.phases.find(p => p.name === phaseName);
    if (!phase) return;

    phase.status = status;
    phase.progress = progress;

    if (status === 'in_progress' && !phase.startTime) {
      phase.startTime = new Date();
      this.buildProgress.phase = phaseName;
    } else if ((status === 'completed' || status === 'failed') && !phase.endTime) {
      phase.endTime = new Date();
    }

    // Calculate overall progress
    const totalPhases = this.buildProgress.phases.length;
    const completedPhases = this.buildProgress.phases.filter(p => p.status === 'completed').length;
    const currentPhaseProgress = phase.progress / 100;
    
    this.buildProgress.overallProgress = 
      ((completedPhases + currentPhaseProgress) / totalPhases) * 100;

    // Estimate time remaining
    const elapsed = Date.now() - this.buildProgress.startTime.getTime();
    if (this.buildProgress.overallProgress > 0) {
      const estimatedTotal = (elapsed / this.buildProgress.overallProgress) * 100;
      this.buildProgress.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
    }

    this.emit('buildProgressUpdated', this.buildProgress);
  }

  completeBuild(success: boolean): void {
    if (!this.buildProgress) return;

    this.buildProgress.overallProgress = 100;
    this.buildProgress.estimatedTimeRemaining = 0;

    this.addTimelineEvent({
      timestamp: new Date(),
      type: 'system_event',
      title: success ? 'Build completed' : 'Build failed',
      description: success ? 'Build completed successfully' : 'Build failed with errors'
    });

    if (!success) {
      this.addAlert({
        level: 'error',
        message: 'Build process failed'
      });
    }

    this.emit('buildCompleted', this.buildProgress, success);
  }

  // Alert Management
  addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const newAlert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
      ...alert
    };

    this.alerts.unshift(newAlert);

    // Keep only the latest alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    this.emit('alertAdded', newAlert);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
    }
  }

  // Utility Methods
  private addTaskLog(taskId: string, level: ProgressLog['level'], message: string, data?: any): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const log: ProgressLog = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    task.logs.push(log);

    // Keep only the latest 100 logs per task
    if (task.logs.length > 100) {
      task.logs = task.logs.slice(-100);
    }
  }

  private addTimelineEvent(event: Omit<TimelineEvent, 'timestamp'> & { timestamp?: Date }): void {
    const timelineEvent: TimelineEvent = {
      timestamp: new Date(),
      ...event
    };

    this.timeline.unshift(timelineEvent);

    // Keep only the latest events
    if (this.timeline.length > this.MAX_TIMELINE_EVENTS) {
      this.timeline = this.timeline.slice(0, this.MAX_TIMELINE_EVENTS);
    }
  }

  private calculateSystemMetrics(): SystemMetrics {
    const allTasks = Array.from(this.tasks.values());
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const failedTasks = allTasks.filter(t => t.status === 'failed').length;
    
    const completedTasksWithDuration = allTasks.filter(t => 
      t.status === 'completed' && t.actualDuration
    );
    
    const averageCompletionTime = completedTasksWithDuration.length > 0
      ? completedTasksWithDuration.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasksWithDuration.length
      : 0;

    const systemUptime = Date.now() - this.systemStartTime.getTime();
    const activeAgents = Array.from(this.agents.values()).filter(a => a.status !== 'offline').length;
    const queuedTasks = allTasks.filter(t => t.status === 'pending').length;
    
    // Calculate throughput (tasks per minute)
    const uptimeMinutes = systemUptime / (1000 * 60);
    const throughput = uptimeMinutes > 0 ? completedTasks / uptimeMinutes : 0;
    
    const errorRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      averageCompletionTime,
      systemUptime,
      activeAgents,
      queuedTasks,
      throughput,
      errorRate
    };
  }

  private startPeriodicUpdates(): void {
    // Update agent uptime every minute
    setInterval(() => {
      for (const [agentId, agent] of this.agents) {
        if (agent.status !== 'offline') {
          agent.performance.uptime = Date.now() - this.systemStartTime.getTime();
        }
      }
    }, 60000); // 1 minute

    // Emit dashboard data every 5 seconds
    setInterval(() => {
      this.emit('dashboardUpdated', this.getDashboardData());
    }, 5000);
  }

  // Public API
  getDashboardData(): DashboardData {
    return {
      tasks: Array.from(this.tasks.values()),
      agents: Array.from(this.agents.values()),
      metrics: this.calculateSystemMetrics(),
      alerts: this.alerts.slice(0, 50), // Latest 50 alerts
      timeline: this.timeline.slice(0, 100), // Latest 100 events
      buildProgress: this.buildProgress || undefined
    };
  }

  getTaskProgress(taskId: string): TaskProgress | null {
    return this.tasks.get(taskId) || null;
  }

  getAgentStatus(agentId: string): AgentStatus | null {
    return this.agents.get(agentId) || null;
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  clearCompletedTasks(): void {
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        this.tasks.delete(taskId);
      }
    }
    this.emit('tasksCleared');
  }

  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = this.getDashboardData();
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV export for tasks
      const csvHeaders = 'Task ID,Agent ID,Status,Progress,Start Time,End Time,Duration\n';
      const csvRows = data.tasks.map(task => 
        `${task.taskId},${task.agentId},${task.status},${task.progress}%,${task.startTime?.toISOString() || ''},${task.endTime?.toISOString() || ''},${task.actualDuration || ''}`
      ).join('\n');
      
      return csvHeaders + csvRows;
    }
  }
}

// Real-time Dashboard WebSocket Server
export class DashboardServer extends EventEmitter {
  private dashboard: ProgressDashboard;
  private connectedClients: Set<any> = new Set();

  constructor(dashboard: ProgressDashboard) {
    super();
    this.dashboard = dashboard;
    this.setupDashboardListeners();
  }

  private setupDashboardListeners(): void {
    this.dashboard.on('dashboardUpdated', (data) => {
      this.broadcast('dashboard:update', data);
    });

    this.dashboard.on('taskStarted', (task) => {
      this.broadcast('task:started', task);
    });

    this.dashboard.on('taskCompleted', (task, result) => {
      this.broadcast('task:completed', { task, result });
    });

    this.dashboard.on('agentStatusUpdated', (agent) => {
      this.broadcast('agent:status', agent);
    });

    this.dashboard.on('alertAdded', (alert) => {
      this.broadcast('alert:new', alert);
    });

    this.dashboard.on('buildProgressUpdated', (progress) => {
      this.broadcast('build:progress', progress);
    });
  }

  addClient(client: any): void {
    this.connectedClients.add(client);
    
    // Send initial dashboard data
    this.sendToClient(client, 'dashboard:init', this.dashboard.getDashboardData());
  }

  removeClient(client: any): void {
    this.connectedClients.delete(client);
  }

  private broadcast(event: string, data: any): void {
    for (const client of this.connectedClients) {
      this.sendToClient(client, event, data);
    }
  }

  private sendToClient(client: any, event: string, data: any): void {
    try {
      if (client.send) {
        client.send(JSON.stringify({ event, data }));
      }
    } catch (error) {
      console.error('Error sending to client:', error);
      this.connectedClients.delete(client);
    }
  }
}