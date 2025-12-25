#!/bin/bash

# ConCreat Setup Script
echo "🚀 Setting up ConCreat..."

# Check for Python 3.11+
echo "🐍 Checking Python version..."
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3.12 &> /dev/null; then
    PYTHON_CMD="python3.12"
elif command -v python3.13 &> /dev/null; then
    PYTHON_CMD="python3.13"
else
    echo "❌ Error: Python 3.11+ is required but not found."
    echo "Please install Python 3.11 or higher and ensure it's available in PATH."
    exit 1
fi

# Verify Python version meets minimum requirement
PYTHON_VERSION=$($PYTHON_CMD -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
if [ "$(printf '%s\n' "$PYTHON_VERSION" "3.11" | sort -V | head -n1)" != "3.11" ]; then
    echo "❌ Error: Python $PYTHON_VERSION found, but Python 3.11+ is required."
    exit 1
fi

echo "✅ Using Python $PYTHON_VERSION"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create Python virtual environment
echo "🐍 Creating Python virtual environment..."
$PYTHON_CMD -m venv venv

# Activate virtual environment and install Python dependencies
echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip

# Clone Chatterbox model files
echo "Cloning Chatterbox model repository..."
if [ ! -d "chatterbox" ]; then
    git clone https://huggingface.co/ResembleAI/chatterbox --depth 1
else
    echo "Chatterbox directory already exists, skipping clone"
fi

# Install packages one by one to handle potential conflicts
echo "Installing torch..."
pip install "torch>=2.0.0"
echo "Installing torchaudio..."
pip install "torchaudio>=2.0.0"
echo "Installing scipy..."
pip install "scipy>=1.10.0"
echo "Installing numpy (compatible version)..."
pip install "numpy>=1.24.0,<1.26.0"
echo "Installing chatterbox-tts..."
pip install "chatterbox-tts>=0.1.6"

# If chatterbox-tts fails, try installing from the cloned repo
if [ $? -ne 0 ]; then
    echo "Installing chatterbox-tts from cloned repository..."
    pip install -e chatterbox
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "The app will be available at http://localhost:3000"
