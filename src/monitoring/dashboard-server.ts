import { createServer } from 'http';
import { parse } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { ProgressDashboard, DashboardServer } from './progress-dashboard';
import { Orchestrator } from '../orchestrator';

export class DashboardWebServer {
  private server: any;
  private wss: WebSocketServer;
  private dashboardServer: DashboardServer;
  private dashboard: ProgressDashboard;
  private orchestrator: Orchestrator;
  private port: number;

  constructor(orchestrator: Orchestrator, port: number = 3000) {
    this.orchestrator = orchestrator;
    this.port = port;
    this.dashboard = new ProgressDashboard();
    this.dashboardServer = new DashboardServer(this.dashboard);
    
    this.setupOrchestratorIntegration();
    this.createHttpServer();
    this.setupWebSocketServer();
  }

  private setupOrchestratorIntegration(): void {
    // Integrate dashboard with orchestrator events
    this.orchestrator.on('taskCreated', (task) => {
      this.dashboard.registerTask(task);
    });

    this.orchestrator.on('taskStarted', (task) => {
      this.dashboard.startTask(task.id);
    });

    this.orchestrator.on('taskProgress', (taskId, progress, message) => {
      this.dashboard.updateTaskProgress(taskId, progress, message);
    });

    this.orchestrator.on('taskCompleted', (task, result) => {
      this.dashboard.completeTask(task.id, result);
    });

    this.orchestrator.on('agentRegistered', (agent) => {
      this.dashboard.registerAgent(agent);
    });

    this.orchestrator.on('buildStarted', (phases) => {
      this.dashboard.startBuild(phases);
    });

    this.orchestrator.on('buildPhaseProgress', (phaseName, status, progress) => {
      this.dashboard.updateBuildPhase(phaseName, status, progress);
    });

    this.orchestrator.on('buildCompleted', (success) => {
      this.dashboard.completeBuild(success);
    });
  }

  private createHttpServer(): void {
    this.server = createServer((req, res) => {
      const { pathname } = parse(req.url || '', true);

      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        switch (pathname) {
          case '/':
          case '/dashboard':
            this.serveDashboardUI(req, res);
            break;
          
          case '/api/dashboard/data':
            this.serveDashboardData(req, res);
            break;
          
          case '/api/dashboard/export':
            this.serveDataExport(req, res);
            break;
          
          case '/api/dashboard/clear-completed':
            this.clearCompletedTasks(req, res);
            break;
          
          case '/api/dashboard/acknowledge-alert':
            this.acknowledgeAlert(req, res);
            break;
          
          case '/api/health':
            this.serveHealthCheck(req, res);
            break;
          
          default:
            this.serve404(req, res);
            break;
        }
      } catch (error) {
        console.error('HTTP server error:', error);
        this.serveError(req, res, error);
      }
    });
  }

  private setupWebSocketServer(): void {
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws/dashboard'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('Dashboard client connected:', req.socket.remoteAddress);

      // Add client to dashboard server
      this.dashboardServer.addClient(ws);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('Dashboard client disconnected');
        this.dashboardServer.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.dashboardServer.removeClient(ws);
      });
    });
  }

  private handleWebSocketMessage(ws: WebSocket, message: any): void {
    switch (message.action) {
      case 'clear_completed':
        this.dashboard.clearCompletedTasks();
        break;
      
      case 'acknowledge_alert':
        if (message.alertId) {
          this.dashboard.acknowledgeAlert(message.alertId);
        }
        break;
      
      case 'get_initial_data':
        const data = this.dashboard.getDashboardData();
        ws.send(JSON.stringify({ event: 'dashboard:init', data }));
        break;
      
      default:
        console.warn('Unknown WebSocket action:', message.action);
    }
  }

  private serveDashboardUI(req: any, res: any): void {
    const htmlPath = path.join(__dirname, 'dashboard-ui.html');
    
    fs.readFile(htmlPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading dashboard UI:', err);
        this.serve404(req, res);
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  }

  private serveDashboardData(req: any, res: any): void {
    const data = this.dashboard.getDashboardData();
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(data));
  }

  private serveDataExport(req: any, res: any): void {
    const { format = 'json' } = parse(req.url || '', true).query;
    const data = this.dashboard.exportData(format as 'json' | 'csv');
    
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `dashboard-export-${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  }

  private clearCompletedTasks(req: any, res: any): void {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    this.dashboard.clearCompletedTasks();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  }

  private acknowledgeAlert(req: any, res: any): void {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { alertId } = JSON.parse(body);
        if (alertId) {
          this.dashboard.acknowledgeAlert(alertId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Alert ID required' }));
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
  }

  private serveHealthCheck(req: any, res: any): void {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dashboard: {
        tasks: this.dashboard.getDashboardData().tasks.length,
        agents: this.dashboard.getDashboardData().agents.length,
        alerts: this.dashboard.getActiveAlerts().length
      },
      connections: {
        websockets: this.wss.clients.size
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
  }

  private serve404(req: any, res: any): void {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private serveError(req: any, res: any, error: any): void {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }));
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.port, () => {
          console.log(`✅ Dashboard server running at http://localhost:${this.port}`);
          console.log(`📊 Dashboard UI: http://localhost:${this.port}/dashboard`);
          console.log(`🔌 WebSocket: ws://localhost:${this.port}/ws/dashboard`);
          console.log(`🔍 Health check: http://localhost:${this.port}/api/health`);
          
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`Port ${this.port} is busy, trying ${this.port + 1}`);
            this.port++;
            this.server.listen(this.port);
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close WebSocket connections
      this.wss.clients.forEach((ws) => {
        ws.close();
      });

      // Close WebSocket server
      this.wss.close(() => {
        // Close HTTP server
        this.server.close(() => {
          console.log('Dashboard server stopped');
          resolve();
        });
      });
    });
  }

  // Public API for programmatic access
  getDashboard(): ProgressDashboard {
    return this.dashboard;
  }

  getPort(): number {
    return this.port;
  }

  getConnectionCount(): number {
    return this.wss.clients.size;
  }

  // Methods for external integration
  broadcastMessage(event: string, data: any): void {
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
      }
    });
  }

  addCustomAlert(level: 'info' | 'warning' | 'error' | 'critical', message: string, metadata?: any): void {
    this.dashboard.addAlert({
      level,
      message,
      ...metadata
    });
  }

  // Statistics and monitoring
  getStats(): {
    uptime: number;
    connections: number;
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    activeAgents: number;
    alerts: number;
  } {
    const data = this.dashboard.getDashboardData();
    
    return {
      uptime: process.uptime(),
      connections: this.wss.clients.size,
      totalTasks: data.metrics.totalTasks,
      activeTasks: data.tasks.filter(t => t.status === 'in_progress').length,
      completedTasks: data.metrics.completedTasks,
      failedTasks: data.metrics.failedTasks,
      activeAgents: data.metrics.activeAgents,
      alerts: data.alerts.filter(a => !a.acknowledged).length
    };
  }
}

// Utility function to create and start dashboard server
export async function startDashboardServer(orchestrator: Orchestrator, port: number = 3000): Promise<DashboardWebServer> {
  const dashboardServer = new DashboardWebServer(orchestrator, port);
  await dashboardServer.start();
  return dashboardServer;
}

// CLI utility for standalone dashboard server
export async function runStandaloneDashboard(port: number = 3000): Promise<void> {
  // Create a minimal orchestrator for demo purposes
  const { Orchestrator } = await import('../orchestrator');
  const orchestrator = new Orchestrator();
  
  // Initialize some demo agents
  const demoAgents = [
    { id: 'frontend-react', name: 'React Frontend Agent', type: 'frontend' },
    { id: 'backend-node', name: 'Node.js Backend Agent', type: 'backend' },
    { id: 'database-postgres', name: 'PostgreSQL Agent', type: 'database' }
  ];
  
  // Register demo agents
  for (const agentData of demoAgents) {
    const agent = {
      ...agentData,
      capabilities: ['demo'],
      initialize: async () => {},
      execute: async (task: any) => ({ success: true, data: 'Demo result' }),
      cleanup: async () => {}
    };
    
    // Simulate registering agent
    setTimeout(() => {
      orchestrator.emit('agentRegistered', agent);
    }, 1000);
  }
  
  // Start dashboard server
  const server = await startDashboardServer(orchestrator, port);
  
  // Generate some demo activity
  setTimeout(() => {
    const demoTask = {
      id: 'demo-task-1',
      type: 'generation',
      agentId: 'frontend-react',
      requirements: { demo: true },
      dependencies: [],
      status: 'pending' as const
    };
    
    orchestrator.emit('taskCreated', demoTask);
    
    setTimeout(() => {
      orchestrator.emit('taskStarted', demoTask);
      
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 20;
        orchestrator.emit('taskProgress', demoTask.id, progress, `Demo progress: ${progress}%`);
        
        if (progress >= 100) {
          clearInterval(progressInterval);
          orchestrator.emit('taskCompleted', demoTask, { success: true, data: 'Demo completed' });
        }
      }, 1000);
    }, 2000);
  }, 3000);
  
  // Keep the process alive
  process.on('SIGINT', async () => {
    console.log('\nShutting down dashboard server...');
    await server.stop();
    process.exit(0);
  });
  
  console.log('Dashboard server is running. Press Ctrl+C to stop.');
}

// If this file is run directly, start standalone dashboard
if (require.main === module) {
  const port = parseInt(process.argv[2]) || 3000;
  runStandaloneDashboard(port).catch(console.error);
}