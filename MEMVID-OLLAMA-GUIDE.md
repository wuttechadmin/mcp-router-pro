# Memvid + Ollama Integration Guide

This guide explains how to use Memvid with Ollama for advanced AI memory capabilities in your Droid Builder environment.

## 🧠 What is Memvid?

Memvid is a revolutionary AI memory system that:
- Stores millions of text chunks in video files (MP4)
- Provides lightning-fast semantic search
- Enables persistent memory for AI agents
- Works completely offline once set up

## 🔗 Integration with Ollama

Our setup script creates a custom integration between Memvid and Ollama, allowing you to:
- Create video-based knowledge bases from your documents
- Chat with your documents using local Ollama models
- Maintain persistent conversation memory
- Search through vast amounts of text instantly

## 📁 Installation Files

After running the setup script, you'll find these files in `%LOCALAPPDATA%\Memvid\`:

1. **`memvid-repo/`** - Cloned Memvid repository
2. **`memvid-ollama-integration.py`** - Python integration script
3. **`MemvidOllamaWrapper.psm1`** - PowerShell wrapper module

## 🚀 Quick Start

### 1. Verify Installation

```powershell
# Check if Memvid is installed
python -c "import memvid; print('Memvid installed successfully!')"

# Check if Ollama is running
ollama list
```

### 2. Create Your First Memory

```python
# Load the integration script
python -c "
import sys
sys.path.append(r'%LOCALAPPDATA%\Memvid')
from memvid_ollama_integration import create_memory_from_text

# Create a memory from text
video_path, index_path = create_memory_from_text(
    'This is important information about quantum computing and AI.',
    'test_memory'
)
print(f'Memory created: {video_path}')
"
```

### 3. Create Memory from Files

```python
python -c "
import sys
sys.path.append(r'%LOCALAPPDATA%\Memvid')
from memvid_ollama_integration import create_memory_from_files

# Create memory from multiple files
video_path, index_path = create_memory_from_files(
    ['document1.txt', 'document2.pdf'],
    'my_documents'
)
"
```

### 4. Chat with Your Memory

```python
python -c "
import sys
sys.path.append(r'%LOCALAPPDATA%\Memvid')
from memvid_ollama_integration import chat_with_ollama_memory

# Start chat session (requires Ollama to be running)
chat_with_ollama_memory(
    r'%LOCALAPPDATA%\Memvid\test_memory.mp4',
    r'%LOCALAPPDATA%\Memvid\test_memory_index.json',
    'llama2'  # or any other Ollama model you have
)
"
```

## 🔧 PowerShell Usage

You can also use the PowerShell wrapper for easier integration:

```powershell
# Import the module
Import-Module "$env:LOCALAPPDATA\Memvid\MemvidOllamaWrapper.psm1"

# Create memory from text
New-MemvidMemory -TextContent "Your important information here" -MemoryName "test"

# Search memory
Search-MemvidMemory -VideoPath "$env:LOCALAPPDATA\Memvid\test.mp4" -IndexPath "$env:LOCALAPPDATA\Memvid\test_index.json" -Query "important"

# Start chat session
Start-MemvidOllamaChat -VideoPath "$env:LOCALAPPDATA\Memvid\test.mp4" -IndexPath "$env:LOCALAPPDATA\Memvid\test_index.json" -ModelName "llama2"
```

## 📚 Use Cases

### 1. Personal Knowledge Base
Create a searchable video memory from all your documents:

```python
# Example: Process your entire Documents folder
import os
from pathlib import Path

# Collect all text files
docs_dir = Path.home() / "Documents"
text_files = list(docs_dir.glob("**/*.txt")) + list(docs_dir.glob("**/*.md"))

# Create memory
create_memory_from_files([str(f) for f in text_files], "personal_kb")
```

### 2. Research Assistant
Upload research papers and chat with them:

```python
# Create memory from research papers
create_memory_from_files(
    ["paper1.pdf", "paper2.pdf", "paper3.pdf"],
    "research_papers"
)

# Chat about your research
chat_with_ollama_memory(
    "research_papers.mp4",
    "research_papers_index.json",
    "llama2"
)
```

### 3. Project Documentation
Create searchable documentation for your projects:

```python
# Process all markdown files in a project
project_docs = ["README.md", "docs/api.md", "docs/tutorial.md"]
create_memory_from_files(project_docs, "project_docs")
```

## ⚙️ Configuration

The integration script includes several configuration options:

```python
MEMVID_CONFIG = {
    'memvid_dir': r'%LOCALAPPDATA%\Memvid',
    'ollama_base_url': 'http://localhost:11434',
    'default_model': 'llama2',
    'chunk_size': 512,        # Text chunk size
    'overlap': 50,            # Overlap between chunks
    'video_fps': 30,          # Video frame rate
    'video_codec': 'h264'     # Video codec
}
```

You can modify these settings in the `memvid-ollama-integration.py` file.

## 🐛 Troubleshooting

### Common Issues

1. **"ModuleNotFoundError: No module named 'memvid'"**
   ```bash
   # Install Memvid manually
   pip install memvid
   # Or install from the cloned repository
   cd "%LOCALAPPDATA%\Memvid\memvid-repo"
   pip install -e .
   ```

2. **"Connection error to Ollama"**
   ```bash
   # Make sure Ollama is running
   ollama serve
   
   # Check if models are available
   ollama list
   
   # Pull a model if needed
   ollama pull llama2
   ```

3. **"FAISS training issues"**
   - The script automatically falls back to Flat index for small datasets
   - For large datasets, ensure you have enough memory
   - Consider using smaller chunk sizes

4. **Video encoding issues**
   ```python
   # Try different codecs in the configuration
   'video_codec': 'mp4v'  # Instead of 'h264'
   ```

### Performance Tips

1. **Optimize chunk size**: 
   - Smaller chunks (256-512) for precise search
   - Larger chunks (1024-2048) for context

2. **Use appropriate models**:
   - `llama2` for general chat
   - `codellama` for technical documents
   - `mistral` for faster responses

3. **Memory management**:
   - Create separate memories for different topics
   - Use descriptive memory names
   - Regularly clean up unused memories

## 📖 Advanced Usage

### Custom Memory Processing

```python
# Custom processing with metadata
from memvid import MemvidEncoder
import json

encoder = MemvidEncoder()

# Add text with custom metadata
encoder.add_text(
    "Important document content",
    chunk_size=512,
    overlap=50,
    metadata={
        "source": "document.pdf",
        "category": "research",
        "date": "2024-01-01"
    }
)

# Build video with custom settings
encoder.build_video(
    "custom_memory.mp4",
    "custom_memory_index.json",
    fps=60,  # Higher FPS for more data density
    frame_size=512
)
```

### Batch Processing

```python
# Process multiple directories
from pathlib import Path

def process_directory_structure(base_dir, memory_name):
    all_files = []
    for ext in ['.txt', '.md', '.pdf']:
        all_files.extend(Path(base_dir).rglob(f'*{ext}'))
    
    create_memory_from_files([str(f) for f in all_files], memory_name)

# Process your entire project
process_directory_structure("C:/MyProjects/", "all_projects")
```

## 🔗 Resources

- [Memvid GitHub Repository](https://github.com/Olow304/memvid)
- [Ollama Documentation](https://ollama.ai/docs)
- [Droid Builder Repository](https://github.com/your-repo)

## 🤝 Contributing

If you find ways to improve the Memvid + Ollama integration:

1. Edit the integration script: `%LOCALAPPDATA%\Memvid\memvid-ollama-integration.py`
2. Test your changes
3. Submit improvements to the Droid Builder repository

---

**Happy knowledge building with Memvid + Ollama! 🚀**
