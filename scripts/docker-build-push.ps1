# Docker Build and Push Script for Azure Container Registry
param(
    [string]$RegistryName = "acrmcprouterstaging9704",
    [string]$ImageName = "mcp-router-pro",
    [string]$Tag = "latest"
)

$RegistryServer = "$RegistryName.azurecr.io"
$FullImageName = "$RegistryServer/$ImageName`:$Tag"

Write-Host "🚀 Building Docker image locally via WSL..." -ForegroundColor Green

# Build the Docker image using WSL
Write-Host "Building image: $FullImageName"
$buildResult = wsl docker build -t $FullImageName .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker image built successfully" -ForegroundColor Green

# Get Azure Container Registry credentials
Write-Host "🔐 Getting Azure Container Registry credentials..." -ForegroundColor Green
$acrCreds = az acr credential show --name $RegistryName | ConvertFrom-Json

if (-not $acrCreds) {
    Write-Host "❌ Failed to get ACR credentials" -ForegroundColor Red
    exit 1
}

$username = $acrCreds.username
$password = $acrCreds.passwords[0].value

Write-Host "✅ Got ACR credentials" -ForegroundColor Green

# Login to Docker registry via WSL
Write-Host "🔑 Logging into Azure Container Registry via WSL..." -ForegroundColor Green
$loginResult = wsl docker login $RegistryServer --username $username --password $password

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker login failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Successfully logged into ACR" -ForegroundColor Green

# Push the image
Write-Host "📤 Pushing image to Azure Container Registry..." -ForegroundColor Green
$pushResult = wsl docker push $FullImageName

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Successfully pushed image to ACR" -ForegroundColor Green
Write-Host "Image available at: $FullImageName" -ForegroundColor Yellow

# Verify the image exists in ACR
Write-Host "🔍 Verifying image in Azure Container Registry..." -ForegroundColor Green
$repoList = az acr repository show --name $RegistryName --image "$ImageName`:$Tag" | ConvertFrom-Json

if ($repoList) {
    Write-Host "✅ Image verified in ACR:" -ForegroundColor Green
    Write-Host "  Registry: $($repoList.registry)" -ForegroundColor Gray
    Write-Host "  Repository: $($repoList.name)" -ForegroundColor Gray
    Write-Host "  Tag: $($repoList.tag)" -ForegroundColor Gray
    Write-Host "  Digest: $($repoList.digest)" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Could not verify image in ACR, but push appeared successful" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Docker build and push completed successfully!" -ForegroundColor Green
Write-Host "Ready to deploy Container App using Bicep templates." -ForegroundColor Yellow
