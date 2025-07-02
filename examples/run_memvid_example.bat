@echo off
REM Memvid + Ollama Example Runner
REM This script helps you run the Memvid + Ollama integration example

echo.
echo ========================================
echo  Memvid + Ollama Integration Example
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

REM Check if Ollama is running
echo Checking if Ollama is running...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Ollama doesn't seem to be running
    echo Starting Ollama service...
    start /B ollama serve
    echo Waiting for Ollama to start...
    timeout /t 5 /nobreak >nul
    
    REM Check again
    curl -s http://localhost:11434/api/tags >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Could not start Ollama
        echo Please run 'ollama serve' manually and try again
        pause
        exit /b 1
    )
)

echo Ollama is running!
echo.

REM Check if required Python packages are installed
echo Checking Python dependencies...
python -c "import memvid" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Memvid...
    pip install memvid PyPDF2 sentence-transformers faiss-cpu beautifulsoup4 tqdm requests
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install required packages
        pause
        exit /b 1
    )
)

python -c "import requests" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing requests...
    pip install requests
)

echo Dependencies are ready!
echo.

REM Run the example
echo Running the Memvid + Ollama example...
echo.
python "%~dp0examples\memvid_ollama_example.py"

echo.
echo Example completed!
pause
