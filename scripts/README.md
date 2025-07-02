# 🛠️ MCP Router Pro Scripts

Collection of utility scripts for building, deploying, and managing the MCP Router Pro application.

## 📁 Scripts Organization

```
scripts/
├── README.md                      # This file - scripts documentation
├── 🚀 Deployment Scripts/
│   ├── azure-deploy.ps1           # Azure deployment automation
│   ├── docker-build-push.ps1      # Docker build and registry push
│   └── deploy.js                  # Node.js deployment utilities
├── ⚙️ Setup Scripts/
│   ├── setup-github.ps1           # GitHub repository setup
│   ├── configure-github-secrets.ps1 # GitHub secrets configuration
│   └── setup-droid-environment.ps1 # Legacy environment setup
├── 🔧 Service Management/
│   ├── manage-services.ps1        # Service lifecycle management
│   ├── start-mcp-wsl.ps1          # Start MCP services in WSL
│   └── status-mcp-wsl.ps1         # Check MCP service status
└── 📊 Monitoring & Utilities/
    └── (additional utility scripts)
```

## 🚀 **Deployment Scripts**

### 1. **Azure Deployment** (`azure-deploy.ps1`)
**Purpose**: Complete Azure infrastructure and application deployment

```powershell
# Deploy everything to Azure
./scripts/azure-deploy.ps1

# Deploy with specific parameters
./scripts/azure-deploy.ps1 -ResourceGroup "my-rg" -Location "eastus"
```

**Features**:
- Azure resource group creation
- Bicep template deployment
- Container registry setup
- Docker image build and push
- Container app deployment
- Health check verification

**Prerequisites**:
- Azure CLI installed and authenticated
- Docker installed and running
- Appropriate Azure permissions

### 2. **Docker Build & Push** (`docker-build-push.ps1`)
**Purpose**: Build Docker image and push to Azure Container Registry

```powershell
# Build and push with default settings
./scripts/docker-build-push.ps1

# Build and push to specific registry
./scripts/docker-build-push.ps1 -RegistryName "myregistry" -ImageTag "v1.2.3"
```

**Features**:
- Docker image building
- Multi-architecture support
- Azure Container Registry authentication
- Image tagging and versioning
- Push verification

### 3. **Node.js Deployment** (`deploy.js`)
**Purpose**: Node.js-based deployment utilities and automation

```bash
# Run deployment script
node scripts/deploy.js

# Deploy with specific environment
node scripts/deploy.js --env production
```

**Features**:
- Environment-specific deployments
- Configuration validation
- Deployment status checking
- Error handling and rollback

## ⚙️ **Setup Scripts**

### 1. **GitHub Setup** (`setup-github.ps1`)
**Purpose**: Initialize GitHub repository and configure remotes

```powershell
# Setup GitHub repository
./scripts/setup-github.ps1

# Setup with custom repository name
./scripts/setup-github.ps1 -RepoName "my-mcp-router"
```

**Features**:
- Git repository initialization
- GitHub remote configuration
- Initial commit and push
- Branch protection setup

### 2. **GitHub Secrets Configuration** (`configure-github-secrets.ps1`)
**Purpose**: Configure GitHub repository secrets for CI/CD

```powershell
# Configure all required secrets
./scripts/configure-github-secrets.ps1

# Display secret configuration guide
./scripts/configure-github-secrets.ps1 -ShowGuide
```

**Features**:
- Azure credentials configuration
- GitHub secrets documentation
- Validation of required secrets
- Security best practices guidance

### 3. **Environment Setup** (`setup-droid-environment.ps1`)
**Purpose**: Legacy script for complete development environment setup

```powershell
# Full environment setup (legacy)
./scripts/setup-droid-environment.ps1
```

**Note**: This is a legacy script from the original Droid Builder project.

## 🔧 **Service Management Scripts**

### 1. **Service Management** (`manage-services.ps1`)
**Purpose**: Lifecycle management for all MCP Router Pro services

```powershell
# Start all services
./scripts/manage-services.ps1 -Action start -Service all

# Stop specific service
./scripts/manage-services.ps1 -Action stop -Service mcp-router

# Check service status
./scripts/manage-services.ps1 -Action status

# Restart services
./scripts/manage-services.ps1 -Action restart -Service all
```

**Supported Actions**:
- `start` - Start services
- `stop` - Stop services  
- `restart` - Restart services
- `status` - Check service status
- `logs` - View service logs

**Supported Services**:
- `all` - All services
- `mcp-router` - MCP Router Pro
- `database` - Database services
- `monitoring` - Monitoring stack

### 2. **WSL MCP Management** (`start-mcp-wsl.ps1`, `status-mcp-wsl.ps1`)
**Purpose**: Manage MCP services running in Windows Subsystem for Linux

```powershell
# Start MCP services in WSL
./scripts/start-mcp-wsl.ps1

# Check MCP service status in WSL
./scripts/status-mcp-wsl.ps1
```

**Features**:
- WSL service management
- Cross-platform compatibility
- Docker container orchestration
- Service health monitoring

## 🔧 **Script Usage Patterns**

### Common Deployment Workflow
```powershell
# 1. Setup GitHub repository
./scripts/setup-github.ps1

# 2. Configure GitHub secrets  
./scripts/configure-github-secrets.ps1

# 3. Deploy to Azure
./scripts/azure-deploy.ps1

# 4. Verify deployment
./scripts/manage-services.ps1 -Action status
```

### Development Workflow
```powershell
# 1. Start local services
./scripts/manage-services.ps1 -Action start -Service all

# 2. Build and test locally
npm start
npm test

# 3. Build Docker image
./scripts/docker-build-push.ps1 -LocalOnly

# 4. Deploy when ready
./scripts/azure-deploy.ps1
```

### Maintenance Workflow
```powershell
# Check service status
./scripts/status-mcp-wsl.ps1

# View logs
./scripts/manage-services.ps1 -Action logs

# Restart if needed
./scripts/manage-services.ps1 -Action restart -Service all
```

## 📊 **Script Configuration**

### Environment Variables
Scripts use these environment variables:
```powershell
# Azure configuration
$env:AZURE_SUBSCRIPTION_ID = "your-subscription-id"
$env:AZURE_RESOURCE_GROUP = "mcp-router-rg"
$env:AZURE_LOCATION = "eastus"

# Docker configuration
$env:DOCKER_REGISTRY = "your-registry.azurecr.io"
$env:IMAGE_NAME = "mcp-router-pro"
$env:IMAGE_TAG = "latest"

# GitHub configuration
$env:GITHUB_USERNAME = "your-username"
$env:GITHUB_REPO = "mcp-router-pro"
```

### Script Parameters
Most scripts accept parameters for customization:
```powershell
# Common parameters
-ResourceGroup    # Azure resource group name
-Location         # Azure region
-RegistryName     # Container registry name
-ImageTag         # Docker image tag
-Environment      # Deployment environment (dev/staging/prod)
-Verbose          # Enable verbose output
-WhatIf          # Show what would happen without executing
```

## 🧪 **Testing Scripts**

### Script Validation
```powershell
# Test script syntax
powershell -File scripts/azure-deploy.ps1 -WhatIf

# Validate parameters
./scripts/docker-build-push.ps1 -Validate

# Dry run deployment
./scripts/azure-deploy.ps1 -DryRun
```

### Error Handling
Scripts include comprehensive error handling:
- **Parameter validation** - Check required parameters
- **Prerequisite checks** - Verify tools and permissions
- **Progress reporting** - Show deployment progress
- **Rollback capabilities** - Undo on failure
- **Detailed logging** - Comprehensive error messages

## 🔒 **Security Considerations**

### Credential Management
- **Never hardcode secrets** in scripts
- **Use environment variables** for sensitive data
- **Leverage Azure Key Vault** for production secrets
- **Follow least privilege** access principles

### Script Execution
```powershell
# Set execution policy if needed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run scripts with proper permissions
# Avoid running scripts as Administrator unless required
```

## 🤝 **Contributing Scripts**

When adding new scripts:

1. **Follow naming conventions** - Use descriptive, hyphenated names
2. **Include parameter documentation** - Document all parameters
3. **Add error handling** - Handle errors gracefully
4. **Provide examples** - Show usage examples
5. **Update this README** - Document the new script

### Script Template
```powershell
# scripts/my-script.ps1
<#
.SYNOPSIS
    Brief description of what the script does

.DESCRIPTION
    Detailed description of the script's functionality

.PARAMETER ParameterName
    Description of the parameter

.EXAMPLE
    ./scripts/my-script.ps1 -ParameterName "value"
    
.NOTES
    Author: Your Name
    Date: YYYY-MM-DD
#>

param(
    [string]$ParameterName,
    [switch]$Verbose
)

# Script implementation
Write-Host "🚀 Starting my script..." -ForegroundColor Green

try {
    # Main logic here
    Write-Host "✅ Script completed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Script failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
```

---

**🛠️ Automation is the key to consistency, reliability, and scalability.**

*These scripts provide the foundation for reliable, repeatable operations of MCP Router Pro.*
