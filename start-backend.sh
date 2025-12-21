#!/bin/bash

echo "=========================================="
echo "Starting Sitemap Crawler Backend"
echo "=========================================="
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found, creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "📝 Please edit .env to configure proxy settings:"
    echo "   vi .env"
    echo ""
    exit 1
fi

# Display current configuration
echo "📋 Current Configuration:"
echo "------------------------"
grep -E "^USE_PROXY|^PROXY_HOST|^PROXY_PORT|^PORT|^MAX_WORKERS" .env
echo ""

# Check if port 8000 is already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 8000 is already in use!"
    echo "   Current process:"
    lsof -Pi :8000 -sTCP:LISTEN -t | xargs ps -p
    echo ""
    read -p "Kill existing process and continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        PID=$(lsof -Pi :8000 -sTCP:LISTEN -t)
        echo "Killing process $PID..."
        kill $PID
        sleep 2
    else
        echo "Exiting..."
        exit 1
    fi
fi

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
elif [ -d "../venv" ]; then
    echo "📦 Activating virtual environment..."
    source ../venv/bin/activate
else
    echo "⚠️  No virtual environment found!"
    echo "   Create one with: python3 -m venv venv"
    echo "   Then install dependencies: pip install -r requirements.txt"
fi

echo ""
echo "🚀 Starting Flask backend on port 8000..."
echo "   - Proxy: $(grep USE_PROXY .env | cut -d= -f2)"
echo "   - Press Ctrl+C to stop"
echo ""

# Start the application
python app.py
