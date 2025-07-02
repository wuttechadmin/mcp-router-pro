# GitHub Repository Setup Script
# Run this after creating your GitHub repository

# Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual GitHub details
$GITHUB_USERNAME = "YOUR_USERNAME"
$REPO_NAME = "mcp-router-pro"  # or your chosen repository name

Write-Host "Setting up GitHub repository connection..." -ForegroundColor Green

# Add the GitHub remote (replace with your actual repository URL)
$remoteUrl = "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
Write-Host "Adding remote: $remoteUrl" -ForegroundColor Yellow

git remote add origin $remoteUrl

# Verify the remote was added
Write-Host "`nRemote repositories:" -ForegroundColor Cyan
git remote -v

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Green
git branch -M main
git push -u origin main

Write-Host "`n✅ Code pushed to GitHub successfully!" -ForegroundColor Green
Write-Host "Next step: Configure GitHub repository secrets for CI/CD" -ForegroundColor Yellow
