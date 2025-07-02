# MCP Server Setup and Configuration Guide 🔧

This guide provides detailed instructions for setting up and configuring the Model Context Protocol (MCP) server infrastructure in Droid Builder.

## 📋 Prerequisites

- Docker Desktop installed and running
- WSL (Windows Subsystem for Linux) installed and configured
- PowerShell 5.1 or later
- At least 4GB of free disk space
- Access to GitHub (for some integrations)

**Note**: All Docker commands in this guide use `wsl docker` to run through WSL.

## 🚀 Quick Setup

1. **Clone and Navigate**:
   ```powershell
   git clone <repository-url>
   cd droid-builder
   ```

2. **Configure Environment**:
   ```powershell
   Copy-Item .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MCP Stack**:
   ```powershell
   .\manage-services.ps1 -Action mcp-start
   ```

### Manual WSL Docker Commands

If you prefer to run Docker commands manually through WSL:

```powershell
# Start all services (with build)
wsl docker compose up -d --build

# View service status
wsl docker compose ps

# View logs for all services
wsl docker compose logs

# View logs for specific service
wsl docker compose logs mcp-router
wsl docker compose logs postgres

# Stop all services
wsl docker compose down

# Stop and remove all data (complete reset)
wsl docker compose down -v

# Restart specific service
wsl docker compose restart mcp-router

# Rebuild and restart all services
wsl docker compose down && wsl docker compose up -d --build
```

## ⚙️ Detailed Configuration

### Environment Variables (.env)

#### Required Settings
```env
# Database Configuration
POSTGRES_DB=mcp_agents
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# MCP Router Configuration
MCP_ROUTER_PORT=3001
MCP_ROUTER_LOG_LEVEL=info
```

#### GitHub Integration (Recommended)
```env
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_USERNAME=your_github_username
ENABLE_GITHUB_MCP=true
```

**To get a GitHub token**:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with `repo`, `user`, and `admin:org` permissions
3. Copy token to your `.env` file

#### OpenAI Integration (Optional)
```env
OPENAI_API_KEY=sk-your_openai_api_key
OPENAI_MODEL=gpt-4
ENABLE_OPENAI_MCP=true
```

#### Slack Integration (Optional)
```env
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_CHANNEL=#general
ENABLE_SLACK_MCP=false
```

#### Email Integration (Optional)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
ENABLE_EMAIL_MCP=false
```

### Service Configuration

#### MCP Router (mcp-config/mcp-router.json)
The router configuration handles service discovery and routing:

```json
{
  "server": {
    "port": 3001,
    "host": "0.0.0.0"
  },
  "services": {
    "filesystem": {
      "url": "http://filesystem-server:3002",
      "health_check": "/health"
    },
    "git": {
      "url": "http://git-server:3003", 
      "health_check": "/health"
    }
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

#### PostgreSQL Schema (mcp-config/postgres/init.sql)
The database comes pre-configured with tables for:
- **agents**: Agent profile and configuration management
- **projects**: Development project tracking
- **tasks**: Task execution and status tracking
- **analytics**: Performance metrics and usage data

## 🔧 Service Architecture

### Core Services

#### MCP Router
- **Purpose**: Central routing and load balancing
- **Port**: 3001
- **Health Check**: `http://localhost:3001/health`
- **Configuration**: `mcp-config/mcp-router.json`

#### File System Server  
- **Purpose**: File operations and workspace management
- **Capabilities**: 
  - Directory listing and traversal
  - File reading and writing
  - Permission management
  - File watching and notifications

#### Git Server
- **Purpose**: Version control operations
- **Capabilities**:
  - Repository cloning and management
  - Commit operations
  - Branch management
  - Diff and merge operations

#### Memory Server
- **Purpose**: Persistent context and memory management
- **Capabilities**:
  - Context storage and retrieval
  - Semantic search across stored memories
  - Memory categorization and tagging

### Data Services

#### PostgreSQL Database
- **Port**: 5432
- **Credentials**: postgres/postgres (configurable)
- **Databases**: mcp_agents
- **Data Persistence**: `mcp-data/postgres/`

#### SQLite Server
- **Purpose**: Lightweight database operations
- **Storage**: `mcp-data/sqlite/`
- **Use Cases**: Agent-specific data, temporary storage

### Integration Services

#### GitHub Server
- **Purpose**: Repository and project management
- **Requirements**: GitHub token with appropriate permissions
- **Capabilities**:
  - Repository operations
  - Issue management
  - Pull request handling
  - CI/CD integration

#### Brave Search Server
- **Purpose**: Real-time web search
- **Capabilities**:
  - Web search with filtering
  - News and current events
  - Technical documentation search

### Development Services

#### Jupyter Server
- **Port**: 8888
- **Purpose**: Interactive development and prototyping
- **Features**:
  - Python notebooks
  - MCP client libraries pre-installed
  - Integration examples

#### E2B Server
- **Purpose**: Secure code execution sandboxes
- **Capabilities**:
  - Isolated Python execution
  - Package installation
  - File system access within sandbox

### Monitoring Services

#### Prometheus
- **Port**: 9090
- **Purpose**: Metrics collection and storage
- **Metrics Collected**:
  - MCP service performance
  - Request rates and latencies
  - Error rates and health status

#### Grafana
- **Port**: 3000
- **Credentials**: admin/admin
- **Dashboards**:
  - MCP Service Overview
  - Performance Metrics
  - Error Tracking
  - Usage Analytics

## 🔍 Monitoring and Observability

### Health Checks
All services provide health check endpoints:
```powershell
# Check individual service health
curl http://localhost:3001/health  # MCP Router
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3000/api/health  # Grafana
```

### Logs
Access logs for troubleshooting:
```powershell
# All services
.\manage-services.ps1 -Action mcp-logs

# Specific service
wsl docker compose logs mcp-router
wsl docker compose logs postgres
wsl docker compose logs prometheus
```

### Metrics
Key metrics to monitor:
- **Request Rate**: Requests per second to MCP services
- **Response Time**: Average response time for MCP operations
- **Error Rate**: Percentage of failed requests
- **Resource Usage**: CPU and memory consumption
- **Database Connections**: Active database connections

## 🛠️ Advanced Configuration

### Custom Service Addition
To add a new MCP service:

1. **Add to docker-compose.yml**:
```yaml
my-custom-service:
  build: ./custom-service
  ports:
    - "3010:3010"
  environment:
    - SERVICE_NAME=my-custom-service
  networks:
    - mcp-network
```

2. **Update MCP Router Configuration**:
```json
{
  "services": {
    "my-custom": {
      "url": "http://my-custom-service:3010",
      "health_check": "/health"
    }
  }
}
```

### SSL/TLS Configuration
For production environments:

1. **Generate Certificates**:
```powershell
# Create certificates directory
mkdir certs

# Generate self-signed certificate (for development)
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

2. **Update docker-compose.yml**:
```yaml
mcp-router:
  environment:
    - SSL_CERT_PATH=/certs/cert.pem
    - SSL_KEY_PATH=/certs/key.pem
  volumes:
    - ./certs:/certs:ro
```

### Resource Limits
Configure resource limits for production:
```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
```

## 🔧 Maintenance Tasks

### Backup and Restore
```powershell
# Backup PostgreSQL data
wsl docker compose exec postgres pg_dump -U postgres mcp_agents > backup.sql

# Backup all persistent data
wsl docker run --rm -v droid-builder_postgres-data:/data -v ${PWD}:/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore from backup
wsl docker compose exec -T postgres psql -U postgres mcp_agents < backup.sql
```

### Updates and Upgrades
```powershell
# Pull latest images
wsl docker compose pull

# Restart with new images
.\manage-services.ps1 -Action mcp-restart
```

### Performance Optimization
```powershell
# Monitor resource usage
docker stats

# Optimize PostgreSQL settings in docker-compose.yml
environment:
  - POSTGRES_SHARED_BUFFERS=256MB
  - POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
```

## 📞 Support and Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3001, 3000, 5432, 8888, 9090 are available
2. **Memory Issues**: Increase Docker memory allocation if services fail to start
3. **Network Issues**: Check Docker network configuration and firewall settings
4. **Permission Issues**: Ensure proper file permissions in workspace and data directories

### Getting Help

- Check service logs: `.\manage-services.ps1 -Action mcp-logs`
- Review Docker Compose status: `wsl docker compose ps`
- Monitor resource usage: `wsl docker stats`
- Test network connectivity: `wsl docker compose exec mcp-router ping postgres`

For additional support, consult the main project documentation or open an issue in the repository.
