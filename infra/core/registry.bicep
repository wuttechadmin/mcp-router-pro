// Azure Container Registry for container images
@description('Name of the environment that uniquely identifies the resources')
param environmentName string

@description('Azure region for the Container Registry')
param location string = resourceGroup().location

@description('Tags to apply to resources')
param tags object = {}

// Container Registry for storing container images
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: 'acreg${environmentName}'
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
    zoneRedundancy: 'Disabled'
    anonymousPullEnabled: false
    dataEndpointEnabled: false
    networkRuleBypassOptions: 'AzureServices'
  }
}

// Outputs
output containerRegistryId string = containerRegistry.id
output containerRegistryName string = containerRegistry.name
output containerRegistryEndpoint string = containerRegistry.properties.loginServer
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
