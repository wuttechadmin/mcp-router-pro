#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    WSL Docker MCP Stack Validation Script

.DESCRIPTION
    Validates the MCP server stack configuration using WSL Docker and performs health checks.

.PARAMETER SkipStartup
    Skip starting services and only validate configuration

.PARAMETER Detailed
    Show detailed output for all checks

.EXAMPLE
    .\validate-mcp-stack-wsl.ps1
    
.EXAMPLE
    .\validate-mcp-stack-wsl.ps1 -SkipStartup -Detailed
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

function Test-WSLDockerEnvironment {
    Write-ColoredOutput "Checking WSL Docker Environment..." $Cyan
    
    $dockerOk = $true
    
    # Check WSL
    try {
        $wslVersion = wsl --version 2>$null
        Write-ColoredOutput "  [OK] WSL available" $Green
    }
    catch {
        Write-ColoredOutput "  [FAIL] WSL not found" $Red
        $dockerOk = $false
    }
    
    # Check Docker installation through WSL
    try {
        $dockerVersion = wsl docker --version 2>$null
        Write-ColoredOutput "  [OK] Docker installed: $dockerVersion" $Green
    }
    catch {
        Write-ColoredOutput "  [FAIL] Docker not found through WSL" $Red
        $dockerOk = $false
    }
    
    # Check Docker Compose through WSL
    try {
        $composeVersion = wsl docker compose version 2>$null
        Write-ColoredOutput "  [OK] Docker Compose available: $composeVersion" $Green
    }
    catch {
        Write-ColoredOutput "  [FAIL] Docker Compose not found through WSL" $Red
        $dockerOk = $false
    }
    
    # Check Docker daemon through WSL
    try {
        $dockerInfo = wsl docker info --format "{{.ServerVersion}}" 2>$null
        Write-ColoredOutput "  [OK] Docker daemon running (Server: $dockerInfo)" $Green
    }
    catch {
        Write-ColoredOutput "  [FAIL] Docker daemon not accessible through WSL" $Red
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

function Start-McpStackForTesting {
    Write-ColoredOutput "Starting MCP Stack via WSL Docker..." $Cyan
    
    try {
        # Start services using WSL Docker Compose
        Write-ColoredOutput "  Running: wsl docker compose up -d --build" $Yellow
        $result = wsl docker compose up -d --build 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColoredOutput "  [OK] MCP stack started successfully" $Green
            
            # Wait for services to initialize
            Write-ColoredOutput "  Waiting for services to initialize..." $Yellow
            Start-Sleep -Seconds 15
            
            return $true
        }
        else {
            Write-ColoredOutput "  [FAIL] Failed to start MCP stack" $Red
            Write-ColoredOutput "  Error: $result" $Red
            return $false
        }
    }
    catch {
        Write-ColoredOutput "  [FAIL] Error starting MCP stack: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-ServiceHealth {
    Write-ColoredOutput "Checking Service Health..." $Cyan
    
    $healthChecks = @(
        @{ Name = "MCP Router"; Url = "http://localhost:3001/health"; Timeout = 5 },
        @{ Name = "Prometheus"; Url = "http://localhost:9090/-/healthy"; Timeout = 5 },
        @{ Name = "Grafana"; Url = "http://localhost:3000/api/health"; Timeout = 10 }
    )
    
    $allHealthy = $true
    
    foreach ($check in $healthChecks) {
        try {
            $response = Invoke-RestMethod -Uri $check.Url -Method Get -TimeoutSec $check.Timeout -ErrorAction Stop
            Write-ColoredOutput "  [OK] $($check.Name): Healthy" $Green
            
            if ($Detailed -and $response) {
                $responseJson = $response | ConvertTo-Json -Depth 2
                Write-ColoredOutput "    Response: $responseJson" $White
            }
        }
        catch {
            Write-ColoredOutput "  [FAIL] $($check.Name): Unhealthy ($($_.Exception.Message))" $Red
            $allHealthy = $false
        }
    }
    
    # Test PostgreSQL connection through WSL
    try {
        $pgResult = wsl docker compose exec -T postgres pg_isready -h localhost -p 5432 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColoredOutput "  [OK] PostgreSQL: Healthy" $Green
        }
        else {
            Write-ColoredOutput "  [FAIL] PostgreSQL: Unhealthy" $Red
            $allHealthy = $false
        }
    }
    catch {
        Write-ColoredOutput "  [WARN] PostgreSQL: Could not test (service may not be started)" $Yellow
    }
    
    return $allHealthy
}

function Get-McpServiceStatus {
    Write-ColoredOutput "MCP Services Status via WSL:" $Cyan
    
    try {
        Write-ColoredOutput "Running: wsl docker compose ps" $Yellow
        $result = wsl docker compose ps --format json 2>$null
        
        if ($result -and $result -ne "[]") {
            $services = $result | ConvertFrom-Json
            
            foreach ($service in $services) {
                $statusIcon = switch ($service.State) {
                    "running" { "[OK]" }
                    "exited" { "[FAIL]" }
                    "restarting" { "[WARN]" }
                    default { "[WARN]" }
                }
                
                $statusColor = switch ($service.State) {
                    "running" { $Green }
                    "exited" { $Red }
                    "restarting" { $Yellow }
                    default { $Yellow }
                }
                
                $ports = if ($service.Ports) { " ($($service.Ports))" } else { "" }
                Write-ColoredOutput "  $statusIcon $($service.Names): $($service.State)$ports" $statusColor
            }
            
            # Show key service endpoints
            Write-ColoredOutput "" $White
            Write-ColoredOutput "Key Service Endpoints:" $Cyan
            Write-ColoredOutput "  - MCP Router: http://localhost:3001" $White
            Write-ColoredOutput "  - Prometheus: http://localhost:9090" $White
            Write-ColoredOutput "  - Grafana: http://localhost:3000 (admin/admin)" $White
            Write-ColoredOutput "  - Jupyter: http://localhost:8888" $White
            Write-ColoredOutput "  - PostgreSQL: localhost:5432" $White
        } else {
            Write-ColoredOutput "  [INFO] No MCP services are currently running" $Yellow
            Write-ColoredOutput "  Use: .\start-mcp-wsl.ps1 to start services" $Cyan
        }
    }
    catch {
        Write-ColoredOutput "  [FAIL] Error getting MCP service status: $($_.Exception.Message)" $Red
    }
}

# Main validation logic
try {
    Write-ColoredOutput "WSL Docker MCP Stack Validation" $Cyan
    Write-ColoredOutput "===============================" $Cyan
    
    # Pre-startup checks
    $dockerOk = Test-WSLDockerEnvironment
    $configOk = Test-ConfigurationFiles
    
    if (-not $SkipStartup -and $dockerOk -and $configOk) {
        $servicesOk = Start-McpStackForTesting
        
        if ($servicesOk) {
            $healthOk = Test-ServiceHealth
            Get-McpServiceStatus
        }
    }
    elseif ($SkipStartup) {
        Write-ColoredOutput "Skipping service startup - checking current status" $Yellow
        Get-McpServiceStatus
    }
    
    Write-ColoredOutput "" $White
    Write-ColoredOutput "Validation Complete" $Cyan
    Write-ColoredOutput "==================" $Cyan
    
    if ($dockerOk -and $configOk) {
        Write-ColoredOutput "[SUCCESS] Environment is ready for MCP services!" $Green
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Next steps:" $Cyan
        Write-ColoredOutput "- Start services: .\start-mcp-wsl.ps1" $White
        Write-ColoredOutput "- Check status: .\status-mcp-wsl.ps1" $White
        Write-ColoredOutput "- View logs: wsl docker compose logs" $White
        exit 0
    }
    else {
        Write-ColoredOutput "[WARNING] Some issues found. Please review above." $Yellow
        exit 1
    }
}
catch {
    Write-ColoredOutput "ERROR: Validation error: $($_.Exception.Message)" $Red
    exit 1
}
