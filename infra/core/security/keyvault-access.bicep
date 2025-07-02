// Key Vault Access Role Assignment
@description('Resource ID of the Key Vault')
param keyVaultId string

@description('Principal ID of the managed identity')
param managedIdentityPrincipalId string

// Role Definition ID for Key Vault Secrets User role
var keyVaultSecretsUserRoleDefinitionId = '4633458b-17de-408a-b874-0445c86b69e6'

// Grant Key Vault Secrets User role to the managed identity
resource keyVaultSecretsRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultId, managedIdentityPrincipalId, keyVaultSecretsUserRoleDefinitionId)
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleDefinitionId)
    principalId: managedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output roleAssignmentId string = keyVaultSecretsRoleAssignment.id
