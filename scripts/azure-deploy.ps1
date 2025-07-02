#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Azure deployment script for MCP Router Pro

.DESCRIPTION
    This script deploys the MCP Router Pro to Azure Container Apps
    with all required infrastructure components.

.PARAMETER EnvironmentName
    The environment name (e.g., 'dev', 'staging', 'prod')

.PARAMETER Location
    Azure region for deployment (default: 'eastus')

.PARAMETER ResourceGroupName
    Name of the resource group (will be created if it doesn't exist)

.PARAMETER SkipBuild
    Skip building and pushing the Docker image

.EXAMPLE
    .\azure-deploy.ps1 -EnvironmentName "dev" -Location "eastus"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$EnvironmentName,
    
    [Parameter(Mandatory = $false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory = $false)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Status {
    param([string]$Message, [string]$Color = $Blue)
    Write-Host "${Color}🚀 $Message${Reset}"
}

function Write-Success {
    param([string]$Message)
    Write-Host "${Green}✅ $Message${Reset}"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${Yellow}⚠️  $Message${Reset}"
}

function Write-Error {
    param([string]$Message)
    Write-Host "${Red}❌ $Message${Reset}"
}

# Validate prerequisites
Write-Status "Checking prerequisites..."

# Check if Azure CLI is installed
try {
    $azVersion = az --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI not found"
    }
    Write-Success "Azure CLI is available"
} catch {
    Write-Error "Azure CLI is not installed or not in PATH"
    Write-Host "Please install Azure CLI and restart PowerShell, then try again."
    exit 1
}

# Check if Docker is available
try {
    $dockerVersion = wsl docker --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not found"
    }
    Write-Success "Docker is available via WSL"
} catch {
    Write-Error "Docker is not available via WSL"
    exit 1
}

# Check if logged into Azure
try {
    $account = az account show --query "user.name" -o tsv 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Not logged into Azure"
        Write-Status "Initiating Azure login..."
        az login
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Azure login failed"
            exit 1
        }
    }
    Write-Success "Logged into Azure as: $account"
} catch {
    Write-Error "Failed to check Azure login status"
    exit 1
}

# Set default resource group name if not provided
if (-not $ResourceGroupName) {
    $ResourceGroupName = "rg-mcp-router-$EnvironmentName"
}

# Configuration
$subscriptionId = az account show --query "id" -o tsv
$principalId = az ad signed-in-user show --query "id" -o tsv
$containerRegistryName = "acrmcprouter$EnvironmentName$(Get-Random -Maximum 9999)"
$resourceToken = $EnvironmentName.ToLower()

Write-Status "Deployment Configuration:"
Write-Host "  Environment: $EnvironmentName"
Write-Host "  Location: $Location"
Write-Host "  Resource Group: $ResourceGroupName"
Write-Host "  Subscription: $subscriptionId"
Write-Host "  Principal ID: $principalId"
Write-Host ""

# Step 1: Create Resource Group
Write-Status "Creating resource group..."
az group create --name $ResourceGroupName --location $Location --tags "project=mcp-router" "environment=$EnvironmentName"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create resource group"
    exit 1
}
Write-Success "Resource group created: $ResourceGroupName"

# Step 2: Create Container Registry
Write-Status "Creating Azure Container Registry..."
az acr create --resource-group $ResourceGroupName --name $containerRegistryName --sku Basic --admin-enabled true
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create container registry"
    exit 1
}
$acrLoginServer = az acr show --name $containerRegistryName --query "loginServer" -o tsv
Write-Success "Container registry created: $acrLoginServer"

# Step 3: Build and Push Docker Image (unless skipped)
if (-not $SkipBuild) {
    Write-Status "Building and pushing Docker image..."
    
    # Create Dockerfile if it doesn't exist
    if (-not (Test-Path "Dockerfile")) {
        Write-Status "Creating Dockerfile..."
        @"
# MCP Router Pro - Production Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY server-pro.js ./
COPY mcp-*.js ./
COPY *.json ./

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Start the application
CMD ["node", "server-pro.js"]
"@ | Out-File -FilePath "Dockerfile" -Encoding utf8
        Write-Success "Dockerfile created"
    }
    
    # Login to ACR
    az acr login --name $containerRegistryName
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to login to container registry"
        exit 1
    }
    
    # Build and push image
    $imageName = "$acrLoginServer/mcp-router-pro:latest"
    wsl docker build -t $imageName .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build Docker image"
        exit 1
    }
    
    wsl docker push $imageName
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to push Docker image"
        exit 1
    }
    
    Write-Success "Docker image built and pushed: $imageName"
} else {
    Write-Warning "Skipping Docker build (--SkipBuild specified)"
}

# Step 4: Deploy Infrastructure using Bicep
Write-Status "Deploying infrastructure..."

# Set environment variables for parameter substitution
$env:AZURE_ENV_NAME = $EnvironmentName
$env:AZURE_LOCATION = $Location
$env:AZURE_PRINCIPAL_ID = $principalId

# Deploy main template
$deploymentName = "mcp-router-deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file "infra/main.bicep" `
    --parameters "infra/main.parameters.json" `
    --name $deploymentName `
    --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Error "Infrastructure deployment failed"
    exit 1
}

Write-Success "Infrastructure deployed successfully"

# Step 5: Get deployment outputs
Write-Status "Retrieving deployment outputs..."
$outputs = az deployment group show --resource-group $ResourceGroupName --name $deploymentName --query "properties.outputs" -o json | ConvertFrom-Json

# Display results
Write-Success "Deployment completed successfully!"
Write-Host ""
Write-Host "${Green}🎯 Deployment Results:${Reset}"
Write-Host "  Resource Group: $ResourceGroupName"
Write-Host "  Environment: $EnvironmentName"
Write-Host "  Location: $Location"

if ($outputs.applicationUrl) {
    Write-Host "  Application URL: $($outputs.applicationUrl.value)"
}

if ($outputs.containerAppFqdn) {
    Write-Host "  Container App FQDN: $($outputs.containerAppFqdn.value)"
}

Write-Host ""
Write-Host "${Blue}📊 Next Steps:${Reset}"
Write-Host "  1. Test the deployment:"
Write-Host "     curl https://$($outputs.containerAppFqdn.value)/health"
Write-Host ""
Write-Host "  2. View logs:"
Write-Host "     az containerapp logs show --name `"ca-mcp-router-pro-$resourceToken`" --resource-group `"$ResourceGroupName`""
Write-Host ""
Write-Host "  3. Monitor in Azure Portal:"
Write-Host "     https://portal.azure.com/#@/resource/subscriptions/$subscriptionId/resourceGroups/$ResourceGroupName"
Write-Host ""

# Step 6: Run health check
if ($outputs.applicationUrl) {
    Write-Status "Running health check..."
    Start-Sleep -Seconds 30  # Give the app time to start
    
    try {
        $healthUrl = "$($outputs.applicationUrl.value)/health"
        $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 30
        if ($response.status -eq "healthy") {
            Write-Success "Health check passed! Application is running."
        } else {
            Write-Warning "Health check returned status: $($response.status)"
        }
    } catch {
        Write-Warning "Health check failed. The application may still be starting up."
        Write-Host "  You can check the status later with: curl $healthUrl"
    }
}

Write-Success "Azure deployment completed! 🎉"
