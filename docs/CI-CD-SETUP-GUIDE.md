# 🚀 CI/CD Pipeline Setup Guide

## Quick Start Checklist

### ✅ **Step 1: Create GitHub Repository**
1. Go to [GitHub](https://github.com) and click **"New repository"**
2. Repository name: `mcp-router-pro` (or your preferred name)
3. Description: `Production-ready MCP Router with Azure deployment`
4. Choose **Public** or **Private** 
5. **DON'T** initialize with README (we already have files)
6. Click **"Create repository"**

### ✅ **Step 2: Connect Repository**
Replace `YOUR_USERNAME` in the command below with your GitHub username:

```powershell
# Run this from c:\Development\droid-builder
git remote add origin https://github.com/YOUR_USERNAME/mcp-router-pro.git
git branch -M main
git push -u origin main
```

### ✅ **Step 3: Configure GitHub Secrets**
1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `AZURE_CREDENTIALS`
6. Value: Copy the JSON from `azure-credentials.json` file (not committed to Git for security)

7. Click **Add secret**

## 🎯 **What Happens Next**

### Automatic Deployment Pipeline
Once you push to GitHub and configure secrets, **every push to `main` branch will**:

1. **Build** → Docker image from your code
2. **Push** → Image to Azure Container Registry
3. **Deploy** → Updated app to Azure Container Apps
4. **Health Check** → Verify deployment success

### 🔥 **Test It Now!**
Make a small change to test the pipeline:

```powershell
# Add a test comment to server-pro.js
echo "// CI/CD Pipeline Test - $(Get-Date)" >> server-pro.js
git add server-pro.js
git commit -m "test: CI/CD pipeline verification"
git push
```

Then watch the **Actions** tab in GitHub to see your deployment!

## 📍 **Current Azure Resources**
- **Resource Group**: `mcp-router-rg`  
- **Container App**: `ca-mcp-router-pro`
- **Registry**: `mcprouterpro3nfm2hof7fhw6.azurecr.io`
- **Live URL**: `https://ca-mcp-router-pro-3nfm2hof7fhw6.mangoforest-1a47bbd7.eastus.azurecontainerapps.io`

## 🎉 **Benefits of This Setup**
- ✅ **Zero-downtime deployments**
- ✅ **Automatic health checks** (includes the health endpoint fix!)
- ✅ **Built-in rollback** if deployment fails
- ✅ **Docker image versioning** with Git commit SHAs
- ✅ **Secure credential management** via GitHub secrets
- ✅ **Production monitoring** and logging

---

**🚀 Ready to go! Your MCP Router Pro will have enterprise-grade CI/CD in minutes!**
