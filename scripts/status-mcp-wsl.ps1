#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    Check MCP Stack Status using WSL Docker

.DESCRIPTION
    Shows the status of MCP services running via WSL Docker.
#>

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

function Test-ServiceEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Timeout = 5
    )
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec $Timeout -ErrorAction Stop
        Write-ColoredOutput "  [OK] $Name - Responding" $Green
        return $true
    }
    catch {
        Write-ColoredOutput "  [FAIL] $Name - Not responding" $Red
        return $false
    }
}

try {
    Write-ColoredOutput "MCP Stack Status (WSL Docker)" $Cyan
    Write-ColoredOutput "=============================" $Cyan
    
    # Check Docker containers
    Write-ColoredOutput "" $White
    Write-ColoredOutput "Container Status:" $Cyan
    $containerResult = wsl docker compose ps 2>$null
    
    if ($LASTEXITCODE -eq 0 -and $containerResult) {
        Write-ColoredOutput $containerResult $White
    } else {
        Write-ColoredOutput "  [INFO] No containers running or docker compose not available" $Yellow
    }
    
    # Check service endpoints
    Write-ColoredOutput "" $White
    Write-ColoredOutput "Service Health Checks:" $Cyan
    
    $endpoints = @(
        @{ Name = "MCP Router"; Url = "http://localhost:3001/health" },
        @{ Name = "Grafana"; Url = "http://localhost:3000/api/health" },
        @{ Name = "Prometheus"; Url = "http://localhost:9090/-/healthy" }
    )
    
    $healthyCount = 0
    foreach ($endpoint in $endpoints) {
        if (Test-ServiceEndpoint -Name $endpoint.Name -Url $endpoint.Url) {
            $healthyCount++
        }
    }
    
    # Test basic connectivity to ports
    Write-ColoredOutput "" $White
    Write-ColoredOutput "Port Connectivity:" $Cyan
    
    $ports = @(3001, 3000, 9090, 8888, 5432)
    foreach ($port in $ports) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $connect = $tcpClient.BeginConnect("localhost", $port, $null, $null)
            $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
            
            if ($wait) {
                try {
                    $tcpClient.EndConnect($connect)
                    Write-ColoredOutput "  [OK] Port $port - Open" $Green
                }
                catch {
                    Write-ColoredOutput "  [FAIL] Port $port - Closed" $Red
                }
                $tcpClient.Close()
            }
            else {
                Write-ColoredOutput "  [FAIL] Port $port - Timeout" $Red
                $tcpClient.Close()
            }
        }
        catch {
            Write-ColoredOutput "  [FAIL] Port $port - Error" $Red
        }
    }
    
    # Summary
    Write-ColoredOutput "" $White
    Write-ColoredOutput "Summary:" $Cyan
    if ($healthyCount -gt 0) {
        Write-ColoredOutput "  [SUCCESS] $healthyCount/$($endpoints.Count) services responding" $Green
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Access URLs:" $Cyan
        Write-ColoredOutput "  - Grafana Dashboard: http://localhost:3000 (admin/admin)" $Green
        Write-ColoredOutput "  - Prometheus Metrics: http://localhost:9090" $Green  
        Write-ColoredOutput "  - MCP Router: http://localhost:3001" $Green
        Write-ColoredOutput "  - Jupyter Notebooks: http://localhost:8888" $Green
    } else {
        Write-ColoredOutput "  [WARNING] No services are responding to health checks" $Yellow
        Write-ColoredOutput "  Try starting services: .\start-mcp-wsl.ps1" $Cyan
    }
    
    Write-ColoredOutput "" $White
    Write-ColoredOutput "Commands:" $Cyan
    Write-ColoredOutput "  - Start: .\start-mcp-wsl.ps1" $White
    Write-ColoredOutput "  - Logs: wsl docker compose logs" $White
    Write-ColoredOutput "  - Stop: wsl docker compose down" $White
}
catch {
    Write-ColoredOutput "[ERROR] Exception occurred: $($_.Exception.Message)" $Red
    exit 1
}
