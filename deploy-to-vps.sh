#!/bin/bash

# Configuration
VPS_USER="peter"
VPS_HOST="sm.aeseo1.org"  # Hoặc IP address
VPS_PATH="/var/www/sitemap-crawler"
LOCAL_PATH="/Users/peter/sitemap-crawler-webapp"

echo "=========================================="
echo "🚀 Deploying Sitemap Crawler to VPS"
echo "=========================================="
echo ""
echo "VPS: $VPS_USER@$VPS_HOST"
echo "Path: $VPS_PATH"
echo ""

# Step 1: Build frontend
echo "📦 Step 1: Building frontend..."
cd "$LOCAL_PATH/frontend"
if npm run build; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Frontend build failed!"
    exit 1
fi
echo ""

# Step 2: Sync backend code (excluding venv, __pycache__, etc.)
echo "📤 Step 2: Syncing backend code to VPS..."
rsync -avz --progress \
    --exclude 'venv' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.env' \
    --exclude '*.db' \
    --exclude '*.log' \
    "$LOCAL_PATH/backend/" "$VPS_USER@$VPS_HOST:$VPS_PATH/backend/"

if [ $? -eq 0 ]; then
    echo "✅ Backend synced"
else
    echo "❌ Backend sync failed!"
    exit 1
fi
echo ""

# Step 3: Sync frontend dist
echo "📤 Step 3: Syncing frontend dist to VPS..."
rsync -avz --progress --delete \
    "$LOCAL_PATH/frontend/dist/" "$VPS_USER@$VPS_HOST:$VPS_PATH/frontend/dist/"

if [ $? -eq 0 ]; then
    echo "✅ Frontend synced"
else
    echo "❌ Frontend sync failed!"
    exit 1
fi
echo ""

# Step 4: Upload nginx config
echo "📤 Step 4: Uploading nginx config..."
scp "$LOCAL_PATH/nginx-config-vps-updated.conf" "$VPS_USER@$VPS_HOST:/tmp/nginx-sitemap-crawler.conf"
echo "✅ Nginx config uploaded to /tmp/"
echo ""

# Step 5: Upload systemd service
echo "📤 Step 5: Uploading systemd service..."
scp "$LOCAL_PATH/sitemap-crawler.service" "$VPS_USER@$VPS_HOST:/tmp/"
echo "✅ Systemd service uploaded to /tmp/"
echo ""

# Step 6: Execute deployment commands on VPS
echo "🔧 Step 6: Executing deployment commands on VPS..."
ssh "$VPS_USER@$VPS_HOST" << 'ENDSSH'
set -e

echo "📋 On VPS: Installing backend dependencies..."
cd /var/www/sitemap-crawler/backend

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "✅ Dependencies installed"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found! Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with proxy credentials:"
    echo "   nano /var/www/sitemap-crawler/backend/.env"
    echo ""
fi

# Install systemd service
echo "📋 Installing systemd service..."
sudo cp /tmp/sitemap-crawler.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable sitemap-crawler

# Create log directory
sudo mkdir -p /var/log/sitemap-crawler
sudo chown peter:peter /var/log/sitemap-crawler

# Restart backend service
echo "🔄 Restarting backend service..."
sudo systemctl restart sitemap-crawler
sleep 3
sudo systemctl status sitemap-crawler --no-pager -l

# Update nginx config
echo "🌐 Updating nginx config..."
sudo cp /tmp/nginx-sitemap-crawler.conf /etc/nginx/sites-enabled/sm.aeseo1.org

# Test nginx config
if sudo nginx -t; then
    echo "✅ Nginx config is valid"
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx config is invalid!"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🔍 Quick checks:"
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s http://localhost:8000/api/health | python3 -m json.tool | grep -E "status|proxy" || echo "❌ Health check failed"
echo ""

# Check service status
echo "2. Service status:"
systemctl is-active sitemap-crawler && echo "✅ Backend running" || echo "❌ Backend not running"
systemctl is-active nginx && echo "✅ Nginx running" || echo "❌ Nginx not running"
echo ""

echo "📊 View logs:"
echo "   Backend: sudo journalctl -u sitemap-crawler -f"
echo "   Nginx:   sudo tail -f /var/log/nginx/sitemap_error.log"
echo ""
echo "🌐 Test website: https://sm.aeseo1.org"
echo ""

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "🎉 Deployment Successful!"
    echo "=========================================="
    echo ""
    echo "✅ Backend deployed and running"
    echo "✅ Frontend deployed"
    echo "✅ Nginx configured"
    echo ""
    echo "🌐 Test your app: https://sm.aeseo1.org"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Verify .env file has correct proxy settings"
    echo "   2. Test crawl with 2-3 domains"
    echo "   3. Monitor logs for any errors"
    echo ""
else
    echo ""
    echo "❌ Deployment failed! Check the error messages above."
    exit 1
fi
