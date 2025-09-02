"""
ARCHITECT-BRAVO Workflow Orchestration Engine
Production-ready workflow orchestration with error handling, recovery, and monitoring.
"""

import asyncio
import uuid
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import json
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    PENDING = "pending"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRYING = "retrying"


class AgentType(Enum):
    ORCHESTRATOR = "orchestrator"
    REQUIREMENT_ANALYSIS = "requirement_analysis"
    ARCHITECTURE_PLANNING = "architecture_planning"
    TEMPLATE_SELECTION = "template_selection"
    CODE_GENERATION = "code_generation"
    TESTING = "testing"
    DEPLOYMENT = "deployment"


@dataclass
class RetryPolicy:
    max_attempts: int = 3
    backoff_strategy: str = "exponential"  # linear, exponential, fixed
    base_delay: int = 1  # seconds
    max_delay: int = 300  # seconds
    jitter: bool = True


@dataclass
class Task:
    id: str
    name: str
    agent_type: AgentType
    input_data: Dict[str, Any]
    dependencies: List[str] = field(default_factory=list)
    timeout: int = 300  # seconds
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    status: TaskStatus = TaskStatus.PENDING
    output_data: Optional[Dict[str, Any]] = None
    error_details: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    attempt_count: int = 0
    estimated_duration: int = 60  # seconds


@dataclass
class WorkflowStage:
    name: str
    tasks: List[Task]
    parallel_execution: bool = False
    failure_strategy: str = "stop_on_error"  # continue_on_error, stop_on_error, retry_failed


@dataclass
class Workflow:
    id: str
    name: str
    project_id: str
    stages: List[WorkflowStage]
    status: WorkflowStatus = WorkflowStatus.PENDING
    current_stage: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_details: Optional[str] = None


class Agent:
    """Base agent interface for workflow execution"""
    
    def __init__(self, agent_id: str, agent_type: AgentType):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.status = "active"
        self.current_tasks = 0
        self.max_concurrent_tasks = 5
    
    async def execute_task(self, task: Task) -> Dict[str, Any]:
        """Execute a task and return results"""
        logger.info(f"Agent {self.agent_id} executing task {task.id}")
        
        # Simulate task execution
        await asyncio.sleep(0.1)  # Replace with actual agent logic
        
        return {
            "status": "success",
            "message": f"Task {task.id} completed successfully",
            "artifacts": []
        }
    
    async def health_check(self) -> bool:
        """Check if agent is healthy and available"""
        return self.status == "active" and self.current_tasks < self.max_concurrent_tasks


class EventBus:
    """Event bus for workflow communication"""
    
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, event_type: str, callback: Callable):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)
    
    async def publish(self, event_type: str, data: Dict[str, Any]):
        if event_type in self.subscribers:
            for callback in self.subscribers[event_type]:
                try:
                    await callback(data)
                except Exception as e:
                    logger.error(f"Error in event callback: {e}")


class WorkflowOrchestrator:
    """Main orchestrator for workflow execution"""
    
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.agents: Dict[AgentType, List[Agent]] = {}
        self.active_workflows: Dict[str, Workflow] = {}
        self.task_results: Dict[str, Dict[str, Any]] = {}
        
        # Setup event subscriptions
        self.event_bus.subscribe("task.completed", self._handle_task_completed)
        self.event_bus.subscribe("task.failed", self._handle_task_failed)
        self.event_bus.subscribe("agent.unavailable", self._handle_agent_unavailable)
    
    def register_agent(self, agent: Agent):
        """Register an agent with the orchestrator"""
        if agent.agent_type not in self.agents:
            self.agents[agent.agent_type] = []
        self.agents[agent.agent_type].append(agent)
        logger.info(f"Registered agent {agent.agent_id} of type {agent.agent_type}")
    
    async def execute_workflow(self, workflow: Workflow) -> bool:
        """Execute a complete workflow"""
        logger.info(f"Starting workflow execution: {workflow.id}")
        
        workflow.status = WorkflowStatus.RUNNING
        workflow.started_at = datetime.now()
        self.active_workflows[workflow.id] = workflow
        
        try:
            await self.event_bus.publish("workflow.started", {
                "workflow_id": workflow.id,
                "project_id": workflow.project_id,
                "timestamp": workflow.started_at.isoformat()
            })
            
            # Execute stages sequentially
            for stage_index, stage in enumerate(workflow.stages):
                workflow.current_stage = stage_index
                logger.info(f"Executing stage: {stage.name}")
                
                stage_success = await self._execute_stage(workflow, stage)
                
                if not stage_success and stage.failure_strategy == "stop_on_error":
                    workflow.status = WorkflowStatus.FAILED
                    workflow.error_details = f"Stage {stage.name} failed"
                    return False
                
                await self.event_bus.publish("workflow.stage_completed", {
                    "workflow_id": workflow.id,
                    "stage_name": stage.name,
                    "stage_index": stage_index,
                    "success": stage_success
                })
            
            workflow.status = WorkflowStatus.COMPLETED
            workflow.completed_at = datetime.now()
            
            await self.event_bus.publish("workflow.completed", {
                "workflow_id": workflow.id,
                "duration": (workflow.completed_at - workflow.started_at).total_seconds(),
                "timestamp": workflow.completed_at.isoformat()
            })
            
            logger.info(f"Workflow {workflow.id} completed successfully")
            return True
            
        except Exception as e:
            workflow.status = WorkflowStatus.FAILED
            workflow.error_details = str(e)
            logger.error(f"Workflow {workflow.id} failed: {e}")
            
            await self.event_bus.publish("workflow.failed", {
                "workflow_id": workflow.id,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            
            return False
    
    async def _execute_stage(self, workflow: Workflow, stage: WorkflowStage) -> bool:
        """Execute a workflow stage"""
        if stage.parallel_execution:
            return await self._execute_tasks_parallel(workflow, stage.tasks)
        else:
            return await self._execute_tasks_sequential(workflow, stage.tasks)
    
    async def _execute_tasks_sequential(self, workflow: Workflow, tasks: List[Task]) -> bool:
        """Execute tasks sequentially"""
        for task in tasks:
            if not await self._can_execute_task(task):
                continue
            
            success = await self._execute_task(workflow, task)
            if not success:
                return False
        return True
    
    async def _execute_tasks_parallel(self, workflow: Workflow, tasks: List[Task]) -> bool:
        """Execute tasks in parallel"""
        executable_tasks = [task for task in tasks if await self._can_execute_task(task)]
        
        if not executable_tasks:
            return True
        
        results = await asyncio.gather(
            *[self._execute_task(workflow, task) for task in executable_tasks],
            return_exceptions=True
        )
        
        return all(result is True for result in results if not isinstance(result, Exception))
    
    async def _execute_task(self, workflow: Workflow, task: Task) -> bool:
        """Execute a single task with retry logic"""
        task.attempt_count += 1
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now()
        
        logger.info(f"Executing task {task.id} (attempt {task.attempt_count})")
        
        try:
            # Find available agent
            agent = await self._get_available_agent(task.agent_type)
            if not agent:
                raise Exception(f"No available agent for type {task.agent_type}")
            
            # Execute task with timeout
            result = await asyncio.wait_for(
                agent.execute_task(task),
                timeout=task.timeout
            )
            
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            task.output_data = result
            
            # Store results for dependent tasks
            self.task_results[task.id] = result
            
            await self.event_bus.publish("task.completed", {
                "workflow_id": workflow.id,
                "task_id": task.id,
                "duration": (task.completed_at - task.started_at).total_seconds(),
                "result": result
            })
            
            logger.info(f"Task {task.id} completed successfully")
            return True
            
        except asyncio.TimeoutError:
            task.error_details = f"Task timed out after {task.timeout} seconds"
            return await self._handle_task_failure(workflow, task)
            
        except Exception as e:
            task.error_details = str(e)
            return await self._handle_task_failure(workflow, task)
    
    async def _handle_task_failure(self, workflow: Workflow, task: Task) -> bool:
        """Handle task failure with retry logic"""
        logger.warning(f"Task {task.id} failed: {task.error_details}")
        
        if task.attempt_count < task.retry_policy.max_attempts:
            task.status = TaskStatus.RETRYING
            
            # Calculate retry delay
            delay = self._calculate_retry_delay(task)
            logger.info(f"Retrying task {task.id} in {delay} seconds")
            
            await asyncio.sleep(delay)
            return await self._execute_task(workflow, task)
        else:
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now()
            
            await self.event_bus.publish("task.failed", {
                "workflow_id": workflow.id,
                "task_id": task.id,
                "error": task.error_details,
                "attempts": task.attempt_count
            })
            
            return False
    
    def _calculate_retry_delay(self, task: Task) -> float:
        """Calculate retry delay based on retry policy"""
        policy = task.retry_policy
        attempt = task.attempt_count
        
        if policy.backoff_strategy == "fixed":
            delay = policy.base_delay
        elif policy.backoff_strategy == "linear":
            delay = policy.base_delay * attempt
        elif policy.backoff_strategy == "exponential":
            delay = policy.base_delay * (2 ** (attempt - 1))
        else:
            delay = policy.base_delay
        
        # Apply max delay limit
        delay = min(delay, policy.max_delay)
        
        # Add jitter if enabled
        if policy.jitter:
            import random
            delay *= (0.5 + random.random() * 0.5)
        
        return delay
    
    async def _can_execute_task(self, task: Task) -> bool:
        """Check if task dependencies are satisfied"""
        for dependency_id in task.dependencies:
            if dependency_id not in self.task_results:
                logger.debug(f"Task {task.id} waiting for dependency {dependency_id}")
                return False
        return True
    
    async def _get_available_agent(self, agent_type: AgentType) -> Optional[Agent]:
        """Get an available agent of the specified type"""
        if agent_type not in self.agents:
            return None
        
        for agent in self.agents[agent_type]:
            if await agent.health_check():
                return agent
        
        return None
    
    async def _handle_task_completed(self, data: Dict[str, Any]):
        """Handle task completion event"""
        logger.debug(f"Task completed: {data['task_id']}")
    
    async def _handle_task_failed(self, data: Dict[str, Any]):
        """Handle task failure event"""
        logger.warning(f"Task failed: {data['task_id']} - {data['error']}")
    
    async def _handle_agent_unavailable(self, data: Dict[str, Any]):
        """Handle agent unavailable event"""
        logger.warning(f"Agent unavailable: {data['agent_id']}")
    
    async def pause_workflow(self, workflow_id: str):
        """Pause a running workflow"""
        if workflow_id in self.active_workflows:
            workflow = self.active_workflows[workflow_id]
            workflow.status = WorkflowStatus.PAUSED
            logger.info(f"Workflow {workflow_id} paused")
    
    async def resume_workflow(self, workflow_id: str):
        """Resume a paused workflow"""
        if workflow_id in self.active_workflows:
            workflow = self.active_workflows[workflow_id]
            if workflow.status == WorkflowStatus.PAUSED:
                workflow.status = WorkflowStatus.RUNNING
                logger.info(f"Workflow {workflow_id} resumed")
    
    async def cancel_workflow(self, workflow_id: str):
        """Cancel a running workflow"""
        if workflow_id in self.active_workflows:
            workflow = self.active_workflows[workflow_id]
            workflow.status = WorkflowStatus.CANCELLED
            workflow.completed_at = datetime.now()
            logger.info(f"Workflow {workflow_id} cancelled")
    
    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get current workflow status"""
        if workflow_id not in self.active_workflows:
            return None
        
        workflow = self.active_workflows[workflow_id]
        total_tasks = sum(len(stage.tasks) for stage in workflow.stages)
        completed_tasks = 0
        
        for stage in workflow.stages:
            for task in stage.tasks:
                if task.status == TaskStatus.COMPLETED:
                    completed_tasks += 1
        
        progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            "workflow_id": workflow.id,
            "status": workflow.status.value,
            "progress": round(progress, 2),
            "current_stage": workflow.current_stage,
            "total_stages": len(workflow.stages),
            "started_at": workflow.started_at.isoformat() if workflow.started_at else None,
            "completed_at": workflow.completed_at.isoformat() if workflow.completed_at else None,
            "error_details": workflow.error_details
        }


# Workflow Factory for common app generation patterns
class WorkflowFactory:
    """Factory for creating common workflow patterns"""
    
    @staticmethod
    def create_fullstack_app_workflow(
        project_id: str,
        requirements: Dict[str, Any],
        app_type: str = "crud"
    ) -> Workflow:
        """Create a full-stack application generation workflow"""
        
        workflow_id = str(uuid.uuid4())
        
        # Stage 1: Analysis and Planning
        analysis_stage = WorkflowStage(
            name="analysis_and_planning",
            tasks=[
                Task(
                    id=f"{workflow_id}-req-analysis",
                    name="Analyze Requirements",
                    agent_type=AgentType.REQUIREMENT_ANALYSIS,
                    input_data={"requirements": requirements},
                    timeout=180
                ),
                Task(
                    id=f"{workflow_id}-arch-planning",
                    name="Plan Architecture",
                    agent_type=AgentType.ARCHITECTURE_PLANNING,
                    input_data={"app_type": app_type},
                    dependencies=[f"{workflow_id}-req-analysis"],
                    timeout=300
                )
            ]
        )
        
        # Stage 2: Template Selection and Code Generation
        generation_stage = WorkflowStage(
            name="generation",
            tasks=[
                Task(
                    id=f"{workflow_id}-template-selection",
                    name="Select Template",
                    agent_type=AgentType.TEMPLATE_SELECTION,
                    input_data={"app_type": app_type},
                    dependencies=[f"{workflow_id}-arch-planning"],
                    timeout=120
                ),
                Task(
                    id=f"{workflow_id}-code-generation",
                    name="Generate Code",
                    agent_type=AgentType.CODE_GENERATION,
                    input_data={},
                    dependencies=[f"{workflow_id}-template-selection"],
                    timeout=600
                )
            ]
        )
        
        # Stage 3: Testing and Deployment
        deployment_stage = WorkflowStage(
            name="testing_and_deployment",
            tasks=[
                Task(
                    id=f"{workflow_id}-testing",
                    name="Run Tests",
                    agent_type=AgentType.TESTING,
                    input_data={},
                    dependencies=[f"{workflow_id}-code-generation"],
                    timeout=300
                ),
                Task(
                    id=f"{workflow_id}-deployment",
                    name="Deploy Application",
                    agent_type=AgentType.DEPLOYMENT,
                    input_data={},
                    dependencies=[f"{workflow_id}-testing"],
                    timeout=600
                )
            ]
        )
        
        return Workflow(
            id=workflow_id,
            name=f"Generate {app_type.title()} Application",
            project_id=project_id,
            stages=[analysis_stage, generation_stage, deployment_stage],
            metadata={"app_type": app_type, "requirements": requirements}
        )


# Example usage and testing
async def main():
    """Example usage of the workflow orchestration system"""
    
    # Create event bus and orchestrator
    event_bus = EventBus()
    orchestrator = WorkflowOrchestrator(event_bus)
    
    # Register mock agents
    agents = [
        Agent("req-analyzer-001", AgentType.REQUIREMENT_ANALYSIS),
        Agent("arch-planner-001", AgentType.ARCHITECTURE_PLANNING),
        Agent("template-selector-001", AgentType.TEMPLATE_SELECTION),
        Agent("code-generator-001", AgentType.CODE_GENERATION),
        Agent("tester-001", AgentType.TESTING),
        Agent("deployer-001", AgentType.DEPLOYMENT)
    ]
    
    for agent in agents:
        orchestrator.register_agent(agent)
    
    # Create and execute a workflow
    workflow = WorkflowFactory.create_fullstack_app_workflow(
        project_id="proj-001",
        requirements={
            "type": "e-commerce",
            "features": ["user_auth", "product_catalog", "shopping_cart"],
            "tech_stack": "react_node_postgres"
        },
        app_type="ecommerce"
    )
    
    # Execute workflow
    success = await orchestrator.execute_workflow(workflow)
    
    # Check status
    status = orchestrator.get_workflow_status(workflow.id)
    print(f"Workflow completed: {success}")
    print(f"Final status: {json.dumps(status, indent=2)}")


if __name__ == "__main__":
    asyncio.run(main())