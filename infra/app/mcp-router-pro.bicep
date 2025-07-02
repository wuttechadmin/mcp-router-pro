// MCP Router Pro Container App
@description('Name of the environment that uniquely identifies the resources')
param environmentName string

@description('Azure region for the Container App')
param location string = resourceGroup().location

@description('Resource ID of the Container Apps Environment')
param containerAppsEnvironmentId string

@description('Container Registry login server')
param containerRegistryLoginServer string

@description('Resource ID of the user-assigned managed identity')
param managedIdentityId string

@description('Client ID of the user-assigned managed identity')
param managedIdentityClientId string

@description('Application Insights connection string')
@secure()
param applicationInsightsConnectionString string

@description('Tags to apply to resources')
param tags object = {}

// Container App for MCP Router Pro
resource mcpRouterProApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-mcp-router-pro-${environmentName}'
  location: location
  tags: union(tags, {
    'azd-service-name': 'api'
  })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3001
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: false
        }
      }
      registries: [
        {
          server: containerRegistryLoginServer
          identity: managedIdentityId
        }
      ]
      secrets: [
        {
          name: 'appinsights-connection-string'
          value: applicationInsightsConnectionString
        }
      ]
    }
    template: {
      revisionSuffix: 'initial'
      containers: [
        {
          name: 'mcp-router-pro'
          image: '${containerRegistryLoginServer}/mcp-router-pro:latest'
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3001'
            }
            {
              name: 'MCP_LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'MCP_SECURITY_ENABLED'
              value: 'true'
            }
            {
              name: 'MCP_METRICS_ENABLED'
              value: 'true'
            }
            {
              name: 'MCP_WEBSOCKET_ENABLED'
              value: 'true'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'appinsights-connection-string'
            }
            {
              name: 'AZURE_CLIENT_ID'
              value: managedIdentityClientId
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3001
                scheme: 'HTTP'
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 10
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 3001
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-scale-rule'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
output id string = mcpRouterProApp.id
output name string = mcpRouterProApp.name
output uri string = 'https://${mcpRouterProApp.properties.configuration.ingress.fqdn}'
output fqdn string = mcpRouterProApp.properties.configuration.ingress.fqdn
output imageName string = '${containerRegistryLoginServer}/mcp-router-pro:latest'
