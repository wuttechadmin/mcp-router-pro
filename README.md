# 🚀 MCP Router Pro

[![Build Status](https://github.com/wuttechadmin/mcp-router-pro/workflows/Build%20and%20Deploy%20MCP%20Router%20Pro/badge.svg)](https://github.com/wuttechadmin/mcp-router-pro/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![Azure](https://img.shields.io/badge/Azure-Container%20Apps-blue.svg)](https://azure.microsoft.com/en-us/products/container-apps)

**Production-ready Model Context Protocol (MCP) Router with enterprise-grade features, Azure deployment, and comprehensive monitoring.**

## ✨ Features

### 🎯 **Core Functionality**
- **MCP Protocol Router** - High-performance routing and load balancing
- **WebSocket Support** - Real-time bidirectional communication
- **RESTful API** - HTTP endpoints for easy integration
- **Tool Execution** - Built-in tools for file operations, networking, and more
- **Request Proxying** - Intelligent request routing and caching

### 🔐 **Security & Authentication**
- **API Key Management** - Create, revoke, and manage API keys
- **Rate Limiting** - Configurable rate limits per key/IP
- **CORS Support** - Cross-origin resource sharing configuration
- **Input Validation** - Comprehensive request validation and sanitization
- **Audit Logging** - Detailed security and access logging

### 📊 **Monitoring & Observability**
- **Real-time Metrics** - Performance monitoring and alerting
- **Health Checks** - Container and application health monitoring
- **Admin Dashboard** - Web-based administration interface
- **Production Logging** - Structured logging with multiple levels
- **WebSocket Analytics** - Connection and message statistics

### 🚀 **Production Ready**
- **Docker Containerization** - Multi-stage builds and optimization
- **Azure Deployment** - Container Apps with auto-scaling
- **CI/CD Pipeline** - Automated build, test, and deployment
- **Infrastructure as Code** - Bicep templates for Azure resources
- **Zero-downtime Deployments** - Rolling updates and health checks

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Apps   │───▶│   MCP Router     │───▶│   MCP Servers   │
│                 │    │   (Load Balancer │    │   (Tools &      │
│ • Web Apps      │    │    & Proxy)      │    │    Services)    │
│ • Mobile Apps   │    │                  │    │                 │
│ • AI Agents     │    │ • Authentication │    │ • File System   │
│ • Scripts       │    │ • Rate Limiting  │    │ • Database      │
└─────────────────┘    │ • Monitoring     │    │ • Network       │
                       │ • Caching        │    │ • Custom Tools  │
                       └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+**
- **Docker** (optional)
- **Azure CLI** (for deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/wuttechadmin/mcp-router-pro.git
cd mcp-router-pro

# Install dependencies
npm install

# Start the server
npm start

# Server runs on http://localhost:3001
```

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run

# Or use Docker Compose
docker-compose up -d
```

### Azure Deployment

```bash
# Deploy infrastructure and application
./scripts/azure-deploy.ps1

# Or use Azure Developer CLI
azd up
```

## 📁 Project Structure

```
mcp-router-pro/
├── 📂 src/                     # Source code
│   ├── server.js               # Main application server
│   ├── mcp-*.js               # MCP protocol modules
│   ├── admin-dashboard.js      # Admin web interface
│   └── production-monitor.js   # Monitoring utilities
├── 📂 docs/                    # Documentation
│   ├── deployment-guides/      # Deployment instructions
│   ├── api-reference/         # API documentation
│   └── architecture/          # Architecture diagrams
├── 📂 tests/                   # Test suites
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── load/                  # Load testing
├── 📂 scripts/                 # Build and deployment scripts
│   ├── azure-deploy.ps1       # Azure deployment
│   ├── docker-build-push.ps1  # Docker operations
│   └── setup-*.ps1           # Environment setup
├── 📂 infra/                   # Infrastructure as Code
│   ├── main.bicep             # Main Bicep template
│   ├── app/                   # Application resources
│   └── core/                  # Shared resources
├── 📂 examples/                # Usage examples
│   ├── basic-server.js        # Simple MCP server
│   ├── client-examples/       # Client implementations
│   └── integration-samples/   # Integration examples
├── 📂 config/                  # Configuration files
├── 📂 .github/                 # GitHub Actions workflows
├── Dockerfile                  # Container definition
├── docker-compose.yml         # Local Docker setup
└── package.json               # Node.js dependencies
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# Security
REQUIRE_API_KEY=true
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600

# Azure Configuration (for deployment)
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=mcp-router-rg
AZURE_CONTAINER_APP=ca-mcp-router-pro
```

### API Usage

#### Authentication
```bash
# Using API Key Header
curl -H "X-API-Key: your-api-key" http://localhost:3001/api/tools

# Using Bearer Token
curl -H "Authorization: Bearer your-api-key" http://localhost:3001/api/tools

# Using Query Parameter
curl "http://localhost:3001/api/tools?api_key=your-api-key"
```

#### Health Check
```bash
# Public health endpoint (no authentication required)
curl http://localhost:3001/health
```

#### Admin Endpoints
```bash
# Get system status (requires admin API key)
curl -H "X-API-Key: admin-key" http://localhost:3001/admin/status

# View metrics
curl -H "X-API-Key: admin-key" http://localhost:3001/metrics
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run load tests
npm run test:load

# Run specific test suite
node tests/test-suite-advanced.js
```

## 📈 Monitoring

### Health Checks
- **Application Health**: `/health` - Basic service health
- **Admin Status**: `/admin/status` - Detailed system information
- **Metrics Endpoint**: `/metrics` - Performance metrics

### Logging
- **Structured Logging**: JSON format with timestamps
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Audit Trail**: Security events and API access

### Alerts
- **Performance Alerts**: High latency, error rates
- **Security Alerts**: Authentication failures, rate limiting
- **System Alerts**: Memory usage, connection limits

## 🚀 Deployment

### Local Development
```bash
npm start                  # Start development server
npm run dev               # Start with hot reload (if configured)
```

### Production Deployment
```bash
# Azure Container Apps (recommended)
./scripts/azure-deploy.ps1

# Docker
npm run docker:build && npm run docker:run

# Manual deployment
NODE_ENV=production npm start
```

### CI/CD Pipeline
Every push to `main` branch automatically:
1. **Builds** Docker image
2. **Runs** test suite
3. **Pushes** to Azure Container Registry
4. **Deploys** to Azure Container Apps
5. **Validates** health checks

## 📚 Documentation

- **[Complete Documentation Index](docs/README.md)** - All documentation organized
- **[Azure Deployment Guide](docs/AZURE-DEPLOYMENT-READY.md)** - Azure deployment instructions
- **[CI/CD Setup Guide](docs/CI-CD-SETUP-GUIDE.md)** - Automated deployment setup
- **[Production Guide](docs/PRODUCTION-DEPLOYMENT-GUIDE.md)** - Production deployment best practices
- **[Test Suite Documentation](tests/README.md)** - Comprehensive testing guide
- **[Scripts Documentation](scripts/README.md)** - Build and deployment scripts
- **[Examples Guide](examples/README.md)** - Usage examples and learning progression

## 🎯 **Live Production Service**

**🌐 Production URL**: `https://ca-mcp-router-pro-3nfm2hof7fhw6.mangoforest-1a47bbd7.eastus.azurecontainerapps.io`

### Quick API Test
```bash
# Health check (public)
curl https://ca-mcp-router-pro-3nfm2hof7fhw6.mangoforest-1a47bbd7.eastus.azurecontainerapps.io/health

# Admin status (requires API key)
curl -H "X-API-Key: your-key" https://ca-mcp-router-pro-3nfm2hof7fhw6.mangoforest-1a47bbd7.eastus.azurecontainerapps.io/admin/status
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Model Context Protocol](https://modelcontextprotocol.io/)** - Core protocol specification
- **[Azure Container Apps](https://azure.microsoft.com/en-us/products/container-apps)** - Cloud hosting platform
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)** - Real-time communication

## 📞 Support

- **📧 Issues**: [GitHub Issues](https://github.com/wuttechadmin/mcp-router-pro/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/wuttechadmin/mcp-router-pro/discussions)
- **📖 Documentation**: [Project Wiki](https://github.com/wuttechadmin/mcp-router-pro/wiki)

---

**Built with ❤️ for the AI development community**

*MCP Router Pro - Making AI tool integration simple, secure, and scalable.*
