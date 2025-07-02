// User-assigned Managed Identity for secure access
@description('Name of the environment that uniquely identifies the resources')
param environmentName string

@description('Azure region for the Managed Identity')
param location string = resourceGroup().location

@description('Tags to apply to resources')
param tags object = {}

// User-assigned Managed Identity for the application
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-${environmentName}'
  location: location
  tags: tags
}

// Outputs
output managedIdentityId string = managedIdentity.id
output managedIdentityName string = managedIdentity.name
output managedIdentityPrincipalId string = managedIdentity.properties.principalId
output managedIdentityClientId string = managedIdentity.properties.clientId
