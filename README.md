# Droid Builder 🤖

An automated PowerShell script for setting up a complete AI development environment with Ollama, OpenWebUI, MCP Servers, and Agent memory capabilities.

## 🚀 Quick Start

1. Clone this repository
2. Run the PowerShell script as Administrator:
   ```powershell
   .\setup-droid-environment.ps1
   ```
3. Configure your environment variables:
   ```powershell
   # Copy the example env file
   Copy-Item .env.example .env
   # Edit .env with your API keys and settings
   ```
4. Start all services:
   ```powershell
   .\manage-services.ps1 -Action start -Service all
   ```

## 📦 What Gets Installed

### Core AI Infrastructure
- **Ollama** - Local language model runtime
- **OpenWebUI** - Web interface for interacting with AI models
- **MCP Server Stack** - Comprehensive Model Context Protocol server infrastructure

### MCP Server Ecosystem 🔧
- **File System Server** - File operations and workspace management
- **Git Server** - Version control operations and repository management
- **Memory Server** - Persistent memory and context management
- **Database Servers** - SQLite and PostgreSQL for data persistence
- **Communication Servers** - Slack, Email, and messaging capabilities
- **Search Server** - Brave Search for real-time information
- **Monitoring Stack** - Prometheus and Grafana for observability
- **Code Execution** - Jupyter notebooks and E2B sandboxes
- **API Integration** - OpenAPI server for external service integration

### Memory & Agent Support
- **Memvid** - Revolutionary video-based AI memory system for persistent context
- **External Agent Connectors** - Support for agents from multiple cloud providers
- **Persistent Storage** - Dedicated volumes for data persistence across restarts

## 🔧 Features

- **Automated Installation** - One-click setup using winget package manager
- **Memvid + Ollama Integration** - Complete setup for video-based AI memory
- **Ready-to-use Examples** - Working examples and batch scripts included
- **Service Configuration** - Automatic configuration of OpenWebUI to use Ollama
- **Agent Integration** - Pre-configured support for external AI agents
- **Memory Persistence** - Integrated Memvid for agent memory capabilities
- **Cross-Platform Agent Support** - Connect to multiple AI providers

## 📋 Prerequisites

- Windows 10/11
- PowerShell 5.1 or later
- Administrator privileges
- Internet connection
- winget package manager (usually pre-installed on Windows 10/11)

## 🛠️ Service Management

Use the enhanced service manager to control all components:

```powershell
# Start all services (Ollama + OpenWebUI + MCP Stack)
.\manage-services.ps1 -Action start -Service all

# MCP-specific commands
.\manage-services.ps1 -Action mcp-start      # Start MCP servers
.\manage-services.ps1 -Action mcp-stop       # Stop MCP servers
.\manage-services.ps1 -Action mcp-restart    # Restart MCP servers
.\manage-services.ps1 -Action mcp-status     # Check MCP status
.\manage-services.ps1 -Action mcp-logs       # View MCP logs

# Traditional service management
.\manage-services.ps1 -Action status         # Check all services
.\manage-services.ps1 -Action start -Service ollama
.\manage-services.ps1 -Action start -Service openwebui
```

## 🔧 MCP Server Architecture

The MCP (Model Context Protocol) server stack provides enhanced capabilities for AI agents:

### Core Infrastructure Servers
- **MCP Router** (`localhost:3001`) - Central routing and load balancing
- **File System Server** - File operations, directory traversal, content management
- **Git Server** - Repository operations, version control, commit history
- **Memory Server** - Persistent context storage and retrieval

### Data & Storage Servers  
- **SQLite Server** - Lightweight database for agent data
- **PostgreSQL Server** (`localhost:5432`) - Advanced database with full schemas
- **Docker Server** - Container management and orchestration

### External Integration Servers
- **GitHub Server** - Repository management, issue tracking, CI/CD
- **Brave Search Server** - Real-time web search and information retrieval
- **Slack Server** - Team communication and notifications
- **Email Server** - Email sending and communication
- **OpenAPI Server** - Integration with external APIs and services

### Development & Monitoring
- **Jupyter Server** (`localhost:8888`) - Interactive notebooks and development
- **E2B Server** - Secure code execution sandboxes
- **Prometheus** (`localhost:9090`) - Metrics collection and monitoring
- **Grafana** (`localhost:3000`) - Visualization and dashboards

## ⚙️ Configuration

### Environment Setup
1. Copy the example environment file:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` with your API keys and preferences:
   ```env
   # GitHub Integration
   GITHUB_TOKEN=your_github_token_here
   GITHUB_USERNAME=your_username
   
   # OpenAI Integration (optional)
   OPENAI_API_KEY=your_openai_key
   
   # Slack Integration (optional)
   SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
   SLACK_SIGNING_SECRET=your_slack_signing_secret
   
   # Service Configuration
   ENABLE_GITHUB_MCP=true
   ENABLE_SLACK_MCP=false
   ENABLE_EMAIL_MCP=false
   ```

### Database Configuration
The PostgreSQL server comes pre-configured with schemas for:
- **Agent Management** - Store agent profiles and capabilities
- **Project Tracking** - Manage development projects and tasks
- **Task Management** - Track task execution and results
- **Analytics** - Monitor performance and usage patterns

### API Integration
The OpenAPI server provides integration with:
- GitHub API for repository management
- Docker API for container operations  
- Prometheus API for metrics
- Grafana API for dashboards
- Slack API for messaging
- OpenAI API for enhanced AI capabilities

## 🔗 Service URLs

After installation, access these services:

- **OpenWebUI**: http://localhost:8080
- **Ollama API**: http://localhost:11434
- **MCP Router**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Jupyter**: http://localhost:8888
- **PostgreSQL**: localhost:5432 (postgres/postgres)

## 🚀 MCP Usage Examples

### File System Operations
```python
# Connect to MCP file system server
import mcp_client

client = mcp_client.connect('http://localhost:3001')
files = client.filesystem.list_directory('/workspace')
content = client.filesystem.read_file('/workspace/project.py')
```

### Git Operations
```python
# Git repository management
repo_status = client.git.status('/workspace/my-project')
client.git.commit('/workspace/my-project', 'Automated commit from agent')
branches = client.git.list_branches('/workspace/my-project')
```

### Database Operations
```python
# SQLite operations
client.sqlite.execute('CREATE TABLE agents (id INTEGER PRIMARY KEY, name TEXT)')
client.sqlite.execute('INSERT INTO agents (name) VALUES (?)', ['AI Assistant'])

# PostgreSQL operations  
client.postgres.query('SELECT * FROM agents WHERE active = true')
```

### Search and Communication
```python
# Web search
results = client.search.brave_search('latest AI developments')

# Slack messaging (if configured)
client.slack.send_message('#general', 'Task completed successfully!')

# Email notifications (if configured)
client.email.send('admin@company.com', 'Agent Status Update', 'All tasks completed')
```

## 🧠 Memvid + Ollama Quick Start

After running the setup script, you may need to:

1. **Configure Ollama Models**:
   ```powershell
   ollama pull llama2
   ollama pull codellama
   ollama pull mistral
   ```

2. **Access OpenWebUI**: Navigate to `http://localhost:8080`

3. **Test Memvid + Ollama Integration**:
   ```powershell
   # Run the example script
   .\run_memvid_example.bat
   
   # Or manually
   python examples\memvid_ollama_example.py
   ```

4. **Configure External Agents**:
   - Set up API keys for Azure, GCP, Hugging Face
   - Configure agent endpoints in OpenWebUI settings

## 🧠 Memvid + Ollama Quick Start

Create AI memories from your documents and chat with them locally:

```powershell
# 1. Create a memory from text files
python -c "
import sys; sys.path.append(r'%LOCALAPPDATA%\Memvid')
from memvid_ollama_integration import create_memory_from_files
create_memory_from_files(['document.txt', 'notes.md'], 'my_knowledge')
"

# 2. Chat with your memory
python -c "
import sys; sys.path.append(r'%LOCALAPPDATA%\Memvid')
from memvid_ollama_integration import chat_with_ollama_memory
chat_with_ollama_memory('my_knowledge.mp4', 'my_knowledge_index.json')
"
```

📖 **Detailed Guide**: See [MEMVID-OLLAMA-GUIDE.md](MEMVID-OLLAMA-GUIDE.md) for comprehensive usage instructions.

## 🔗 Service URLs

After installation, access these services:

- **OpenWebUI**: http://localhost:8080
- **Ollama API**: http://localhost:11434
- **MCP Tools**: Various ports (check script output)

## 🐛 Troubleshooting

### Common Issues

1. **Script execution policy**: 
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Port conflicts**: Check if ports 8080, 11434, 3001, 3000, 5432, 8888, 9090 are available

3. **Docker issues**:
   ```powershell
   # Check Docker status
   docker --version
   docker compose version
   
   # View MCP service logs
   .\manage-services.ps1 -Action mcp-logs
   ```

4. **Environment configuration**:
   ```powershell
   # Verify .env file exists and has required values
   Get-Content .env | Select-String "GITHUB_TOKEN"
   ```

5. **MCP service startup issues**:
   ```powershell
   # Check individual service status
   .\manage-services.ps1 -Action mcp-status
   
   # Restart specific services
   docker compose restart mcp-router
   docker compose restart postgres
   ```

### MCP-Specific Troubleshooting

1. **MCP Router Connection Issues**:
   - Check if port 3001 is available
   - Verify Docker containers are running
   - Check logs: `docker compose logs mcp-router`

2. **Database Connection Problems**:
   - PostgreSQL: Check port 5432 availability
   - Verify credentials in .env file
   - Check logs: `docker compose logs postgres`

3. **API Integration Issues**:
   - Verify API keys in .env file
   - Check network connectivity
   - Review OpenAPI server logs: `docker compose logs openapi-server`

4. **File Permission Issues**:
   - Ensure workspace directory has proper permissions
   - Check Docker volume mounts
   - Verify file ownership in containers

### Logs and Debugging

Check application logs in:
- **Ollama**: `%LOCALAPPDATA%\Ollama\logs`
- **OpenWebUI**: Application console output
- **MCP Services**: `.\manage-services.ps1 -Action mcp-logs`
- **Docker Compose**: `docker compose logs [service_name]`
- **Individual Services**: `docker logs [container_name]`

### Reset and Clean Installation

If you encounter persistent issues:
```powershell
# Stop all services
.\manage-services.ps1 -Action stop -Service all

# Clean MCP stack
docker compose down -v
docker system prune -f

# Remove data volumes (WARNING: This deletes all data)
docker volume prune -f

# Restart services
.\manage-services.ps1 -Action start -Service all
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) - Local AI model runtime
- [OpenWebUI](https://github.com/open-webui/open-webui) - Web interface for AI models
- [MCP Tools](https://github.com/modelcontextprotocol) - Model Context Protocol tools
- [Memvid](https://github.com/Olow304/memvid/) - Agent memory management

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Open an issue in this repository
- Consult the official documentation of each tool

---

**Built with ❤️ for the AI development community**
