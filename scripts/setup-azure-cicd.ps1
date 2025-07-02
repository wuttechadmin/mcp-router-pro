# Azure CI/CD Setup Script for MCP Router Pro (PowerShell)
# This script creates the necessary Azure service principal and provides the GitHub secrets

param(
    [string]$SubscriptionId = "ebba43a1-cc3e-4fbf-929d-8be4528450d4",
    [string]$ResourceGroup = "rg-mcp-router-staging",
    [string]$ServicePrincipalName = "sp-mcp-router-cicd"
)

Write-Host "🔧 Setting up Azure CI/CD for MCP Router Pro..." -ForegroundColor Cyan

try {
    # Create service principal
    Write-Host "📝 Creating service principal..." -ForegroundColor Yellow
    $spOutput = az ad sp create-for-rbac `
        --name $ServicePrincipalName `
        --role contributor `
        --scopes "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup" `
        --json-auth | ConvertFrom-Json

    Write-Host "✅ Service principal created successfully!" -ForegroundColor Green

    # Grant ACR permissions
    Write-Host "🐳 Granting ACR permissions..." -ForegroundColor Yellow
    az role assignment create `
        --assignee $spOutput.clientId `
        --role AcrPush `
        --scope "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.ContainerRegistry/registries/acreg3nfm2hof7fhw6"

    Write-Host "✅ ACR permissions granted!" -ForegroundColor Green

    Write-Host ""
    Write-Host "🔑 GitHub Secret Configuration:" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "1. Go to your GitHub repository settings"
    Write-Host "2. Navigate to Secrets and variables > Actions"
    Write-Host "3. Create a new repository secret named: AZURE_CREDENTIALS"
    Write-Host "4. Set the value to the following JSON:"
    Write-Host ""
    
    # Convert back to JSON for display
    $jsonOutput = $spOutput | ConvertTo-Json -Depth 10
    Write-Host $jsonOutput -ForegroundColor White
    
    Write-Host ""
    Write-Host "🚀 Once configured, push your changes to trigger the CI/CD pipeline!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Pipeline will:" -ForegroundColor Cyan
    Write-Host "   • Build Docker image automatically"
    Write-Host "   • Push to Azure Container Registry" 
    Write-Host "   • Deploy to Azure Container Apps"
    Write-Host "   • No more manual Docker commands needed!"

} catch {
    Write-Host "❌ Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
