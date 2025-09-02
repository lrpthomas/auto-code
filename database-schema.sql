-- ARCHITECT-BRAVO Database Schema
-- Database: PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- TEMPLATE MANAGEMENT TABLES
-- ==========================================

-- Application templates
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('crud', 'realtime', 'ecommerce', 'api', 'dashboard')),
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    requirements JSONB NOT NULL DEFAULT '{}',
    architecture_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    UNIQUE(name, version)
);

-- Template components (files, directories, configurations)
CREATE TABLE template_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    component_type VARCHAR(100) NOT NULL CHECK (component_type IN ('file', 'directory', 'config', 'schema')),
    path VARCHAR(1000) NOT NULL,
    content TEXT,
    content_hash VARCHAR(64),
    is_template BOOLEAN DEFAULT false,
    template_variables JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Template dependencies and compatibility
CREATE TABLE template_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    dependency_type VARCHAR(100) NOT NULL CHECK (dependency_type IN ('framework', 'library', 'service', 'database')),
    name VARCHAR(255) NOT NULL,
    version_constraint VARCHAR(100),
    is_required BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}'
);

-- ==========================================
-- TECHNOLOGY STACK TABLES
-- ==========================================

-- Available technology stacks
CREATE TABLE technology_stacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL CHECK (category IN ('frontend', 'backend', 'database', 'cache', 'queue', 'deployment')),
    version VARCHAR(50),
    description TEXT,
    performance_score INTEGER CHECK (performance_score >= 1 AND performance_score <= 10),
    scalability_score INTEGER CHECK (scalability_score >= 1 AND scalability_score <= 10),
    development_speed_score INTEGER CHECK (development_speed_score >= 1 AND development_speed_score <= 10),
    ecosystem_score INTEGER CHECK (ecosystem_score >= 1 AND ecosystem_score <= 10),
    learning_curve_score INTEGER CHECK (learning_curve_score >= 1 AND learning_curve_score <= 10),
    community_support_score INTEGER CHECK (community_support_score >= 1 AND community_support_score <= 10),
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stack compatibility matrix
CREATE TABLE stack_compatibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stack_a_id UUID NOT NULL REFERENCES technology_stacks(id),
    stack_b_id UUID NOT NULL REFERENCES technology_stacks(id),
    compatibility_score INTEGER CHECK (compatibility_score >= 1 AND compatibility_score <= 10),
    notes TEXT,
    
    UNIQUE(stack_a_id, stack_b_id)
);

-- ==========================================
-- PROJECT AND WORKFLOW TABLES
-- ==========================================

-- Generated projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID REFERENCES templates(id),
    requirements JSONB NOT NULL DEFAULT '{}',
    architecture_config JSONB NOT NULL DEFAULT '{}',
    selected_stacks JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(100) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'analyzing', 'planning', 'generating', 'testing', 'deploying', 'completed', 'failed')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID
);

-- Workflow execution history
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage VARCHAR(100) NOT NULL CHECK (stage IN ('requirement_analysis', 'architecture_planning', 'template_selection', 'code_generation', 'testing', 'deployment')),
    agent_id VARCHAR(255) NOT NULL,
    status VARCHAR(100) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    input_data JSONB,
    output_data JSONB,
    error_details TEXT,
    logs TEXT
);

-- ==========================================
-- AGENT MANAGEMENT TABLES
-- ==========================================

-- Agent registry
CREATE TABLE agents (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL CHECK (type IN ('orchestrator', 'requirement_analysis', 'architecture_planning', 'template_selection', 'code_generation', 'testing', 'deployment')),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    capabilities JSONB NOT NULL DEFAULT '[]',
    configuration JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(100) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    health_check_url VARCHAR(500),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent communication events
CREATE TABLE agent_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correlation_id UUID,
    source_agent_id VARCHAR(255) REFERENCES agents(id),
    target_agent_id VARCHAR(255) REFERENCES agents(id),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(100) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- PERFORMANCE AND MONITORING TABLES
-- ==========================================

-- System metrics
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_type VARCHAR(100) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Template usage analytics
CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id),
    project_id UUID REFERENCES projects(id),
    usage_type VARCHAR(100) NOT NULL CHECK (usage_type IN ('selected', 'customized', 'generated')),
    success_rate NUMERIC,
    performance_metrics JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Templates
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_created_at ON templates(created_at);
CREATE INDEX idx_templates_metadata_gin ON templates USING GIN(metadata);

-- Template components
CREATE INDEX idx_template_components_template_id ON template_components(template_id);
CREATE INDEX idx_template_components_type ON template_components(component_type);
CREATE INDEX idx_template_components_path ON template_components(path);

-- Projects
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_template_id ON projects(template_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_requirements_gin ON projects USING GIN(requirements);

-- Workflow executions
CREATE INDEX idx_workflow_executions_project_id ON workflow_executions(project_id);
CREATE INDEX idx_workflow_executions_stage ON workflow_executions(stage);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at);

-- Agent events
CREATE INDEX idx_agent_events_correlation_id ON agent_events(correlation_id);
CREATE INDEX idx_agent_events_source_agent ON agent_events(source_agent_id);
CREATE INDEX idx_agent_events_target_agent ON agent_events(target_agent_id);
CREATE INDEX idx_agent_events_created_at ON agent_events(created_at);

-- System metrics
CREATE INDEX idx_system_metrics_name_timestamp ON system_metrics(metric_name, timestamp);
CREATE INDEX idx_system_metrics_tags_gin ON system_metrics USING GIN(tags);

-- Template usage
CREATE INDEX idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX idx_template_usage_timestamp ON template_usage(timestamp);

-- ==========================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ==========================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- INITIAL DATA SEEDING
-- ==========================================

-- Insert default technology stacks
INSERT INTO technology_stacks (name, category, version, performance_score, scalability_score, development_speed_score, ecosystem_score, learning_curve_score, community_support_score) VALUES
-- Frontend
('React', 'frontend', '18.x', 8, 9, 9, 10, 7, 10),
('Vue.js', 'frontend', '3.x', 8, 8, 9, 8, 8, 9),
('Angular', 'frontend', '16.x', 9, 9, 7, 9, 5, 9),
('Svelte', 'frontend', '4.x', 9, 7, 9, 7, 8, 7),

-- Backend
('Node.js/Express', 'backend', '18.x', 7, 8, 9, 9, 8, 10),
('Python/Django', 'backend', '4.x', 7, 8, 8, 9, 7, 9),
('Python/FastAPI', 'backend', '0.100.x', 9, 9, 9, 8, 8, 8),
('Java/Spring Boot', 'backend', '3.x', 9, 10, 6, 10, 6, 10),
('.NET Core', 'backend', '7.x', 9, 9, 7, 9, 7, 9),

-- Database
('PostgreSQL', 'database', '15.x', 9, 10, 8, 9, 7, 10),
('MongoDB', 'database', '6.x', 8, 9, 9, 8, 8, 9),
('MySQL', 'database', '8.x', 8, 9, 8, 9, 8, 10),
('Redis', 'cache', '7.x', 10, 9, 9, 8, 9, 9),

-- Queue
('Apache Kafka', 'queue', '3.x', 9, 10, 6, 8, 5, 8),
('RabbitMQ', 'queue', '3.x', 8, 8, 7, 8, 7, 8),

-- Deployment
('Docker', 'deployment', '24.x', 8, 9, 8, 10, 7, 10),
('Kubernetes', 'deployment', '1.28.x', 9, 10, 5, 9, 4, 9);

-- Insert default agents
INSERT INTO agents (id, type, name, version, capabilities) VALUES
('orchestrator-001', 'orchestrator', 'Master Orchestrator', '1.0.0', '["workflow_management", "resource_allocation", "error_recovery"]'),
('req-analyzer-001', 'requirement_analysis', 'Requirement Analyzer', '1.0.0', '["nlp_processing", "requirement_validation", "story_generation"]'),
('arch-planner-001', 'architecture_planning', 'Architecture Planner', '1.0.0', '["system_design", "technology_selection", "component_mapping"]'),
('template-selector-001', 'template_selection', 'Template Selector', '1.0.0', '["template_matching", "customization_planning", "hybrid_composition"]'),
('code-generator-001', 'code_generation', 'Code Generator', '1.0.0', '["multi_language_generation", "framework_implementation", "optimization"]'),
('tester-001', 'testing', 'Testing Agent', '1.0.0', '["unit_testing", "integration_testing", "security_testing"]'),
('deployer-001', 'deployment', 'Deployment Agent', '1.0.0', '["cicd_setup", "infrastructure_provisioning", "monitoring_setup"]');