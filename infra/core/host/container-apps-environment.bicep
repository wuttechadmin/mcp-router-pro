// Container Apps Environment for hosting containerized applications
@description('Name of the environment that uniquely identifies the resources')
param environmentName string

@description('Azure region for the Container Apps Environment')
param location string = resourceGroup().location

@description('Resource ID of the Log Analytics workspace')
param logAnalyticsWorkspaceId string

@description('Log Analytics workspace customer ID')
param logAnalyticsWorkspaceCustomerId string

@description('Tags to apply to resources')
param tags object = {}

// Container Apps Environment
resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${environmentName}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspaceCustomerId
        sharedKey: listKeys(logAnalyticsWorkspaceId, '2022-10-01').primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

// Outputs
output containerAppsEnvironmentId string = containerAppsEnvironment.id
output containerAppsEnvironmentName string = containerAppsEnvironment.name
output containerAppsEnvironmentDefaultDomain string = containerAppsEnvironment.properties.defaultDomain
