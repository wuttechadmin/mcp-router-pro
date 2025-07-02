-- Initialize MCP PostgreSQL Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas for different MCP use cases
CREATE SCHEMA IF NOT EXISTS mcp_agents;
CREATE SCHEMA IF NOT EXISTS mcp_projects;
CREATE SCHEMA IF NOT EXISTS mcp_analytics;

-- Agents table for AI agent configurations
CREATE TABLE IF NOT EXISTS mcp_agents.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    configuration JSONB,
    capabilities TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table for tracking development projects
CREATE TABLE IF NOT EXISTS mcp_projects.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table for project management
CREATE TABLE IF NOT EXISTS mcp_projects.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES mcp_projects.projects(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 3,
    assigned_agent_id UUID REFERENCES mcp_agents.agents(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table for tracking usage and performance
CREATE TABLE IF NOT EXISTS mcp_analytics.usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_name VARCHAR(100),
    tool_name VARCHAR(100),
    agent_id UUID,
    execution_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_name ON mcp_agents.agents(name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON mcp_projects.projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON mcp_projects.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON mcp_projects.tasks(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON mcp_analytics.usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_logs_server_tool ON mcp_analytics.usage_logs(server_name, tool_name);

-- Insert sample data
INSERT INTO mcp_agents.agents (name, description, configuration, capabilities) VALUES
('droid-builder-assistant', 'Main AI assistant for the Droid Builder project', 
 '{"model": "llama2", "temperature": 0.7, "max_tokens": 2048}',
 ARRAY['code_generation', 'file_operations', 'git_management', 'database_operations']),
('code-reviewer', 'Specialized agent for code review and quality assurance',
 '{"model": "codellama", "temperature": 0.3, "max_tokens": 1024}',
 ARRAY['code_analysis', 'security_audit', 'performance_optimization']),
('deployment-manager', 'Agent responsible for deployment and infrastructure management',
 '{"model": "mistral", "temperature": 0.5, "max_tokens": 1536}',
 ARRAY['docker_management', 'kubernetes_operations', 'monitoring']);

INSERT INTO mcp_projects.projects (name, description, repository_url, metadata) VALUES
('droid-builder-core', 'Core Droid Builder AI development environment',
 'https://github.com/user/droid-builder',
 '{"framework": "PowerShell", "platforms": ["Windows"], "ai_services": ["Ollama", "OpenWebUI"]}'),
('mcp-integration', 'Model Context Protocol servers integration project',
 'https://github.com/user/droid-builder',
 '{"framework": "Docker", "services": ["PostgreSQL", "Git", "FileSystem"], "transport": "HTTP"}');

-- Grant permissions
GRANT USAGE ON SCHEMA mcp_agents TO mcp_user;
GRANT USAGE ON SCHEMA mcp_projects TO mcp_user;
GRANT USAGE ON SCHEMA mcp_analytics TO mcp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mcp_agents TO mcp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mcp_projects TO mcp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mcp_analytics TO mcp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mcp_agents TO mcp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mcp_projects TO mcp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mcp_analytics TO mcp_user;
