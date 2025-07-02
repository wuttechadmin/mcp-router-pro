#Requires -Version 5.1

<#
.SYNOPSIS
    Droid Builder Service Manager

.DESCRIPTION
    Utility script for managing Ollama, OpenWebUI, MCP servers, and other AI development services.

.PARAMETER Action
    The action to perform: 
    - start, stop, restart, status (for all services)
    - install-models, install-ollama (for Ollama)
    - mcp-start, mcp-stop, mcp-restart, mcp-status, mcp-logs (for MCP services)

.PARAMETER Service
    The specific service to manage: ollama, openwebui, mcp, all

.PARAMETER Models
    List of models to install (only used with install-models action)

.EXAMPLE
    .\manage-services.ps1 -Action start -Service all
    
.EXAMPLE
    .\manage-services.ps1 -Action mcp-start
    
.EXAMPLE
    .\manage-services.ps1 -Action mcp-status
    
.EXAMPLE
    .\manage-services.ps1 -Action mcp-logs
    
.EXAMPLE
    .\manage-services.ps1 -Action install-models -Models @("llama2", "codellama")
    
.EXAMPLE
    .\manage-services.ps1 -Action status

.EXAMPLE
    .\manage-services.ps1 -Action install-ollama
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "install-models", "install-ollama", "mcp-start", "mcp-stop", "mcp-restart", "mcp-status", "mcp-logs")]
    [string]$Action,
    
    [ValidateSet("ollama", "openwebui", "mcp", "all")]
    [string]$Service = "all",
    
    [string[]]$Models = @()
)

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
    
    # Ensure Color is not empty and is a valid color
    if ([string]::IsNullOrEmpty($Color)) {
        $Color = "White"
    }
    
    # Validate that Color is a valid ConsoleColor
    $validColors = @("Black", "DarkBlue", "DarkGreen", "DarkCyan", "DarkRed", "DarkMagenta", "DarkYellow", "Gray", "DarkGray", "Blue", "Green", "Cyan", "Red", "Magenta", "Yellow", "White")
    if ($Color -notin $validColors) {
        $Color = "White"
    }
    
    Write-Host $Message -ForegroundColor $Color
}

function Test-ServiceRunning {
    param(
        [string]$ServiceName,
        [string]$Port
    )
    
    try {
        # Use a more reliable method to test port connectivity without verbose output
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect("localhost", $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(1000, $false)
        
        if ($wait) {
            try {
                $tcpClient.EndConnect($connect)
                $tcpClient.Close()
                return $true
            }
            catch {
                $tcpClient.Close()
                return $false
            }
        }
        else {
            $tcpClient.Close()
            return $false
        }
    }
    catch {
        return $false
    }
}

function Test-OllamaRunning {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
        return $true
    }
    catch {
        return $false
    }
}

function Test-OllamaInstalled {
    try {
        $null = Get-Command ollama -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

function Test-OpenWebUIInstalled {
    # Check for pip installation in various environments
    $pipCommands = @(
        "pip",
        "C:/Development/droid-builder/.venv/Scripts/pip.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python*\Scripts\pip.exe"
    )
    
    foreach ($pipCmd in $pipCommands) {
        try {
            if (Test-Path $pipCmd -ErrorAction SilentlyContinue) {
                $pipOutput = & $pipCmd list 2>$null | Select-String "open-webui"
                if ($pipOutput) {
                    return @{
                        Installed = $true
                        Method = "pip"
                        Details = $pipOutput.ToString().Trim()
                        PipPath = $pipCmd
                    }
                }
            } elseif ($pipCmd -eq "pip") {
                # Try global pip
                $pipOutput = pip list 2>$null | Select-String "open-webui"
                if ($pipOutput) {
                    return @{
                        Installed = $true
                        Method = "pip"
                        Details = $pipOutput.ToString().Trim()
                        PipPath = "pip"
                    }
                }
            }
        }
        catch { }
    }
    
    # Check for standalone executable
    try {
        $null = Get-Command "open-webui" -ErrorAction Stop
        return @{
            Installed = $true
            Method = "standalone"
            Details = "standalone executable"
            PipPath = $null
        }
    }
    catch { }
    
    return @{
        Installed = $false
        Method = ""
        Details = ""
        PipPath = $null
    }
}

function Install-OllamaIfNeeded {
    Write-ColoredOutput "Checking if Ollama is installed..." $Cyan
    
    if (Test-OllamaInstalled) {
        Write-ColoredOutput "✅ Ollama is already installed" $Green
        return $true
    }
    
    Write-ColoredOutput "❌ Ollama not found. Installing via winget..." $Yellow
    
    # Check if winget is available
    try {
        $null = Get-Command winget -ErrorAction Stop
    }
    catch {
        Write-ColoredOutput "❌ winget is not available. Please install manually:" $Red
        Write-ColoredOutput "   Visit: https://ollama.ai/download" $Cyan
        return $false
    }
    
    try {
        Write-ColoredOutput "📦 Installing Ollama via winget..." $Cyan
        $result = winget install --id Ollama.Ollama --silent --accept-package-agreements --accept-source-agreements
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColoredOutput "✅ Ollama installed successfully" $Green
            
            # Refresh environment variables to pick up the new installation
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            
            # Verify installation
            Start-Sleep -Seconds 3
            if (Test-OllamaInstalled) {
                Write-ColoredOutput "✅ Ollama installation verified" $Green
                return $true
            } else {
                Write-ColoredOutput "⚠️ Ollama installed but not yet available in PATH. You may need to restart your terminal." $Yellow
                return $false
            }
        } else {
            Write-ColoredOutput "❌ Failed to install Ollama via winget (exit code: $LASTEXITCODE)" $Red
            return $false
        }
    }
    catch {
        Write-ColoredOutput "❌ Error installing Ollama: $($_.Exception.Message)" $Red
        Write-ColoredOutput "💡 Try installing manually from: https://ollama.ai/download" $Cyan
        return $false
    }
}

function Start-OllamaService {
    Write-ColoredOutput "Starting Ollama service..." $Cyan
    
    # First check if Ollama is installed, install if needed
    if (-not (Install-OllamaIfNeeded)) {
        Write-ColoredOutput "❌ Cannot start Ollama: installation failed" $Red
        return $false
    }
    
    if (Test-OllamaRunning) {
        Write-ColoredOutput "✅ Ollama is already running" $Green
        return $true
    }
    
    try {
        # Start Ollama in background
        $process = Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden -PassThru
        
        # Wait for service to be ready
        $maxWait = 30
        $waited = 0
        
        do {
            Start-Sleep -Seconds 2
            $waited += 2
            if (Test-OllamaRunning) {
                Write-ColoredOutput "✅ Ollama started successfully" $Green
                return $true
            }
        } while ($waited -lt $maxWait)
        
        Write-ColoredOutput "⚠️ Ollama may still be starting..." $Yellow
        return $false
    }
    catch {
        Write-ColoredOutput "❌ Failed to start Ollama: $($_.Exception.Message)" $Red
        return $false
    }
}

function Stop-OllamaService {
    Write-ColoredOutput "Stopping Ollama service..." $Cyan
    
    try {
        $processes = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
        
        if ($processes) {
            $processes | Stop-Process -Force
            Write-ColoredOutput "✅ Ollama stopped" $Green
            return $true
        } else {
            Write-ColoredOutput "ℹ️ Ollama is not running" $Yellow
            return $true
        }
    }
    catch {
        Write-ColoredOutput "❌ Failed to stop Ollama: $($_.Exception.Message)" $Red
        return $false
    }
}

function Start-OpenWebUIService {
    Write-ColoredOutput "Starting OpenWebUI service..." $Cyan
    
    if (Test-ServiceRunning -ServiceName "OpenWebUI" -Port "8080") {
        Write-ColoredOutput "✅ OpenWebUI is already running" $Green
        return $true
    }
    
    # Check if OpenWebUI is installed using the new function
    $installInfo = Test-OpenWebUIInstalled
    
    if (-not $installInfo.Installed) {
        Write-ColoredOutput "❌ OpenWebUI is not installed" $Red
        Write-ColoredOutput "💡 Install OpenWebUI using one of these methods:" $Cyan
        Write-ColoredOutput "   Method 1 (Recommended): pip install open-webui" $White
        Write-ColoredOutput "   Method 2: docker run -d -p 8080:8080 --add-host=host.docker.internal:host-gateway -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main" $White
        Write-ColoredOutput "   Method 3: Download from https://github.com/open-webui/open-webui/releases" $White
        return $false
    }
    
    Write-ColoredOutput "✅ OpenWebUI found ($($installInfo.Method): $($installInfo.Details))" $Green
    
    try {
        # Try different ways to start OpenWebUI depending on installation method
        $commands = @()
        
        if ($installInfo.Method -eq "pip") {
            # Use the specific Python environment if we found it there
            if ($installInfo.PipPath -like "*/.venv/*") {
                $openWebUIPath = $installInfo.PipPath -replace "pip\.exe$", "open-webui.exe"
                $commands += @{ Cmd = $openWebUIPath; Args = @("serve") }
            }
            # Also try the project's virtual environment
            $commands += @{ Cmd = "C:/Development/droid-builder/.venv/Scripts/open-webui.exe"; Args = @("serve") }
            $commands += @{ Cmd = "open-webui"; Args = @("serve") }
        }
        
        if ($installInfo.Method -eq "standalone") {
            $commands += @{ Cmd = "open-webui"; Args = @("serve") }
        }
        
        # Fallback: try all methods
        $commands += @{ Cmd = "open-webui"; Args = @("serve") }
        $commands += @{ Cmd = "C:/Development/droid-builder/.venv/Scripts/open-webui.exe"; Args = @("serve") }
        
        foreach ($command in $commands) {
            try {
                Write-ColoredOutput "📝 Trying: $($command.Cmd) $($command.Args -join ' ')" $Yellow
                $process = Start-Process $command.Cmd -ArgumentList $command.Args -WindowStyle Hidden -PassThru -ErrorAction Stop
                
                # OpenWebUI takes longer to start than other services (database migrations, model loading, etc.)
                Write-ColoredOutput "   ⏳ Waiting for OpenWebUI to start (this may take 15-30 seconds)..." $Yellow
                $maxWait = 30
                $waited = 0
                
                do {
                    Start-Sleep -Seconds 2
                    $waited += 2
                    if (Test-ServiceRunning -ServiceName "OpenWebUI" -Port "8080") {
                        Write-ColoredOutput "✅ OpenWebUI started successfully" $Green
                        Write-ColoredOutput "🌐 Access at: http://localhost:8080" $Cyan
                        return $true
                    }
                } while ($waited -lt $maxWait)
                
                # If we get here, it didn't start in time - kill the process
                try { $process | Stop-Process -Force -ErrorAction SilentlyContinue } catch { }
            }
            catch {
                Write-ColoredOutput "   ❌ Failed to start with: $($command.Cmd)" $Red
                continue
            }
        }
        
        Write-ColoredOutput "⚠️ Failed to start OpenWebUI with any method." $Yellow
        Write-ColoredOutput "💡 Try starting manually: python -m open_webui" $Cyan
        return $false
    }
    catch {
        Write-ColoredOutput "❌ Failed to start OpenWebUI: $($_.Exception.Message)" $Red
        return $false
    }
}

function Stop-OpenWebUIService {
    Write-ColoredOutput "Stopping OpenWebUI service..." $Cyan
    
    try {
        # Find and stop OpenWebUI processes
        $processes = Get-Process | Where-Object { 
            $_.ProcessName -like "*open*webui*" -or 
            $_.ProcessName -like "*uvicorn*" -or
            ($_.ProcessName -eq "python" -and $_.CommandLine -like "*open_webui*")
        }
        
        if ($processes) {
            $processes | Stop-Process -Force
            Write-ColoredOutput "✅ OpenWebUI stopped" $Green
            return $true
        } else {
            Write-ColoredOutput "ℹ️ OpenWebUI is not running" $Yellow
            return $true
        }
    }
    catch {
        Write-ColoredOutput "❌ Failed to stop OpenWebUI: $($_.Exception.Message)" $Red
        return $false
    }
}

# ============================================
# MCP Server Management Functions
# ============================================

function Test-DockerInstalled {
    try {
        $null = Get-Command docker -ErrorAction Stop
        $result = docker --version 2>$null
        return $true
    }
    catch {
        return $false
    }
}

function Test-DockerComposeInstalled {
    try {
        $result = docker compose version 2>$null
        return $true
    }
    catch {
        # Try legacy docker-compose
        try {
            $null = Get-Command docker-compose -ErrorAction Stop
            return $true
        }
        catch {
            return $false
        }
    }
}

function Get-DockerComposeCommand {
    # Try docker compose first (newer syntax)
    try {
        $result = docker compose version 2>$null
        return "docker compose"
    }
    catch {
        # Fall back to docker-compose
        try {
            $null = Get-Command docker-compose -ErrorAction Stop
            return "docker-compose"
        }
        catch {
            return $null
        }
    }
}

function Test-McpServicesRunning {
    $composeCmd = Get-DockerComposeCommand
    if (-not $composeCmd) {
        return $false
    }
    
    try {
        $result = & $composeCmd.Split() ps --format json 2>$null
        if ($result) {
            $services = $result | ConvertFrom-Json
            $runningServices = $services | Where-Object { $_.State -eq "running" }
            return ($runningServices.Count -gt 0)
        }
        return $false
    }
    catch {
        return $false
    }
}

function Start-McpServices {
    Write-ColoredOutput "🔧 Starting MCP Services..." $Cyan
    
    # Check prerequisites
    if (-not (Test-DockerInstalled)) {
        Write-ColoredOutput "❌ Docker is not installed. Please install Docker Desktop first." $Red
        Write-ColoredOutput "   Visit: https://www.docker.com/products/docker-desktop" $Cyan
        return $false
    }
    
    if (-not (Test-DockerComposeInstalled)) {
        Write-ColoredOutput "❌ Docker Compose is not available." $Red
        return $false
    }
    
    $composeCmd = Get-DockerComposeCommand
    
    # Check if .env file exists
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Write-ColoredOutput "⚠️ .env file not found. Creating from .env.example..." $Yellow
            Copy-Item ".env.example" ".env"
            Write-ColoredOutput "📝 Please edit .env file with your API keys and configuration before continuing." $Cyan
            Write-ColoredOutput "   Required: GITHUB_TOKEN, OPENAI_API_KEY, SLACK_BOT_TOKEN (optional)" $Yellow
            return $false
        } else {
            Write-ColoredOutput "❌ Neither .env nor .env.example file found." $Red
            return $false
        }
    }
    
    try {
        Write-ColoredOutput "🚀 Starting MCP services with Docker Compose..." $Cyan
        $arguments = @("up", "-d", "--build")
        
        $process = Start-Process -FilePath $composeCmd.Split()[0] -ArgumentList ($composeCmd.Split()[1..($composeCmd.Split().Length-1)] + $arguments) -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Write-ColoredOutput "✅ MCP services started successfully" $Green
            Start-Sleep -Seconds 3
            Get-McpServiceStatus
            return $true
        } else {
            Write-ColoredOutput "❌ Failed to start MCP services" $Red
            return $false
        }
    }
    catch {
        Write-ColoredOutput "❌ Error starting MCP services: $($_.Exception.Message)" $Red
        return $false
    }
}

function Stop-McpServices {
    Write-ColoredOutput "🛑 Stopping MCP Services..." $Cyan
    
    $composeCmd = Get-DockerComposeCommand
    if (-not $composeCmd) {
        Write-ColoredOutput "❌ Docker Compose not available" $Red
        return $false
    }
    
    try {
        $arguments = @("down")
        $process = Start-Process -FilePath $composeCmd.Split()[0] -ArgumentList ($composeCmd.Split()[1..($composeCmd.Split().Length-1)] + $arguments) -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Write-ColoredOutput "✅ MCP services stopped successfully" $Green
            return $true
        } else {
            Write-ColoredOutput "❌ Failed to stop MCP services" $Red
            return $false
        }
    }
    catch {
        Write-ColoredOutput "❌ Error stopping MCP services: $($_.Exception.Message)" $Red
        return $false
    }
}

function Restart-McpServices {
    Write-ColoredOutput "🔄 Restarting MCP Services..." $Cyan
    
    if (Stop-McpServices) {
        Start-Sleep -Seconds 2
        return Start-McpServices
    }
    return $false
}

function Get-McpServiceStatus {
    Write-ColoredOutput "📊 MCP Services Status:" $Cyan
    Write-ColoredOutput "======================" $Cyan
    
    $composeCmd = Get-DockerComposeCommand
    if (-not $composeCmd) {
        Write-ColoredOutput "❌ Docker Compose not available" $Red
        return
    }
    
    # Check if .env file exists
    if (-not (Test-Path ".env")) {
        Write-ColoredOutput "⚠️ .env file not found - MCP services may not be configured" $Yellow
    }
    
    try {
        # Get service status
        $result = & $composeCmd.Split() ps --format json 2>$null
        
        if ($result) {
            $services = $result | ConvertFrom-Json
            
            if ($services.Count -eq 0) {
                Write-ColoredOutput "📋 No MCP services are currently running" $Yellow
                Write-ColoredOutput "   💡 Start with: .\manage-services.ps1 -Action mcp-start" $Cyan
                return
            }
            
            foreach ($service in $services) {
                $statusIcon = switch ($service.State) {
                    "running" { "✅" }
                    "exited" { "❌" }
                    "restarting" { "🔄" }
                    default { "⚠️" }
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
            Write-ColoredOutput "`n🌐 Key Service Endpoints:" $Cyan
            Write-ColoredOutput "  • MCP Router: http://localhost:3001" $White
            Write-ColoredOutput "  • Prometheus: http://localhost:9090" $White
            Write-ColoredOutput "  • Grafana: http://localhost:3000 (admin/admin)" $White
            Write-ColoredOutput "  • Jupyter: http://localhost:8888" $White
            Write-ColoredOutput "  • PostgreSQL: localhost:5432" $White
        } else {
            Write-ColoredOutput "📋 No MCP services found" $Yellow
        }
    }
    catch {
        Write-ColoredOutput "❌ Error getting MCP service status: $($_.Exception.Message)" $Red
    }
}

function Get-McpServiceLogs {
    param([string]$ServiceName = "")
    
    Write-ColoredOutput "📜 Getting MCP Service Logs..." $Cyan
    
    $composeCmd = Get-DockerComposeCommand
    if (-not $composeCmd) {
        Write-ColoredOutput "❌ Docker Compose not available" $Red
        return
    }
    
    try {
        $arguments = if ($ServiceName) {
            @("logs", "--tail=50", "-f", $ServiceName)
        } else {
            @("logs", "--tail=50", "-f")
        }
        
        Write-ColoredOutput "📋 Showing logs (Press Ctrl+C to exit)..." $Yellow
        & $composeCmd.Split() @arguments
    }
    catch {
        Write-ColoredOutput "❌ Error getting logs: $($_.Exception.Message)" $Red
    }
}

function Get-ServiceStatus {
    Write-ColoredOutput "Checking service status..." $Cyan
    Write-ColoredOutput "=========================" $Cyan
    
    # Check Ollama installation and status
    if (Test-OllamaInstalled) {
        if (Test-OllamaRunning) {
            Write-ColoredOutput "🤖 Ollama: ✅ Installed and Running (http://localhost:11434)" $Green
            
            # Get installed models
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get
                if ($response.models -and $response.models.Count -gt 0) {
                    Write-ColoredOutput "   📦 Installed models:" $White
                    foreach ($model in $response.models) {
                        Write-ColoredOutput "      • $($model.name)" $Cyan
                    }
                } else {
                    Write-ColoredOutput "   ⚠️ No models installed" $Yellow
                    Write-ColoredOutput "   💡 Install models with: .\manage-services.ps1 -Action install-models" $Cyan
                }
            }
            catch {
                Write-ColoredOutput "   ⚠️ Could not retrieve model list" $Yellow
            }
        } else {
            Write-ColoredOutput "🤖 Ollama: ✅ Installed but ❌ Not running" $Yellow
            Write-ColoredOutput "   💡 Start with: .\manage-services.ps1 -Action start -Service ollama" $Cyan
        }
    } else {
        Write-ColoredOutput "🤖 Ollama: ❌ Not installed" $Red
        Write-ColoredOutput "   💡 Install with: .\manage-services.ps1 -Action start -Service ollama" $Cyan
    }
    
    # Check OpenWebUI
    if (Test-ServiceRunning -ServiceName "OpenWebUI" -Port "8080") {
        Write-ColoredOutput "🌐 OpenWebUI: ✅ Running (http://localhost:8080)" $Green
    } else {
        # Check if OpenWebUI is installed using the new function
        $installInfo = Test-OpenWebUIInstalled
        
        if ($installInfo.Installed) {
            Write-ColoredOutput "🌐 OpenWebUI: ✅ Installed ($($installInfo.Method): $($installInfo.Details)) but ❌ Not running" $Yellow
            Write-ColoredOutput "   💡 Start with: .\manage-services.ps1 -Action start -Service openwebui" $Cyan
        } else {
            Write-ColoredOutput "🌐 OpenWebUI: ❌ Not installed" $Red
            Write-ColoredOutput "   💡 Install with: pip install open-webui" $Cyan
            Write-ColoredOutput "   💡 Then start with: .\manage-services.ps1 -Action start -Service openwebui" $Cyan
        }
    }
    
    # Check for configuration files
    $configDir = "$env:LOCALAPPDATA\DroidBuilder\AgentConfigs"
    if (Test-Path $configDir) {
        Write-ColoredOutput "⚙️ Agent configs: ✅ Available" $Green
        $configs = Get-ChildItem -Path $configDir -Filter "*.json"
        foreach ($config in $configs) {
            $configData = Get-Content $config.FullName | ConvertFrom-Json
            $status = if ($configData.enabled) { "✅ Enabled" } else { "⭕ Disabled" }
            Write-ColoredOutput "   • $($configData.name): $status" $White
        }
    } else {
        Write-ColoredOutput "⚙️ Agent configs: ❌ Not found" $Red
    }
    
    Write-ColoredOutput "" $White
    
    # Check MCP Services
    if (Test-DockerInstalled -and Test-DockerComposeInstalled) {
        if (Test-McpServicesRunning) {
            Write-ColoredOutput "🔧 MCP Services: ✅ Running" $Green
            Write-ColoredOutput "   💡 Check status with: .\manage-services.ps1 -Action mcp-status" $Cyan
        } else {
            Write-ColoredOutput "🔧 MCP Services: ❌ Not running" $Yellow
            Write-ColoredOutput "   💡 Start with: .\manage-services.ps1 -Action mcp-start" $Cyan
        }
    } else {
        Write-ColoredOutput "🔧 MCP Services: ❌ Docker/Docker Compose not available" $Red
        Write-ColoredOutput "   💡 Install Docker Desktop from: https://www.docker.com/products/docker-desktop" $Cyan
    }
}

function Install-OllamaModels {
    param([string[]]$ModelList)
    
    # First ensure Ollama is installed
    if (-not (Install-OllamaIfNeeded)) {
        Write-ColoredOutput "❌ Cannot install models: Ollama installation failed" $Red
        return $false
    }
    
    if (-not (Test-OllamaRunning)) {
        Write-ColoredOutput "❌ Ollama is not running. Please start Ollama first." $Red
        Write-ColoredOutput "💡 Run: .\manage-services.ps1 -Action start -Service ollama" $Cyan
        return $false
    }
    
    if ($ModelList.Count -eq 0) {
        $ModelList = @("llama2", "codellama")
    }
    
    Write-ColoredOutput "Installing Ollama models..." $Cyan
    
    foreach ($model in $ModelList) {
        Write-ColoredOutput "📦 Installing model: $model" $Cyan
        
        try {
            $process = Start-Process "ollama" -ArgumentList "pull", $model -Wait -PassThru -NoNewWindow
            
            if ($process.ExitCode -eq 0) {
                Write-ColoredOutput "✅ Model $model installed successfully" $Green
            } else {
                Write-ColoredOutput "❌ Failed to install model $model" $Red
            }
        }
        catch {
            Write-ColoredOutput "❌ Error installing model $model`: $($_.Exception.Message)" $Red
        }
    }
}

# Main script logic
try {
    Write-ColoredOutput "🤖 Droid Builder Service Manager" $Cyan
    Write-ColoredOutput "================================" $Cyan
    
    switch ($Action.ToLower()) {
        "start" {
            switch ($Service.ToLower()) {
                "ollama" { Start-OllamaService }
                "openwebui" { Start-OpenWebUIService }
                "mcp" { Start-McpServices }
                "all" { 
                    Start-OllamaService
                    Start-Sleep -Seconds 2
                    Start-OpenWebUIService
                    Start-Sleep -Seconds 2
                    Start-McpServices
                }
            }
        }
        
        "stop" {
            switch ($Service.ToLower()) {
                "ollama" { Stop-OllamaService }
                "openwebui" { Stop-OpenWebUIService }
                "mcp" { Stop-McpServices }
                "all" { 
                    Stop-McpServices
                    Stop-OpenWebUIService
                    Stop-OllamaService
                }
            }
        }
        
        "restart" {
            switch ($Service.ToLower()) {
                "ollama" { 
                    Stop-OllamaService
                    Start-Sleep -Seconds 2
                    Start-OllamaService
                }
                "openwebui" { 
                    Stop-OpenWebUIService
                    Start-Sleep -Seconds 2
                    Start-OpenWebUIService
                }
                "mcp" {
                    Restart-McpServices
                }
                "all" { 
                    Stop-McpServices
                    Stop-OpenWebUIService
                    Stop-OllamaService
                    Start-Sleep -Seconds 2
                    Start-OllamaService
                    Start-Sleep -Seconds 2
                    Start-OpenWebUIService
                    Start-Sleep -Seconds 2
                    Start-McpServices
                }
            }
        }
        
        "status" {
            Get-ServiceStatus
        }
        
        "install-models" {
            Install-OllamaModels -ModelList $Models
        }
        
        "install-ollama" {
            Install-OllamaIfNeeded
        }
        
        "mcp-start" {
            Start-McpServices
        }
        
        "mcp-stop" {
            Stop-McpServices
        }
        
        "mcp-restart" {
            Restart-McpServices
        }
        
        "mcp-status" {
            Get-McpServiceStatus
        }
        
        "mcp-logs" {
            Get-McpServiceLogs
        }
    }
    
    Write-ColoredOutput "`n✅ Operation completed" $Green
}
catch {
    Write-ColoredOutput "❌ Error: $($_.Exception.Message)" $Red
    exit 1
}
