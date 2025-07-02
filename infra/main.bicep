// Main template for MCP Router Pro Azure deployment
targetScope = 'resourceGroup'

@description('Name of the environment that uniquely identifies the resources')
param environmentName string

@description('Azure region where the resources will be created')
param location string = resourceGroup().location

@description('The principal ID of the user or service principal to grant access')
param principalId string

// Resource naming configuration
var resourceToken = toLower(uniqueString(subscription().id, resourceGroup().id, environmentName))
var tags = {
  'azd-env-name': environmentName
}

// Log Analytics Workspace for monitoring
module logAnalytics 'core/logs.bicep' = {
  name: 'logs'
  params: {
    environmentName: resourceToken
    location: location
    tags: tags
  }
}

// Application Insights for application monitoring
module applicationInsights 'core/insights.bicep' = {
  name: 'insights'
  params: {
    environmentName: resourceToken
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.logAnalyticsWorkspaceId
    tags: tags
  }
}

// Key Vault for secure configuration
module keyVault 'core/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    environmentName: resourceToken
    location: location
    principalId: principalId
    tags: tags
  }
}

// Container Registry for container images
module containerRegistry 'core/registry.bicep' = {
  name: 'registry'
  params: {
    environmentName: resourceToken
    location: location
    tags: tags
  }
}

// User-assigned Managed Identity
module managedIdentity 'core/identity.bicep' = {
  name: 'identity'
  params: {
    environmentName: resourceToken
    location: location
    tags: tags
  }
}

// Container Apps Environment
module containerAppsEnvironment 'core/host/container-apps-environment.bicep' = {
  name: 'container-apps-env'
  params: {
    environmentName: resourceToken
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.logAnalyticsWorkspaceId
    logAnalyticsWorkspaceCustomerId: logAnalytics.outputs.logAnalyticsWorkspaceCustomerId
    tags: tags
  }
}

// MCP Router Pro Container App
module mcpRouterPro 'app/mcp-router-pro.bicep' = {
  name: 'mcp-router-pro'
  params: {
    environmentName: resourceToken
    location: location
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.containerAppsEnvironmentId
    containerRegistryLoginServer: containerRegistry.outputs.containerRegistryLoginServer
    managedIdentityId: managedIdentity.outputs.managedIdentityId
    managedIdentityClientId: managedIdentity.outputs.managedIdentityClientId
    applicationInsightsConnectionString: applicationInsights.outputs.applicationInsightsConnectionString
    tags: tags
  }
}

// Security: Container Registry Access
module containerRegistryAccess 'core/security/registry-access.bicep' = {
  name: 'registry-access'
  params: {
    containerRegistryId: containerRegistry.outputs.containerRegistryId
    managedIdentityPrincipalId: managedIdentity.outputs.managedIdentityPrincipalId
  }
}

// Security: Key Vault Access
module keyVaultAccess 'core/security/keyvault-access.bicep' = {
  name: 'keyvault-access'
  params: {
    keyVaultId: keyVault.outputs.keyVaultId
    managedIdentityPrincipalId: managedIdentity.outputs.managedIdentityPrincipalId
  }
}

// Outputs
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = subscription().tenantId
output AZURE_SUBSCRIPTION_ID string = subscription().subscriptionId
output RESOURCE_GROUP_ID string = resourceGroup().id

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.containerRegistryEndpoint
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.outputs.containerRegistryName
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = containerAppsEnvironment.outputs.containerAppsEnvironmentId
output AZURE_CONTAINER_APPS_ENVIRONMENT_DEFAULT_DOMAIN string = containerAppsEnvironment.outputs.containerAppsEnvironmentDefaultDomain
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.keyVaultName
output AZURE_KEY_VAULT_ENDPOINT string = keyVault.outputs.keyVaultEndpoint
output APPLICATION_INSIGHTS_CONNECTION_STRING string = applicationInsights.outputs.applicationInsightsConnectionString
output MCP_ROUTER_PRO_URI string = mcpRouterPro.outputs.uri
output MCP_ROUTER_PRO_IMAGE_NAME string = mcpRouterPro.outputs.imageName
