# Agent Communication API Design

## Overview
RESTful API with WebSocket support for real-time agent communication, built on event-driven architecture.

## Base Configuration
```yaml
# API Gateway Configuration
api:
  version: "v1"
  base_url: "/api/v1"
  rate_limit: 1000/minute
  timeout: 30s
  
websocket:
  endpoint: "/ws"
  heartbeat_interval: 30s
  max_connections: 10000
```

## Core API Endpoints

### 1. Agent Management

#### Register Agent
```http
POST /api/v1/agents/register
Content-Type: application/json

{
  "id": "agent-001",
  "type": "code_generation",
  "name": "Code Generator",
  "version": "1.0.0",
  "capabilities": ["javascript", "python", "react"],
  "health_check_url": "http://agent-001:8080/health",
  "configuration": {
    "max_concurrent_tasks": 5,
    "supported_frameworks": ["express", "fastapi", "react"]
  }
}
```

#### Agent Heartbeat
```http
POST /api/v1/agents/{agent_id}/heartbeat
Content-Type: application/json

{
  "status": "active",
  "current_tasks": 3,
  "performance_metrics": {
    "cpu_usage": 45.2,
    "memory_usage": 67.8,
    "task_queue_size": 12
  }
}
```

#### Get Available Agents
```http
GET /api/v1/agents?type=code_generation&status=active
```

### 2. Task Management

#### Create Task
```http
POST /api/v1/tasks
Content-Type: application/json

{
  "id": "task-001",
  "type": "code_generation",
  "priority": "high",
  "assigned_agent": "agent-001",
  "parent_workflow_id": "workflow-123",
  "input_data": {
    "template_id": "react-crud-template",
    "customizations": {
      "entities": ["User", "Product", "Order"],
      "authentication": "jwt",
      "database": "postgresql"
    }
  },
  "dependencies": ["task-002"],
  "timeout": 300,
  "retry_policy": {
    "max_attempts": 3,
    "backoff_strategy": "exponential"
  }
}
```

#### Update Task Status
```http
PATCH /api/v1/tasks/{task_id}
Content-Type: application/json

{
  "status": "in_progress",
  "progress": 45,
  "output_data": {
    "files_generated": 12,
    "current_operation": "generating_api_routes"
  },
  "estimated_completion": "2025-01-15T14:30:00Z"
}
```

### 3. Workflow Orchestration

#### Create Workflow
```http
POST /api/v1/workflows
Content-Type: application/json

{
  "id": "workflow-123",
  "project_id": "proj-456",
  "name": "Full Stack App Generation",
  "stages": [
    {
      "name": "requirement_analysis",
      "agent_type": "requirement_analysis",
      "dependencies": [],
      "timeout": 120
    },
    {
      "name": "architecture_planning",
      "agent_type": "architecture_planning", 
      "dependencies": ["requirement_analysis"],
      "timeout": 180
    },
    {
      "name": "code_generation",
      "agent_type": "code_generation",
      "dependencies": ["architecture_planning"],
      "timeout": 600
    }
  ],
  "configuration": {
    "parallel_execution": false,
    "failure_strategy": "stop_on_error"
  }
}
```

### 4. Real-time Communication (WebSocket)

#### WebSocket Event Types
```json
{
  "event_types": {
    "agent.registered": "Agent joined the system",
    "agent.status_changed": "Agent status updated",
    "task.created": "New task assigned",
    "task.progress": "Task progress update",
    "task.completed": "Task finished",
    "task.failed": "Task failed",
    "workflow.started": "Workflow execution began",
    "workflow.stage_completed": "Workflow stage finished",
    "system.alert": "System-wide notification"
  }
}
```

#### WebSocket Message Format
```json
{
  "id": "msg-001",
  "timestamp": "2025-01-15T12:00:00Z",
  "event_type": "task.progress",
  "source_agent": "agent-001",
  "target_agent": "orchestrator-001",
  "correlation_id": "workflow-123",
  "payload": {
    "task_id": "task-001",
    "progress": 75,
    "status": "in_progress",
    "details": {
      "current_operation": "generating_tests",
      "files_processed": 45,
      "estimated_remaining_time": 120
    }
  }
}
```

## Event-Driven Communication Protocol

### Message Flow Pattern
```
Agent A → Message Queue → Event Router → Agent B
    ↓                                        ↓
Event Store ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Response
```

### Request-Response Pattern
```json
{
  "request": {
    "id": "req-001",
    "type": "generate_code",
    "source": "orchestrator-001",
    "target": "code-gen-001",
    "correlation_id": "workflow-123",
    "data": {
      "template_id": "express-api",
      "parameters": {...}
    },
    "timeout": 300,
    "callback_url": "/api/v1/callbacks/req-001"
  },
  "response": {
    "id": "resp-001",
    "request_id": "req-001",
    "status": "success",
    "data": {
      "generated_files": [...],
      "execution_time": 45.2
    },
    "errors": []
  }
}
```

### Publish-Subscribe Pattern
```json
{
  "subscription": {
    "agent_id": "orchestrator-001",
    "topics": [
      "task.*.completed",
      "workflow.stage_completed",
      "system.alerts"
    ],
    "filters": {
      "priority": ["high", "critical"],
      "project_id": "proj-456"
    }
  },
  "publication": {
    "topic": "task.code_generation.completed",
    "data": {
      "task_id": "task-001",
      "result": "success",
      "artifacts": [...]
    }
  }
}
```

## API Security

### Authentication
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Agent Authentication
```json
{
  "agent_credentials": {
    "client_id": "agent-001",
    "client_secret": "secret-key",
    "certificate": "base64-encoded-cert"
  }
}
```

### Rate Limiting
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642579200
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "AGENT_UNAVAILABLE",
    "message": "The requested agent is currently unavailable",
    "details": {
      "agent_id": "code-gen-001",
      "last_seen": "2025-01-15T11:45:00Z",
      "retry_after": 60
    },
    "correlation_id": "workflow-123",
    "timestamp": "2025-01-15T12:00:00Z"
  }
}
```

### Error Codes
```json
{
  "error_codes": {
    "AGENT_UNAVAILABLE": 503,
    "TASK_TIMEOUT": 408,
    "INVALID_TEMPLATE": 400,
    "WORKFLOW_FAILED": 500,
    "AUTHENTICATION_FAILED": 401,
    "RATE_LIMIT_EXCEEDED": 429,
    "DEPENDENCY_NOT_MET": 412
  }
}
```

## Performance Monitoring

### Metrics Collection
```http
GET /api/v1/metrics
{
  "system_metrics": {
    "active_agents": 15,
    "pending_tasks": 42,
    "completed_workflows": 1337,
    "average_response_time": 145.2,
    "error_rate": 0.02
  },
  "agent_metrics": {
    "code-gen-001": {
      "tasks_completed": 156,
      "average_execution_time": 89.4,
      "success_rate": 0.98
    }
  }
}
```

## Implementation Notes

### Technology Stack
- **API Gateway**: Kong or AWS API Gateway
- **Message Queue**: Apache Kafka for high throughput
- **WebSocket**: Socket.IO or native WebSocket
- **Authentication**: JWT with RSA256
- **Rate Limiting**: Redis-based sliding window
- **Monitoring**: Prometheus + Grafana

### Scalability Considerations
- Horizontal scaling of API gateway instances
- Message queue partitioning by agent type
- Connection pooling for database operations
- Caching of frequently accessed templates and configurations