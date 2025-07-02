# 🚀 Azure Deployment Guide for MCP Router Pro

## Prerequisites (After New Terminal)

1. **Verify Azure CLI is available**:
   ```powershell
   az --version
   ```

2. **Login to Azure**:
   ```powershell
   az login
   ```

3. **Verify Docker via WSL**:
   ```powershell
   wsl docker --version
   ```

## Quick Deployment

### Option 1: Automated Deployment Script
```powershell
# Run the automated deployment script
.\azure-deploy.ps1 -EnvironmentName "dev" -Location "eastus"
```

### Option 2: Manual Step-by-Step

1. **Create Resource Group**:
   ```powershell
   az group create --name "rg-mcp-router-dev" --location "eastus"
   ```

2. **Create Container Registry**:
   ```powershell
   $acrName = "acrmcprouterdev$(Get-Random -Maximum 9999)"
   az acr create --resource-group "rg-mcp-router-dev" --name $acrName --sku Basic
   ```

3. **Build and Push Image**:
   ```powershell
   # Login to ACR
   az acr login --name $acrName
   
   # Get ACR login server
   $acrServer = az acr show --name $acrName --query "loginServer" -o tsv
   
   # Build and push
   wsl docker build -t "$acrServer/mcp-router-pro:latest" .
   wsl docker push "$acrServer/mcp-router-pro:latest"
   ```

4. **Deploy Infrastructure**:
   ```powershell
   # Set environment variables
   $env:AZURE_ENV_NAME = "dev"
   $env:AZURE_LOCATION = "eastus"
   $env:AZURE_PRINCIPAL_ID = (az ad signed-in-user show --query "id" -o tsv)
   
   # Deploy
   az deployment group create `
     --resource-group "rg-mcp-router-dev" `
     --template-file "infra/main.bicep" `
     --parameters "infra/main.parameters.json"
   ```

## Testing the Deployment

1. **Get the application URL**:
   ```powershell
   $appUrl = az containerapp show --name "ca-mcp-router-pro-dev" --resource-group "rg-mcp-router-dev" --query "properties.configuration.ingress.fqdn" -o tsv
   ```

2. **Test health endpoint**:
   ```powershell
   curl "https://$appUrl/health"
   ```

3. **Test MCP endpoints**:
   ```powershell
   # Test tools list
   curl -X POST "https://$appUrl/api/mcp/jsonrpc" `
     -H "Content-Type: application/json" `
     -d '{"jsonrpc":"2.0","method":"tools/list","id":"test"}'
   ```

## Monitoring

1. **View logs**:
   ```powershell
   az containerapp logs show --name "ca-mcp-router-pro-dev" --resource-group "rg-mcp-router-dev"
   ```

2. **Check health**:
   ```powershell
   node production-monitor.js --target "https://$appUrl"
   ```

## What's Been Prepared

✅ **Bicep Templates Updated**: Fixed to use MCP Router Pro container and correct ports  
✅ **Deployment Script**: Automated PowerShell script for full deployment  
✅ **Infrastructure**: Container Apps, Container Registry, Log Analytics, App Insights  
✅ **Security**: Managed Identity, Key Vault integration  
✅ **Monitoring**: Application Insights, health checks, scaling rules  

## Files Ready for Deployment

- `infra/main.bicep` - Main infrastructure template
- `infra/app/mcp-router-pro.bicep` - Container App configuration
- `infra/main.parameters.json` - Deployment parameters
- `azure-deploy.ps1` - Automated deployment script
- `Dockerfile` - Will be auto-generated if needed

## Next Steps

**Once you open a new PowerShell terminal:**

1. Navigate to the project directory
2. Run `az --version` to verify Azure CLI
3. Execute the deployment script or manual commands above
4. Test the deployed application

The infrastructure is configured for production with:
- Auto-scaling (1-3 replicas)
- Health checks and probes
- Application Insights monitoring
- Secure managed identity authentication
- CORS policy for web access
