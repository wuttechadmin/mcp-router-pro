# Droid Builder Configuration Template
# Copy this file to 'config.ps1' and customize as needed

# Installation preferences
$Config = @{
    # Core settings
    InstallOptionalTools = $true
    AutoStartServices = $true
    CreateDesktopShortcuts = $true
    
    # Ollama settings
    OllamaModelsToInstall = @(
        "llama2",
        "codellama", 
        "mistral"
    )
    
    # OpenWebUI settings
    OpenWebUIPort = 8080
    EnableAuthentication = $false
    EnableRAG = $true
    
    # External agent configurations
    ExternalAgents = @{
        Azure = @{
            Enabled = $false
            Endpoint = "https://your-resource.openai.azure.com/"
            ApiKey = "your-azure-api-key"
            ApiVersion = "2024-02-15-preview"
            Models = @("gpt-4", "gpt-35-turbo")
        }
        
        GCP = @{
            Enabled = $false
            ProjectId = "your-gcp-project-id"
            Location = "us-central1"
            CredentialsPath = "path/to/service-account.json"
            Models = @("gemini-pro", "gemini-pro-vision")
        }
        
        HuggingFace = @{
            Enabled = $false
            ApiKey = "your-hf-token"
            Models = @(
                "meta-llama/Llama-2-7b-chat-hf",
                "microsoft/DialoGPT-large"
            )
        }
    }
    
    # MCP Tools settings
    MCPTools = @{
        EnableFilesystem = $true
        EnableGit = $true
        EnableWebSearch = $false  # Requires API key
        BraveApiKey = "your-brave-api-key"
    }
    
    # Memvid settings
    Memvid = @{
        DatabasePath = "$env:LOCALAPPDATA\Memvid\memory.db"
        EnableAutoSave = $true
        ApiEndpoint = "http://localhost:8001"
    }
    
    # Advanced settings
    Advanced = @{
        CustomInstallPath = $null  # Use default if null
        EnableLogging = $true
        LogPath = "$env:LOCALAPPDATA\DroidBuilder\Logs"
        MaxLogSize = "10MB"
    }
}

# Export configuration
$Config
