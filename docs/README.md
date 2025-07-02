# 📚 MCP Router Pro Documentation

Welcome to the comprehensive documentation for MCP Router Pro - a production-ready Model Context Protocol router with enterprise-grade features.

## 📋 Table of Contents

### 🚀 **Getting Started**
- **[Quick Start Guide](../README.md#quick-start)** - Get up and running in minutes
- **[Installation Guide](INSTALLATION.md)** - Detailed installation instructions
- **[Configuration Guide](CONFIGURATION.md)** - Environment and application configuration

### 🏗️ **Deployment**
- **[Azure Deployment Guide](AZURE-DEPLOYMENT-READY.md)** - Complete Azure deployment instructions
- **[CI/CD Setup Guide](CI-CD-SETUP-GUIDE.md)** - Automated deployment pipeline setup
- **[Production Deployment](PRODUCTION-DEPLOYMENT-GUIDE.md)** - Production deployment best practices
- **[Docker Deployment](DOCKER-DEPLOYMENT.md)** - Container deployment guide

### 📊 **Operations**
- **[Deployment Status](DEPLOYMENT-STATUS.md)** - Current deployment status and endpoints
- **[Deployment Success](DEPLOYMENT-SUCCESS.md)** - Successful deployment verification
- **[Production Readiness](PRODUCTION-READINESS-SUMMARY.md)** - Production readiness checklist
- **[Pipeline Testing](PIPELINE-TEST.md)** - CI/CD pipeline testing results

### 🔧 **Development**
- **[MCP Integration](MCP-INTEGRATION-COMPLETE.md)** - MCP protocol integration details
- **[MCP Setup Guide](MCP-SETUP-GUIDE.md)** - Setting up MCP servers and clients
- **[Setup Complete](SETUP-COMPLETE.md)** - Development environment setup
- **[Validation Complete](VALIDATION-COMPLETE.md)** - System validation and testing

### 🧪 **Legacy & References**
- **[Memvid Ollama Guide](MEMVID-OLLAMA-GUIDE.md)** - Legacy Memvid integration guide

## 🎯 **Quick Reference**

### Live Production Endpoints
- **Base URL**: `https://ca-mcp-router-pro-3nfm2hof7fhw6.mangoforest-1a47bbd7.eastus.azurecontainerapps.io`
- **Health Check**: `/health` (public, no authentication)
- **Admin Status**: `/admin/status` (requires API key)
- **API Tools**: `/api/tools` (requires API key)
- **Metrics**: `/metrics` (requires API key)

### Authentication Methods
```bash
# Header authentication
curl -H "X-API-Key: your-key" https://your-endpoint/admin/status

# Bearer token
curl -H "Authorization: Bearer your-key" https://your-endpoint/admin/status

# Query parameter
curl "https://your-endpoint/admin/status?api_key=your-key"
```

### Key Commands
```bash
# Local development
npm start                    # Start server locally
npm test                     # Run test suite
npm run docker:build        # Build Docker image

# Deployment
./scripts/azure-deploy.ps1   # Deploy to Azure
azd up                       # Deploy with Azure Developer CLI
```

## 📁 **Documentation Organization**

```
docs/
├── README.md                      # This file - documentation index
├── 🚀 Getting Started/
│   ├── AZURE-DEPLOYMENT-READY.md  # Azure deployment guide
│   ├── CI-CD-SETUP-GUIDE.md      # CI/CD pipeline setup
│   └── PRODUCTION-DEPLOYMENT-GUIDE.md  # Production deployment
├── 📊 Operations/
│   ├── DEPLOYMENT-STATUS.md       # Current deployment status
│   ├── DEPLOYMENT-SUCCESS.md      # Deployment verification
│   └── PRODUCTION-READINESS-SUMMARY.md  # Readiness checklist
├── 🔧 Development/
│   ├── MCP-INTEGRATION-COMPLETE.md # MCP protocol details
│   ├── MCP-SETUP-GUIDE.md         # MCP setup instructions
│   └── SETUP-COMPLETE.md          # Environment setup
└── 🧪 Testing & Validation/
    ├── PIPELINE-TEST.md           # Pipeline testing
    └── VALIDATION-COMPLETE.md     # System validation
```

## 🤝 **Contributing to Documentation**

When adding new documentation:

1. **Follow the naming convention**: Use descriptive, hyphenated names
2. **Update this index**: Add links to new documents
3. **Use consistent formatting**: Follow the established markdown style
4. **Include examples**: Provide code examples and command snippets
5. **Cross-reference**: Link between related documents

## 📞 **Need Help?**

- **🐛 Found an issue?** [Open a GitHub Issue](https://github.com/wuttechadmin/mcp-router-pro/issues)
- **💡 Have a suggestion?** [Start a Discussion](https://github.com/wuttechadmin/mcp-router-pro/discussions)
- **📧 Need support?** Check the [Support section](../README.md#support) in the main README

---

**📚 Happy Reading! The documentation is continuously updated to reflect the latest features and best practices.**
