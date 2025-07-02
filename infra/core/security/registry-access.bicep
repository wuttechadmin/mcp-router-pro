// Container Registry Access Role Assignment
@description('Resource ID of the Container Registry')
param containerRegistryId string

@description('Principal ID of the managed identity')
param managedIdentityPrincipalId string

// Role Definition ID for AcrPull role
var acrPullRoleDefinitionId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

// Grant AcrPull role to the managed identity for the container registry
resource containerRegistryPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistryId, managedIdentityPrincipalId, acrPullRoleDefinitionId)
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleDefinitionId)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output roleAssignmentId string = containerRegistryPullRoleAssignment.id
