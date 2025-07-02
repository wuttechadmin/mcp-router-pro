#!/bin/bash
# Azure CI/CD Setup Script for MCP Router Pro
# This script creates the necessary Azure service principal and provides the GitHub secrets

set -e

# Configuration
SUBSCRIPTION_ID="ebba43a1-cc3e-4fbf-929d-8be4528450d4"
RESOURCE_GROUP="rg-mcp-router-staging"
SP_NAME="sp-mcp-router-cicd"

echo "🔧 Setting up Azure CI/CD for MCP Router Pro..."

# Create service principal
echo "📝 Creating service principal..."
SP_OUTPUT=$(az ad sp create-for-rbac \
    --name $SP_NAME \
    --role contributor \
    --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
    --json-auth)

echo "✅ Service principal created successfully!"

# Grant ACR permissions
echo "🐳 Granting ACR permissions..."
az role assignment create \
    --assignee $(echo $SP_OUTPUT | jq -r .clientId) \
    --role AcrPush \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/acreg3nfm2hof7fhw6

echo "✅ ACR permissions granted!"

echo ""
echo "🔑 GitHub Secret Configuration:"
echo "================================"
echo "1. Go to your GitHub repository settings"
echo "2. Navigate to Secrets and variables > Actions"
echo "3. Create a new repository secret named: AZURE_CREDENTIALS"
echo "4. Set the value to the following JSON:"
echo ""
echo "$SP_OUTPUT"
echo ""
echo "🚀 Once configured, push your changes to trigger the CI/CD pipeline!"
echo ""
echo "📋 Pipeline will:"
echo "   • Build Docker image automatically"
echo "   • Push to Azure Container Registry"
echo "   • Deploy to Azure Container Apps"
echo "   • No more manual Docker commands needed!"
