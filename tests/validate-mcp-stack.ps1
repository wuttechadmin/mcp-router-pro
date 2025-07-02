#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    MCP Stack Validation Script

.DESCRIPTION
    Validates the MCP server stack configuration and performs health checks.

.PARAMETER SkipStartup
    Skip starting services and only validate configuration

.PARAMETER Detailed
    Show detailed output for all checks

.EXAMPLE
    .\validate-mcp-stack.ps1
    
.EXAMPLE
    .\validate-mcp-stack.ps1 -SkipStartup -Detailed
#>

param(
    [switch]$SkipStartup,
    [switch]$Detailed
)

# Colors for output
[string]$Green = "Green"
[string]$Yellow = "Yellow"
[string]$Red = "Red"
[string]$Cyan = "Cyan"
[string]$White = "White"

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

function Test-DockerEnvironment {
    Write-ColoredOutput "Checking Docker Environment..." $Cyan
    
    $dockerOk = $true
    
    # Check Docker installation
    try {
        $dockerVersion = docker --version 2>$null
        Write-ColoredOutput "  [OK] Docker installed: $dockerVersion" $Green
    }
    catch {
        Write-ColoredOutput "  [FAIL] Docker not found or not running" $Red
        $dockerOk = $false
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker compose version 2>$null
        Write-ColoredOutput "  [OK] Docker Compose available: $composeVersion" $Green
    }
    catch {
        try {
            $composeVersion = docker-compose --version 2>$null
            Write-ColoredOutput "  [OK] Docker Compose (legacy) available: $composeVersion" $Green
        }
        catch {
            Write-ColoredOutput "  [FAIL] Docker Compose not found" $Red
            $dockerOk = $false
        }
    }
    
    # Check Docker daemon
    try {
        $dockerInfo = docker info --format "{{.ServerVersion}}" 2>$null
        Write-ColoredOutput "  [OK] Docker daemon running (Server: $dockerInfo)" $Green
    }
    catch {
        Write-ColoredOutput "  [FAIL] Docker daemon not accessible" $Red
        $dockerOk = $false
    }
    
    return $dockerOk
}

function Test-ConfigurationFiles {
    Write-ColoredOutput "Checking Configuration Files..." $Cyan
    
    $configOk = $true
    $requiredFiles = @(
        "docker-compose.yml",
        ".env.example",
        "mcp-config/mcp-router.json",
        "mcp-config/postgres/init.sql",
        "mcp-config/openapi/config.yaml"
    )
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-ColoredOutput "  [OK] Found: $file" $Green
        }
        else {
            Write-ColoredOutput "  [FAIL] Missing: $file" $Red
            $configOk = $false
        }
    }
    
    # Check .env file
    if (Test-Path ".env") {
        Write-ColoredOutput "  [OK] Found: .env" $Green
        
        if ($Detailed) {
            $envContent = Get-Content ".env" | Where-Object { $_ -match "^[A-Z_]+=.+" }
            Write-ColoredOutput "    Environment variables configured: $($envContent.Count)" $White
        }
    }
    else {
        Write-ColoredOutput "  [WARN] .env file not found (using .env.example)" $Yellow
    }
    
    return $configOk
}

function Test-DirectoryStructure {
    Write-ColoredOutput "Checking Directory Structure..." $Cyan
    
    $requiredDirs = @(
        "mcp-config",
        "mcp-config/postgres", 
        "mcp-config/openapi",
        "mcp-data",
        "mcp-data/postgres",
        "mcp-data/sqlite", 
        "mcp-data/jupyter",
        "mcp-data/prometheus",
        "workspace",
        "workspace/notebooks",
        "workspace/projects"
    )
    
    $dirOk = $true
    foreach ($dir in $requiredDirs) {
        if (Test-Path $dir -PathType Container) {
            Write-ColoredOutput "  [OK] Directory exists: $dir" $Green
        }
        else {
            Write-ColoredOutput "  [FAIL] Missing directory: $dir" $Red
            $dirOk = $false
        }
    }
    
    return $dirOk
}

function Test-PortAvailability {
    Write-ColoredOutput "Checking Port Availability..." $Cyan
    
    $requiredPorts = @(3001, 3000, 5432, 8888, 9090)
    $portsOk = $true
    
    foreach ($port in $requiredPorts) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $connect = $tcpClient.BeginConnect("localhost", $port, $null, $null)
            $wait = $connect.AsyncWaitHandle.WaitOne(1000, $false)
            
            if ($wait) {
                try {
                    $tcpClient.EndConnect($connect)
                    Write-ColoredOutput "  [WARN] Port $port is in use" $Yellow
                }
                catch {
                    Write-ColoredOutput "  [OK] Port $port is available" $Green
                }
                $tcpClient.Close()
            }
            else {
                Write-ColoredOutput "  [OK] Port $port is available" $Green
                $tcpClient.Close()
            }
        }
        catch {
            Write-ColoredOutput "  [OK] Port $port is available" $Green
        }
    }
    
    return $portsOk
}

function Get-ValidationSummary {
    param(
        [bool]$DockerOk,
        [bool]$ConfigOk,
        [bool]$DirsOk,
        [bool]$PortsOk
    )
    
    Write-ColoredOutput "" $White
    Write-ColoredOutput "Validation Summary" $Cyan
    Write-ColoredOutput "===================" $Cyan
    
    $checks = @(
        @{ Name = "Docker Environment"; Status = $DockerOk },
        @{ Name = "Configuration Files"; Status = $ConfigOk },
        @{ Name = "Directory Structure"; Status = $DirsOk },
        @{ Name = "Port Availability"; Status = $PortsOk }
    )
    
    $passedChecks = 0
    $totalChecks = $checks.Count
    
    foreach ($check in $checks) {
        $icon = if ($check.Status) { "[OK]" } else { "[FAIL]" }
        $color = if ($check.Status) { $Green } else { $Red }
        Write-ColoredOutput "$icon $($check.Name)" $color
        if ($check.Status) { $passedChecks++ }
    }
    
    Write-ColoredOutput "" $White
    Write-ColoredOutput "Results: $passedChecks/$totalChecks checks passed" $Cyan
    
    if ($passedChecks -eq $totalChecks) {
        Write-ColoredOutput "SUCCESS: All validation checks passed! MCP stack is ready." $Green
        return $true
    }
    else {
        Write-ColoredOutput "WARNING: Some validation checks failed. Please review the issues above." $Yellow
        return $false
    }
}

# Main validation logic
try {
    Write-ColoredOutput "MCP Stack Validation" $Cyan
    Write-ColoredOutput "=======================" $Cyan
    
    # Pre-startup checks
    $dockerOk = Test-DockerEnvironment
    $configOk = Test-ConfigurationFiles
    $dirsOk = Test-DirectoryStructure
    $portsOk = Test-PortAvailability
    
    if ($SkipStartup) {
        Write-ColoredOutput "Skipping service startup and health checks" $Yellow
    }
    
    # Summary
    $allOk = Get-ValidationSummary -DockerOk $dockerOk -ConfigOk $configOk -DirsOk $dirsOk -PortsOk $portsOk
    
    if ($allOk) {
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Next Steps:" $Cyan
        Write-ColoredOutput "- Start all services: .\manage-services.ps1 -Action start -Service all" $White
        Write-ColoredOutput "- Check MCP status: .\manage-services.ps1 -Action mcp-status" $White
        Write-ColoredOutput "- Access Grafana: http://localhost:3000 (admin/admin)" $White
        Write-ColoredOutput "- Access Jupyter: http://localhost:8888" $White
        exit 0
    }
    else {
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Recommended Actions:" $Cyan
        Write-ColoredOutput "- Review the MCP Setup Guide: MCP-SETUP-GUIDE.md" $White
        Write-ColoredOutput "- Check Docker installation and configuration" $White
        Write-ColoredOutput "- Verify all required files are present" $White
        Write-ColoredOutput "- Ensure ports are available" $White
        exit 1
    }
}
catch {
    Write-ColoredOutput "ERROR: Validation error: $($_.Exception.Message)" $Red
    exit 1
}
