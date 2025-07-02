#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    Test MCP Integration

.DESCRIPTION
    Simple test script to verify MCP integration is working correctly.
#>

# Colors for output
[string]$Green = "Green"
[string]$Yellow = "Yellow"
[string]$Red = "Red"
[string]$Cyan = "Cyan"

function Write-ColoredOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    if ([string]::IsNullOrEmpty($Color)) {
        $Color = "White"
    }
    
    $validColors = @("Black", "DarkBlue", "DarkGreen", "DarkCyan", "DarkRed", "DarkMagenta", "DarkYellow", "Gray", "DarkGray", "Blue", "Green", "Cyan", "Red", "Magenta", "Yellow", "White")
    if ($Color -notin $validColors) {
        $Color = "White"
    }
    
    Write-Host $Message -ForegroundColor $Color
}

function Test-McpIntegration {
    Write-ColoredOutput "Testing MCP Integration..." $Cyan
    Write-ColoredOutput "=========================" $Cyan
    
    # Test 1: Check if key files exist
    Write-ColoredOutput "Test 1: Checking core files..." $Cyan
    $coreFiles = @(
        "docker-compose.yml",
        ".env.example", 
        "mcp-config/mcp-router.json",
        "validate-mcp-stack.ps1",
        "MCP-SETUP-GUIDE.md",
        "MCP-INTEGRATION-COMPLETE.md"
    )
    
    $filesOk = $true
    foreach ($file in $coreFiles) {
        if (Test-Path $file) {
            Write-ColoredOutput "  [OK] $file" $Green
        } else {
            Write-ColoredOutput "  [FAIL] $file" $Red
            $filesOk = $false
        }
    }
    
    # Test 2: Check directory structure
    Write-ColoredOutput "`nTest 2: Checking directory structure..." $Cyan
    $mcpDirs = @(
        "mcp-config",
        "mcp-data", 
        "workspace"
    )
    
    $dirsOk = $true
    foreach ($dir in $mcpDirs) {
        if (Test-Path $dir -PathType Container) {
            Write-ColoredOutput "  [OK] $dir/" $Green
        } else {
            Write-ColoredOutput "  [FAIL] $dir/" $Red
            $dirsOk = $false
        }
    }
    
    # Test 3: Check Docker Compose configuration
    Write-ColoredOutput "`nTest 3: Validating Docker Compose..." $Cyan
    if (Test-Path "docker-compose.yml") {
        try {
            $composeContent = Get-Content "docker-compose.yml" -Raw
            $serviceCount = ($composeContent | Select-String "^\s*[a-zA-Z-]+:" | Measure-Object).Count - 1 # Subtract 1 for "services:"
            Write-ColoredOutput "  [OK] Docker Compose file contains $serviceCount services" $Green
            
            # Check for key MCP services
            $keyServices = @("mcp-router", "postgres", "prometheus", "grafana")
            foreach ($service in $keyServices) {
                if ($composeContent -match $service) {
                    Write-ColoredOutput "  [OK] Service '$service' configured" $Green
                } else {
                    Write-ColoredOutput "  [WARN] Service '$service' not found" $Yellow
                }
            }
        }
        catch {
            Write-ColoredOutput "  [FAIL] Could not parse docker-compose.yml" $Red
        }
    }
    
    # Test 4: Check environment template
    Write-ColoredOutput "`nTest 4: Checking environment template..." $Cyan 
    if (Test-Path ".env.example") {
        $envContent = Get-Content ".env.example"
        $envVars = $envContent | Where-Object { $_ -match "^[A-Z_]+=.*" }
        Write-ColoredOutput "  [OK] .env.example contains $($envVars.Count) environment variables" $Green
        
        # Check for key variables
        $keyVars = @("GITHUB_TOKEN", "POSTGRES_PASSWORD", "MCP_ROUTER_PORT")
        foreach ($var in $keyVars) {
            if ($envContent -match "^$var=") {
                Write-ColoredOutput "  [OK] Variable '$var' defined" $Green
            } else {
                Write-ColoredOutput "  [WARN] Variable '$var' not found" $Yellow
            }
        }
    }
    
    # Summary
    Write-ColoredOutput "`nMCP Integration Test Summary" $Cyan
    Write-ColoredOutput "============================" $Cyan
    
    if ($filesOk -and $dirsOk) {
        Write-ColoredOutput "[SUCCESS] MCP integration appears to be complete!" $Green
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Next steps:" $Cyan
        Write-ColoredOutput "1. Install Docker Desktop if not already installed" $White
        Write-ColoredOutput "2. Copy .env.example to .env and configure your API keys" $White
        Write-ColoredOutput "3. Run: .\validate-mcp-stack.ps1 -SkipStartup" $White
        Write-ColoredOutput "4. Run: .\manage-services.ps1 -Action mcp-start" $White
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Documentation:" $Cyan
        Write-ColoredOutput "- Setup Guide: MCP-SETUP-GUIDE.md" $White
        Write-ColoredOutput "- Integration Summary: MCP-INTEGRATION-COMPLETE.md" $White
        return $true
    } else {
        Write-ColoredOutput "[FAILURE] MCP integration is incomplete" $Red
        Write-ColoredOutput "Please check the missing files and directories above." $Yellow
        return $false
    }
}

# Run the test
try {
    $result = Test-McpIntegration
    if ($result) {
        exit 0
    } else {
        exit 1
    }
}
catch {
    Write-ColoredOutput "Error during MCP integration test: $($_.Exception.Message)" $Red
    exit 1
}
