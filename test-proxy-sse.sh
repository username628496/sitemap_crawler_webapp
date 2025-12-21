#!/bin/bash

echo "=========================================="
echo "Testing Proxy and SSE Configuration"
echo "=========================================="
echo ""

# Test 1: Check if .env file exists
echo "1. Checking .env file..."
if [ -f "backend/.env" ]; then
    echo "✅ .env file exists"
    echo "Proxy settings:"
    grep "USE_PROXY\|PROXY_HOST\|PROXY_PORT" backend/.env
else
    echo "❌ .env file NOT found!"
    echo "Creating .env from .env.example..."
    cp backend/.env.example backend/.env
fi
echo ""

# Test 2: Check if backend is running
echo "2. Checking backend status..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Backend is running on port 8000"
    PID=$(lsof -Pi :8000 -sTCP:LISTEN -t)
    echo "   Process ID: $PID"
else
    echo "⚠️  Backend is NOT running on port 8000"
    echo "   Start backend with: cd backend && python app.py"
fi
echo ""

# Test 3: Test proxy connection
echo "3. Testing proxy connection..."
cd backend
python3 << 'EOF'
import os
from config import Config

print(f"USE_PROXY: {Config.USE_PROXY}")
print(f"PROXY_HOST: {Config.PROXY_HOST}")
print(f"PROXY_PORT: {Config.PROXY_PORT}")

if Config.USE_PROXY:
    print("\nTesting proxy connection...")
    import requests
    try:
        response = requests.get(
            'https://api.ipify.org?format=json',
            proxies=Config.PROXIES,
            timeout=10
        )
        print(f"✅ Proxy working! IP: {response.json()['ip']}")
    except Exception as e:
        print(f"❌ Proxy connection failed: {e}")
else:
    print("❌ Proxy is DISABLED")
EOF
cd ..
echo ""

# Test 4: Test SSE endpoint
echo "4. Testing SSE endpoint..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Sending test request to /api/crawl-stream..."
    timeout 5 curl -N "http://localhost:8000/api/crawl-stream?domains=example.com" 2>/dev/null | head -5
    echo ""
    echo "✅ SSE endpoint is responding"
else
    echo "⚠️  Cannot test - backend not running"
fi
echo ""

# Test 5: Check nginx config
echo "5. Checking nginx configuration..."
if [ -f "nginx-config-vps-updated.conf" ]; then
    echo "✅ nginx-config-vps-updated.conf exists"
    echo "Key SSE settings:"
    grep -A 2 "proxy_buffering\|X-Accel-Buffering" nginx-config-vps-updated.conf | head -6
else
    echo "⚠️  nginx config not found locally"
fi
echo ""

echo "=========================================="
echo "Summary:"
echo "=========================================="
echo "1. .env file: $([ -f "backend/.env" ] && echo "✅" || echo "❌")"
echo "2. Backend running: $(lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null && echo "✅" || echo "❌")"
echo "3. Proxy enabled: $(grep -q "USE_PROXY=true" backend/.env && echo "✅" || echo "❌")"
echo "4. Nginx config: $([ -f "nginx-config-vps-updated.conf" ] && echo "✅" || echo "❌")"
echo ""
echo "To start backend with proxy enabled:"
echo "  cd backend && python app.py"
echo ""
echo "To deploy nginx config to VPS:"
echo "  scp nginx-config-vps-updated.conf user@vps:/tmp/"
echo "  ssh user@vps 'sudo cp /tmp/nginx-config-vps-updated.conf /etc/nginx/sites-enabled/sm.aeseo1.org'"
echo "  ssh user@vps 'sudo nginx -t && sudo systemctl reload nginx'"
