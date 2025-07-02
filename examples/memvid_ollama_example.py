#!/usr/bin/env python3
"""
Memvid + Ollama Integration Example
This script demonstrates how to use Memvid with Ollama for AI memory capabilities.

Usage:
    python memvid_ollama_example.py

Make sure:
1. Ollama is running (ollama serve)
2. You have a model installed (ollama pull llama2)  
3. Memvid is installed (pip install memvid)
"""

import os
import sys
import requests
from pathlib import Path

def check_prerequisites():
    """Check if all prerequisites are met"""
    print("🔍 Checking prerequisites...")
    
    # Check Memvid installation
    try:
        import memvid
        print("✅ Memvid is installed")
    except ImportError:
        print("❌ Memvid not found. Install with: pip install memvid")
        return False
    
    # Check Ollama connection
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            print("✅ Ollama is running")
            models = response.json().get('models', [])
            if models:
                print(f"📦 Available models: {', '.join([m['name'] for m in models])}")
            else:
                print("⚠️ No models found. Install with: ollama pull llama2")
                return False
        else:
            print("❌ Ollama not responding")
            return False
    except requests.exceptions.RequestException:
        print("❌ Cannot connect to Ollama. Make sure it's running: ollama serve")
        return False
    
    return True

def create_sample_memory():
    """Create a sample memory with some example content"""
    print("\n📝 Creating sample memory...")
    
    from memvid import MemvidEncoder
    
    # Sample content about AI and technology
    sample_content = """
    Artificial Intelligence (AI) is revolutionizing how we interact with technology. 
    Machine learning algorithms can process vast amounts of data to identify patterns 
    and make predictions. Large Language Models (LLMs) like those running on Ollama 
    can understand and generate human-like text.
    
    Ollama is a powerful tool for running large language models locally on your machine. 
    It supports various models including Llama 2, Code Llama, Mistral, and many others. 
    This enables privacy-focused AI applications that don't require internet connectivity.
    
    Vector databases and semantic search technologies allow AI systems to quickly 
    retrieve relevant information from large datasets. This forms the basis of 
    Retrieval Augmented Generation (RAG) systems.
    
    Memvid combines these concepts by storing text data in video format, enabling 
    efficient compression and fast retrieval. This innovative approach allows for 
    storing millions of text chunks in a single MP4 file.
    """
    
    try:
        encoder = MemvidEncoder()
        encoder.add_text(sample_content, chunk_size=200, overlap=30)
        
        # Create memory files
        memory_dir = Path.home() / ".memvid_example"
        memory_dir.mkdir(exist_ok=True)
        
        video_path = memory_dir / "sample_memory.mp4"
        index_path = memory_dir / "sample_memory_index.json"
        
        encoder.build_video(str(video_path), str(index_path))
        
        print(f"✅ Sample memory created:")
        print(f"   📹 Video: {video_path}")
        print(f"   📊 Index: {index_path}")
        
        return str(video_path), str(index_path)
        
    except Exception as e:
        print(f"❌ Error creating memory: {e}")
        return None, None

def search_memory(video_path, index_path, query):
    """Search the memory for relevant content"""
    print(f"\n🔍 Searching for: '{query}'")
    
    try:
        from memvid import MemvidRetriever
        
        retriever = MemvidRetriever(video_path, index_path)
        results = retriever.search(query, top_k=3)
        
        print("📋 Search results:")
        for i, chunk in enumerate(results, 1):
            print(f"   {i}. {chunk[:150]}...")
        
        return results
    
    except Exception as e:
        print(f"❌ Error searching memory: {e}")
        return []

def chat_with_memory(video_path, index_path, model_name="llama2"):
    """Interactive chat session using memory context"""
    print(f"\n💬 Starting chat session with {model_name}")
    print("Commands: 'quit' to exit, 'search <query>' to search memory")
    print("=" * 50)
    
    try:
        from memvid import MemvidRetriever
        
        retriever = MemvidRetriever(video_path, index_path)
        
        while True:
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if user_input.lower().startswith('search '):
                query = user_input[7:]
                search_memory(video_path, index_path, query)
                continue
            
            if not user_input:
                continue
            
            # Get relevant context from memory
            context_chunks = retriever.search(user_input, top_k=2)
            context = '\n'.join(context_chunks)
            
            # Prepare prompt for Ollama
            prompt = f"""Context from memory:
{context}

User question: {user_input}

Please answer based on the context provided above. If the context doesn't contain relevant information, say so and provide a general response."""
            
            # Send to Ollama
            try:
                print("🤖 Assistant: ", end="", flush=True)
                
                response = requests.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": model_name,
                        "prompt": prompt,
                        "stream": True
                    },
                    stream=True
                )
                
                if response.status_code == 200:
                    for line in response.iter_lines():
                        if line:
                            data = line.decode('utf-8')
                            try:
                                import json
                                chunk = json.loads(data)
                                if 'response' in chunk:
                                    print(chunk['response'], end="", flush=True)
                                if chunk.get('done'):
                                    print()  # New line at the end
                                    break
                            except json.JSONDecodeError:
                                continue
                else:
                    print(f"Error: HTTP {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ Connection error: {e}")
                print("Make sure Ollama is running: ollama serve")
                break
                
    except Exception as e:
        print(f"❌ Error in chat session: {e}")

def main():
    """Main function to run the example"""
    print("🤖 Memvid + Ollama Integration Example")
    print("=" * 40)
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites not met. Please resolve the issues above.")
        return 1
    
    # Create sample memory
    video_path, index_path = create_sample_memory()
    if not video_path or not index_path:
        print("\n❌ Failed to create sample memory.")
        return 1
    
    # Demonstrate search
    search_results = search_memory(video_path, index_path, "Ollama and language models")
    
    if search_results:
        print(f"\n✅ Found {len(search_results)} relevant chunks")
        
        # Start interactive chat
        response = input("\n🚀 Would you like to start a chat session? (y/n): ").strip().lower()
        if response in ['y', 'yes']:
            chat_with_memory(video_path, index_path)
    
    print("\n🎉 Example completed!")
    print(f"💡 Tip: Your sample memory is saved at {Path(video_path).parent}")
    print("   You can reuse it or create new memories with your own content.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
