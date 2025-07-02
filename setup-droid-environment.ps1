#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Droid Builder - AI Development Environment Setup Script

.DESCRIPTION
    Automated PowerShell script for setting up a complete AI development environment.
    Installs Ollama, OpenWebUI, MCP Tools, Memvid, and configures external agent support.

.PARAMETER SkipOptional
    Skip optional installations that might not be available via winget

.PARAMETER NoAutoStart
    Don't automatically start services after installation

.EXAMPLE
    .\setup-droid-environment.ps1
    
.EXAMPLE
    .\setup-droid-environment.ps1 -SkipOptional -NoAutoStart
#>

param(
    [switch]$SkipOptional,
    [switch]$NoAutoStart
)

# Set up error handling
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"

function Write-ColoredOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-WingetAvailable {
    try {
        $null = Get-Command winget -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

function Install-WingetPackage {
    param(
        [string]$PackageId,
        [string]$PackageName,
        [switch]$Optional
    )
    
    Write-ColoredOutput "Installing $PackageName..." $Cyan
    
    try {
        $result = winget install --id $PackageId --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-ColoredOutput "✅ $PackageName installed successfully" $Green
            return $true
        } else {
            throw "Installation failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        if ($Optional) {
            Write-ColoredOutput "⚠️ Optional package $PackageName failed to install: $($_.Exception.Message)" $Yellow
            return $false
        } else {
            Write-ColoredOutput "❌ Failed to install $PackageName: $($_.Exception.Message)" $Red
            throw
        }
    }
}

function Install-MemvidManually {
    Write-ColoredOutput "Installing Memvid (GitHub repository)..." $Cyan
    
    try {
        # Create a directory for Memvid
        $memvidDir = "$env:LOCALAPPDATA\Memvid"
        if (-not (Test-Path $memvidDir)) {
            New-Item -ItemType Directory -Path $memvidDir -Force | Out-Null
        }
        
        # Check if Git is available and try to clone the repository
        if (Get-Command git -ErrorAction SilentlyContinue) {
            Write-ColoredOutput "Git found, attempting to clone Memvid repository..." $Cyan
            
            try {
                $repoPath = Join-Path $memvidDir "memvid-repo"
                if (-not (Test-Path $repoPath)) {
                    git clone https://github.com/Olow304/memvid.git $repoPath
                    Write-ColoredOutput "✅ Memvid repository cloned successfully" $Green
                    Write-ColoredOutput "📁 Repository location: $repoPath" $Cyan
                    
                    # Install Memvid and dependencies
                    Write-ColoredOutput "Installing Memvid and dependencies..." $Cyan
                    try {
                        Set-Location $repoPath
                        pip install -e .
                        pip install PyPDF2  # For PDF support
                        pip install sentence-transformers  # For embeddings
                        pip install faiss-cpu  # For vector search
                        pip install beautifulsoup4  # For HTML processing
                        pip install tqdm  # For progress bars
                        Write-ColoredOutput "✅ Memvid installed successfully via pip" $Green
                    }
                    catch {
                        Write-ColoredOutput "⚠️ Pip installation failed, manual setup required" $Yellow
                        Write-ColoredOutput "Run: cd $repoPath && pip install -e ." $Cyan
                    }
                    finally {
                        Set-Location $PSScriptRoot
                    }
                } else {
                    Write-ColoredOutput "ℹ️ Memvid repository already exists at $repoPath" $Yellow
                    
                    # Try to install if not already installed
                    try {
                        python -c "import memvid; print('Memvid already installed')"
                        Write-ColoredOutput "✅ Memvid is already installed" $Green
                    }
                    catch {
                        Write-ColoredOutput "Installing Memvid from existing repository..." $Cyan
                        Set-Location $repoPath
                        pip install -e .
                        Set-Location $PSScriptRoot
                    }
                }
            }
            catch {
                Write-ColoredOutput "⚠️ Failed to clone/install repository: $($_.Exception.Message)" $Yellow
                Write-ColoredOutput "Please visit https://github.com/Olow304/memvid/ for installation instructions" $Yellow
            }
        } else {
            Write-ColoredOutput "⚠️ Git not found - manual Memvid setup required" $Yellow
            Write-ColoredOutput "Install via pip: pip install memvid" $Cyan
            Write-ColoredOutput "Or visit: https://github.com/Olow304/memvid/" $Cyan
        }
        
        # Create Memvid configuration for Ollama integration
        $memvidScript = @"
# Memvid Integration Script for Ollama
# Repository: https://github.com/Olow304/memvid/

import os
from memvid import MemvidEncoder, MemvidChat, MemvidRetriever
from pathlib import Path

# Configuration for Memvid with Ollama
MEMVID_CONFIG = {
    'memvid_dir': r'$memvidDir',
    'ollama_base_url': 'http://localhost:11434',
    'default_model': 'llama2',
    'chunk_size': 512,
    'overlap': 50,
    'video_fps': 30,
    'video_codec': 'h264'  # Compatible with most systems
}

def create_memory_from_text(text_content, memory_name, metadata=None):
    '''Create a Memvid memory from text content'''
    try:
        encoder = MemvidEncoder()
        encoder.add_text(
            text_content, 
            chunk_size=MEMVID_CONFIG['chunk_size'],
            overlap=MEMVID_CONFIG['overlap'],
            metadata=metadata or {}
        )
        
        video_path = Path(MEMVID_CONFIG['memvid_dir']) / f'{memory_name}.mp4'
        index_path = Path(MEMVID_CONFIG['memvid_dir']) / f'{memory_name}_index.json'
        
        encoder.build_video(str(video_path), str(index_path))
        print(f'✅ Memory created: {video_path}')
        return str(video_path), str(index_path)
    except Exception as e:
        print(f'❌ Error creating memory: {e}')
        return None, None

def create_memory_from_files(file_paths, memory_name):
    '''Create a Memvid memory from multiple files'''
    try:
        encoder = MemvidEncoder()
        
        for file_path in file_paths:
            file_path = Path(file_path)
            if file_path.suffix.lower() == '.pdf':
                encoder.add_pdf(str(file_path))
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    encoder.add_text(content, metadata={'source': file_path.name})
        
        video_path = Path(MEMVID_CONFIG['memvid_dir']) / f'{memory_name}.mp4'
        index_path = Path(MEMVID_CONFIG['memvid_dir']) / f'{memory_name}_index.json'
        
        encoder.build_video(str(video_path), str(index_path))
        print(f'✅ Memory created from {len(file_paths)} files: {video_path}')
        return str(video_path), str(index_path)
    except Exception as e:
        print(f'❌ Error creating memory from files: {e}')
        return None, None

def search_memory(video_path, index_path, query, top_k=5):
    '''Search a Memvid memory'''
    try:
        retriever = MemvidRetriever(video_path, index_path)
        results = retriever.search(query, top_k=top_k)
        return results
    except Exception as e:
        print(f'❌ Error searching memory: {e}')
        return []

def chat_with_ollama_memory(video_path, index_path, model_name='llama2'):
    '''
    Chat with Memvid memory using Ollama
    Note: This requires custom integration since Memvid doesn't natively support Ollama
    '''
    try:
        import requests
        
        retriever = MemvidRetriever(video_path, index_path)
        
        def chat_session():
            print('🤖 Memvid + Ollama Chat Session')
            print('Type "quit" to exit, "search <query>" to search memory')
            print('=' * 50)
            
            conversation_history = []
            
            while True:
                user_input = input('You: ').strip()
                
                if user_input.lower() in ['quit', 'exit']:
                    break
                    
                if user_input.lower().startswith('search '):
                    query = user_input[7:]
                    results = retriever.search(query, top_k=3)
                    print(f'🔍 Search results for "{query}":')
                    for i, chunk in enumerate(results, 1):
                        print(f'{i}. {chunk[:200]}...')
                    continue
                
                # Get relevant context from memory
                context_chunks = retriever.search(user_input, top_k=3)
                context = '\\n'.join(context_chunks)
                
                # Prepare prompt for Ollama
                prompt = f'''Context from memory:
{context}

User question: {user_input}

Please answer based on the context provided above.'''
                
                # Send to Ollama
                try:
                    response = requests.post(
                        f'{MEMVID_CONFIG["ollama_base_url"]}/api/generate',
                        json={
                            'model': model_name,
                            'prompt': prompt,
                            'stream': False
                        }
                    )
                    
                    if response.status_code == 200:
                        answer = response.json().get('response', 'No response received')
                        print(f'🤖 Assistant: {answer}')
                        conversation_history.append({'user': user_input, 'assistant': answer})
                    else:
                        print(f'❌ Ollama error: {response.status_code}')
                        
                except requests.exceptions.RequestException as e:
                    print(f'❌ Connection error to Ollama: {e}')
                    print('Make sure Ollama is running: ollama serve')
        
        chat_session()
        
    except Exception as e:
        print(f'❌ Error in chat session: {e}')

# Example usage
if __name__ == '__main__':
    print('Memvid + Ollama Integration Ready!')
    print('Configuration:', MEMVID_CONFIG)
    
    # Example: Create memory from text
    # video_path, index_path = create_memory_from_text(
    #     'Sample text for testing', 'test_memory'
    # )
    # 
    # if video_path and index_path:
    #     chat_with_ollama_memory(video_path, index_path)
"@
        
        $memvidScript | Out-File -FilePath "$memvidDir\memvid-ollama-integration.py" -Encoding UTF8
        Write-ColoredOutput "✅ Memvid-Ollama integration script created at $memvidDir\memvid-ollama-integration.py" $Green
        
        # Create a simple PowerShell wrapper for easier usage
        $memvidWrapper = @"
# Memvid PowerShell Wrapper for Ollama Integration

function New-MemvidMemory {
    param(
        [string]`$TextContent,
        [string[]]`$FilePaths,
        [string]`$MemoryName,
        [hashtable]`$Metadata = @{}
    )
    
    `$pythonScript = "$memvidDir\memvid-ollama-integration.py"
    
    if (`$TextContent) {
        python -c "
import sys
sys.path.append('$memvidDir')
from memvid_ollama_integration import create_memory_from_text
create_memory_from_text('`$TextContent', '`$MemoryName')
"
    } elseif (`$FilePaths) {
        `$fileList = (`$FilePaths -join "','")
        python -c "
import sys
sys.path.append('$memvidDir')
from memvid_ollama_integration import create_memory_from_files
create_memory_from_files(['`$fileList'], '`$MemoryName')
"
    }
}

function Search-MemvidMemory {
    param(
        [string]`$VideoPath,
        [string]`$IndexPath,
        [string]`$Query,
        [int]`$TopK = 5
    )
    
    python -c "
import sys
sys.path.append('$memvidDir')
from memvid_ollama_integration import search_memory
results = search_memory('`$VideoPath', '`$IndexPath', '`$Query', `$TopK)
for i, result in enumerate(results, 1):
    print(f'{i}. {result[:200]}...')
"
}

function Start-MemvidOllamaChat {
    param(
        [string]`$VideoPath,
        [string]`$IndexPath,
        [string]`$ModelName = 'llama2'
    )
    
    python -c "
import sys
sys.path.append('$memvidDir')
from memvid_ollama_integration import chat_with_ollama_memory
chat_with_ollama_memory('`$VideoPath', '`$IndexPath', '`$ModelName')
"
}

Export-ModuleMember -Function New-MemvidMemory, Search-MemvidMemory, Start-MemvidOllamaChat
"@
        
        $memvidWrapper | Out-File -FilePath "$memvidDir\MemvidOllamaWrapper.psm1" -Encoding UTF8
        Write-ColoredOutput "✅ PowerShell wrapper created at $memvidDir\MemvidOllamaWrapper.psm1" $Green
        
        return $true
    }
    catch {
        Write-ColoredOutput "❌ Failed to set up Memvid: $($_.Exception.Message)" $Red
        return $false
        
        $memvidScript | Out-File -FilePath "$memvidDir\memvid-ollama-integration.py" -Encoding UTF8
        Write-ColoredOutput "✅ Memvid-Ollama integration script created at $memvidDir\memvid-ollama-integration.py" $Green
        
        return $true
    }
    catch {
        Write-ColoredOutput "❌ Failed to set up Memvid: $($_.Exception.Message)" $Red
        return $false
    }
}

function Set-OpenWebUIConfiguration {
    Write-ColoredOutput "Configuring OpenWebUI to use Ollama..." $Cyan
    
    try {
        # Wait for Ollama to be ready
        $maxRetries = 30
        $retryCount = 0
        
        do {
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
                break
            }
            catch {
                Start-Sleep -Seconds 2
                $retryCount++
            }
        } while ($retryCount -lt $maxRetries)
        
        if ($retryCount -ge $maxRetries) {
            throw "Ollama service is not responding after $maxRetries attempts"
        }
        
        # Create OpenWebUI configuration
        $openWebUIConfig = @{
            OLLAMA_BASE_URL = "http://localhost:11434"
            ENABLE_RAG_HYBRID_SEARCH = $true
            ENABLE_RAG_WEB_LOADER_SSL_VERIFICATION = $false
            DEFAULT_MODELS = "llama2"
            ENABLE_MODEL_FILTER = $true
            WEBUI_AUTH = $false
        }
        
        # Set environment variables for OpenWebUI
        foreach ($key in $openWebUIConfig.Keys) {
            [Environment]::SetEnvironmentVariable($key, $openWebUIConfig[$key], "Machine")
        }
        
        Write-ColoredOutput "✅ OpenWebUI configuration completed" $Green
        return $true
    }
    catch {
        Write-ColoredOutput "❌ Failed to configure OpenWebUI: $($_.Exception.Message)" $Red
        return $false
    }
}

function Install-MCPToolsServers {
    Write-ColoredOutput "Setting up MCP Tools servers..." $Cyan
    
    try {
        # Install Node.js if not present (required for many MCP tools)
        Install-WingetPackage -PackageId "OpenJS.NodeJS" -PackageName "Node.js" -Optional
        
        # Create MCP tools directory
        $mcpDir = "$env:LOCALAPPDATA\MCPTools"
        if (-not (Test-Path $mcpDir)) {
            New-Item -ItemType Directory -Path $mcpDir -Force | Out-Null
        }
        
        # Install common MCP tools via npm (if Node.js is available)
        if (Get-Command npm -ErrorAction SilentlyContinue) {
            $mcpPackages = @(
                "@modelcontextprotocol/server-filesystem",
                "@modelcontextprotocol/server-git",
                "@modelcontextprotocol/server-brave-search"
            )
            
            foreach ($package in $mcpPackages) {
                try {
                    Write-ColoredOutput "Installing MCP package: $package" $Cyan
                    npm install -g $package
                    Write-ColoredOutput "✅ Installed $package" $Green
                }
                catch {
                    Write-ColoredOutput "⚠️ Failed to install $package" $Yellow
                }
            }
        }
        
        # Create MCP configuration template
        $mcpConfig = @"
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "--path", "%USERPROFILE%"]
    },
    "git": {
      "command": "npx", 
      "args": ["@modelcontextprotocol/server-git", "--repository", "."]
    },
    "brave-search": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key-here"
      }
    }
  }
}
"@
        
        $mcpConfig | Out-File -FilePath "$mcpDir\mcp-config.json" -Encoding UTF8
        Write-ColoredOutput "✅ MCP Tools configuration created at $mcpDir\mcp-config.json" $Green
        
        return $true
    }
    catch {
        Write-ColoredOutput "❌ Failed to set up MCP Tools: $($_.Exception.Message)" $Red
        return $false
    }
}

function Set-ExternalAgentConfiguration {
    Write-ColoredOutput "Setting up external agent configuration..." $Cyan
    
    try {
        $agentConfigDir = "$env:LOCALAPPDATA\DroidBuilder\AgentConfigs"
        if (-not (Test-Path $agentConfigDir)) {
            New-Item -ItemType Directory -Path $agentConfigDir -Force | Out-Null
        }
        
        # Azure OpenAI configuration template
        $azureConfig = @"
{
  "provider": "azure",
  "name": "Azure OpenAI",
  "endpoint": "https://your-resource.openai.azure.com/",
  "apiKey": "your-azure-api-key",
  "apiVersion": "2024-02-15-preview",
  "models": [
    "gpt-4",
    "gpt-35-turbo"
  ],
  "enabled": false
}
"@
        
        # Google Cloud Platform configuration template
        $gcpConfig = @"
{
  "provider": "gcp",
  "name": "Google Cloud AI",
  "projectId": "your-gcp-project-id",
  "location": "us-central1",
  "credentialsPath": "path/to/service-account.json",
  "models": [
    "gemini-pro",
    "gemini-pro-vision"
  ],
  "enabled": false
}
"@
        
        # Hugging Face configuration template
        $hfConfig = @"
{
  "provider": "huggingface",
  "name": "Hugging Face",
  "apiKey": "your-hf-token",
  "endpoint": "https://api-inference.huggingface.co/models/",
  "models": [
    "meta-llama/Llama-2-7b-chat-hf",
    "microsoft/DialoGPT-large"
  ],
  "enabled": false
}
"@
        
        $azureConfig | Out-File -FilePath "$agentConfigDir\azure-config.json" -Encoding UTF8
        $gcpConfig | Out-File -FilePath "$agentConfigDir\gcp-config.json" -Encoding UTF8
        $hfConfig | Out-File -FilePath "$agentConfigDir\huggingface-config.json" -Encoding UTF8
        
        # Create a PowerShell module for agent management
        $agentModule = @"
# DroidBuilder Agent Management Module

function Get-AgentConfigurations {
    `$configDir = "$agentConfigDir"
    `$configs = @()
    
    Get-ChildItem -Path `$configDir -Filter "*.json" | ForEach-Object {
        `$config = Get-Content `$_.FullName | ConvertFrom-Json
        `$configs += `$config
    }
    
    return `$configs
}

function Enable-Agent {
    param([string]`$Provider)
    
    `$configPath = "$agentConfigDir\`$Provider-config.json"
    if (Test-Path `$configPath) {
        `$config = Get-Content `$configPath | ConvertFrom-Json
        `$config.enabled = `$true
        `$config | ConvertTo-Json -Depth 3 | Out-File `$configPath -Encoding UTF8
        Write-Host "Agent `$Provider enabled"
    }
}

function Disable-Agent {
    param([string]`$Provider)
    
    `$configPath = "$agentConfigDir\`$Provider-config.json"
    if (Test-Path `$configPath) {
        `$config = Get-Content `$configPath | ConvertFrom-Json
        `$config.enabled = `$false
        `$config | ConvertTo-Json -Depth 3 | Out-File `$configPath -Encoding UTF8
        Write-Host "Agent `$Provider disabled"
    }
}

Export-ModuleMember -Function Get-AgentConfigurations, Enable-Agent, Disable-Agent
"@
        
        $moduleDir = "$env:LOCALAPPDATA\DroidBuilder\Modules"
        if (-not (Test-Path $moduleDir)) {
            New-Item -ItemType Directory -Path $moduleDir -Force | Out-Null
        }
        
        $agentModule | Out-File -FilePath "$moduleDir\AgentManager.psm1" -Encoding UTF8
        
        Write-ColoredOutput "✅ External agent configurations created" $Green
        Write-ColoredOutput "📁 Configuration files location: $agentConfigDir" $Yellow
        Write-ColoredOutput "📁 PowerShell module location: $moduleDir\AgentManager.psm1" $Yellow
        
        return $true
    }
    catch {
        Write-ColoredOutput "❌ Failed to set up external agent configuration: $($_.Exception.Message)" $Red
        return $false
    }
}

function Start-Services {
    param([switch]$Auto)
    
    if ($Auto -and $NoAutoStart) {
        Write-ColoredOutput "Skipping automatic service startup (NoAutoStart flag set)" $Yellow
        return
    }
    
    Write-ColoredOutput "Starting services..." $Cyan
    
    try {
        # Start Ollama
        Write-ColoredOutput "Starting Ollama..." $Cyan
        Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 5
        
        # Verify Ollama is running
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 10
            Write-ColoredOutput "✅ Ollama is running" $Green
        }
        catch {
            Write-ColoredOutput "⚠️ Ollama may not be responding yet" $Yellow
        }
        
        # Start OpenWebUI
        Write-ColoredOutput "Starting OpenWebUI..." $Cyan
        # Note: This assumes OpenWebUI is installed via pip or similar
        # You may need to adjust this based on the actual installation method
        Start-Process "python" -ArgumentList "-m", "open_webui" -WindowStyle Hidden
        
        Write-ColoredOutput "✅ Services startup initiated" $Green
        Write-ColoredOutput "🌐 OpenWebUI should be available at: http://localhost:8080" $Cyan
        Write-ColoredOutput "🤖 Ollama API available at: http://localhost:11434" $Cyan
        
    }
    catch {
        Write-ColoredOutput "⚠️ Some services may not have started properly: $($_.Exception.Message)" $Yellow
    }
}

function Show-PostInstallInstructions {
    Write-ColoredOutput "`n🎉 Installation completed!" $Green
    Write-ColoredOutput "===========================================" $Cyan
    
    Write-ColoredOutput "`n📋 Next Steps:" $Yellow
    Write-ColoredOutput "1. Install some Ollama models:" $White
    Write-ColoredOutput "   ollama pull llama2" $Cyan
    Write-ColoredOutput "   ollama pull codellama" $Cyan
    
    Write-ColoredOutput "`n2. Access your services:" $White
    Write-ColoredOutput "   • OpenWebUI: http://localhost:8080" $Cyan
    Write-ColoredOutput "   • Ollama API: http://localhost:11434" $Cyan
    
    Write-ColoredOutput "`n3. Configure external agents:" $White
    Write-ColoredOutput "   • Edit configuration files in: $env:LOCALAPPDATA\DroidBuilder\AgentConfigs" $Cyan
    Write-ColoredOutput "   • Add your API keys and enable desired providers" $Cyan
    
    Write-ColoredOutput "`n4. Set up Memvid + Ollama Integration:" $White
    Write-ColoredOutput "   • Memvid repository: https://github.com/Olow304/memvid/" $Cyan
    Write-ColoredOutput "   • Integration script: $env:LOCALAPPDATA\Memvid\memvid-ollama-integration.py" $Cyan
    Write-ColoredOutput "   • PowerShell wrapper: $env:LOCALAPPDATA\Memvid\MemvidOllamaWrapper.psm1" $Cyan
    Write-ColoredOutput "   • Example usage:" $Yellow
    Write-ColoredOutput "     python `"$env:LOCALAPPDATA\Memvid\memvid-ollama-integration.py`"" $Cyan
    Write-ColoredOutput "   • Or load PowerShell module:" $Yellow
    Write-ColoredOutput "     Import-Module `"$env:LOCALAPPDATA\Memvid\MemvidOllamaWrapper.psm1`"" $Cyan
    
    Write-ColoredOutput "`n5. Load the agent management module:" $White
    Write-ColoredOutput "   Import-Module `"$env:LOCALAPPDATA\DroidBuilder\Modules\AgentManager.psm1`"" $Cyan
    
    Write-ColoredOutput "`n🔧 Troubleshooting:" $Yellow
    Write-ColoredOutput "If services don't start automatically, run:" $White
    Write-ColoredOutput "   ollama serve" $Cyan
    Write-ColoredOutput "   # And start OpenWebUI according to its documentation" $Cyan
}

# Main script execution
try {
    Write-ColoredOutput "🤖 Droid Builder - AI Development Environment Setup" $Cyan
    Write-ColoredOutput "=====================================================" $Cyan
    
    # Check prerequisites
    if (-not (Test-AdminRights)) {
        throw "This script requires Administrator privileges. Please run as Administrator."
    }
    
    if (-not (Test-WingetAvailable)) {
        throw "winget is not available. Please install the App Installer from Microsoft Store."
    }
    
    Write-ColoredOutput "✅ Prerequisites check passed" $Green
    
    # Update winget sources
    Write-ColoredOutput "Updating winget sources..." $Cyan
    winget source update
    
    # Install core components
    $coreInstalls = @(
        @{ Id = "Ollama.Ollama"; Name = "Ollama"; Optional = $false },
        @{ Id = "Python.Python.3.11"; Name = "Python 3.11"; Optional = $false }
    )
    
    foreach ($install in $coreInstalls) {
        Install-WingetPackage -PackageId $install.Id -PackageName $install.Name -Optional:$install.Optional
    }
    
    # Install OpenWebUI via pip
    Write-ColoredOutput "Installing OpenWebUI via pip..." $Cyan
    try {
        $pipResult = pip install open-webui
        Write-ColoredOutput "✅ OpenWebUI installed successfully" $Green
    }
    catch {
        Write-ColoredOutput "❌ Failed to install OpenWebUI via pip: $($_.Exception.Message)" $Red
    }
    
    # Install optional components
    if (-not $SkipOptional) {
        $optionalInstalls = @(
            @{ Id = "Git.Git"; Name = "Git"; Optional = $true },
            @{ Id = "Microsoft.VisualStudioCode"; Name = "Visual Studio Code"; Optional = $true },
            @{ Id = "OpenJS.NodeJS"; Name = "Node.js"; Optional = $true }
        )
        
        foreach ($install in $optionalInstalls) {
            Install-WingetPackage -PackageId $install.Id -PackageName $install.Name -Optional:$install.Optional
        }
    }
    
    # Set up MCP Tools
    Install-MCPToolsServers
    
    # Set up Memvid (manual installation required)
    Install-MemvidManually
    
    # Configure OpenWebUI
    Set-OpenWebUIConfiguration
    
    # Set up external agent configurations
    Set-ExternalAgentConfiguration
    
    # Start services
    Start-Services -Auto
    
    # Show post-install instructions
    Show-PostInstallInstructions
    
}
catch {
    Write-ColoredOutput "❌ Script execution failed: $($_.Exception.Message)" $Red
    Write-ColoredOutput "Please check the error above and try again." $Yellow
    exit 1
}
