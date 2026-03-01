#!/bin/bash

# Start Backend for GP Content Crawler
# Automatically handles venv activation

cd "$(dirname "$0")/backend"

echo "🚀 Starting Sitemap Crawler Backend (with GP Content Crawler)..."

# Check if venv exists
if [ -d "venv" ]; then
    echo "✅ Activating virtual environment..."
    source venv/bin/activate
elif [ -d "env" ]; then
    echo "✅ Activating virtual environment..."
    source env/bin/activate
else
    echo "⚠️  No virtual environment found. Using system Python..."
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
pip install -q beautifulsoup4 lxml 2>/dev/null || echo "Dependencies already installed"

# Kill old process if running
OLD_PID=$(lsof -ti:8000 2>/dev/null)
if [ ! -z "$OLD_PID" ]; then
    echo "🔄 Stopping old backend process (PID: $OLD_PID)..."
    kill -9 $OLD_PID 2>/dev/null
    sleep 1
fi

# Start backend
echo "▶️  Starting Flask backend on port 8000..."
echo ""
python3 app.py
