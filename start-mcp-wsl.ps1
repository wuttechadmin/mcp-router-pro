#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    Start MCP Stack using WSL Docker

.DESCRIPTION
    Starts the MCP server stack using WSL Docker Compose.
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

try {
    Write-ColoredOutput "Starting MCP Stack via WSL Docker..." $Cyan
    Write-ColoredOutput "====================================" $Cyan
    
    # Check if .env file exists
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Write-ColoredOutput "Creating .env file from template..." $Yellow
            Copy-Item ".env.example" ".env"
            Write-ColoredOutput "[WARN] Please edit .env file with your API keys before continuing" $Yellow
        } else {
            Write-ColoredOutput "[FAIL] Neither .env nor .env.example file found" $Red
            exit 1
        }
    }
    
    # Start services
    Write-ColoredOutput "Starting MCP services..." $Cyan
    Write-ColoredOutput "Command: wsl docker compose up -d --build" $Yellow
    
    $result = wsl docker compose up -d --build 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColoredOutput "[SUCCESS] MCP services started successfully!" $Green
        
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Waiting for services to initialize..." $Yellow
        Start-Sleep -Seconds 10
        
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Service Status:" $Cyan
        wsl docker compose ps
        
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Key Service URLs:" $Cyan
        Write-ColoredOutput "- MCP Router: http://localhost:3001" $Green
        Write-ColoredOutput "- Grafana: http://localhost:3000 (admin/admin)" $Green
        Write-ColoredOutput "- Prometheus: http://localhost:9090" $Green
        Write-ColoredOutput "- Jupyter: http://localhost:8888" $Green
        
        Write-ColoredOutput "" $White
        Write-ColoredOutput "Next steps:" $Cyan
        Write-ColoredOutput "- Check status: .\status-mcp-wsl.ps1" $White
        Write-ColoredOutput "- View logs: wsl docker compose logs" $White
        Write-ColoredOutput "- Open browser: Start-Process 'http://localhost:3000'" $White
        
    } else {
        Write-ColoredOutput "[FAIL] Failed to start MCP services" $Red
        Write-ColoredOutput "Error output:" $Red
        Write-ColoredOutput $result $Red
        exit 1
    }
}
catch {
    Write-ColoredOutput "[ERROR] Exception occurred: $($_.Exception.Message)" $Red
    exit 1
}
