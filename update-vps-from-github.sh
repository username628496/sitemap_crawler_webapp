#!/bin/bash

# Quick update script - Pull code from GitHub and restart service on VPS
# Usage: ./update-vps-from-github.sh [vps-host]

set -e

VPS_USER="peter"
VPS_HOST="${1:-sm.aeseo1.org}"
VPS_PATH="/var/www/sitemap-crawler"

echo "=========================================="
echo "📥 Update VPS from GitHub"
echo "=========================================="
echo "VPS: $VPS_USER@$VPS_HOST"
echo ""

# Execute update commands on VPS
ssh "$VPS_USER@$VPS_HOST" << 'ENDSSH'
set -e

cd /var/www/sitemap-crawler

echo "💾 Step 1: Backing up databases..."
cd backend
cp crawl_history.db crawl_history.db.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "  No sitemap history"
cp gp_content_history.db gp_content_history.db.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "  No GP content history"
ls -lh *.backup.* 2>/dev/null | tail -3 || echo "  No backups found"
cd ..

echo ""
echo "📥 Step 2: Pulling latest code from GitHub..."
git stash 2>/dev/null || true
git pull origin main
echo "✅ Code updated!"

echo ""
echo "📦 Step 3: Installing new dependencies..."
cd backend
source venv/bin/activate
pip install -q -r requirements.txt
echo "✅ Dependencies installed"

echo ""
echo "🔄 Step 4: Restarting backend service..."
sudo systemctl restart sitemap-crawler
sleep 3

echo ""
echo "✅ Step 5: Checking service status..."
if sudo systemctl is-active --quiet sitemap-crawler; then
    echo "✅ Backend service is running"
    sudo systemctl status sitemap-crawler --no-pager -l | head -10
else
    echo "❌ Backend service failed to start!"
    sudo journalctl -u sitemap-crawler -n 20 --no-pager
    exit 1
fi

echo ""
echo "🏥 Step 6: Testing health endpoint..."
sleep 2
curl -s http://localhost:8000/api/health | python3 -m json.tool | head -20 || echo "❌ Health check failed"

echo ""
echo "=========================================="
echo "✅ Update Complete!"
echo "=========================================="
echo ""
echo "🌐 Test: https://sm.aeseo1.org"
echo ""
echo "📊 View logs:"
echo "   sudo journalctl -u sitemap-crawler -f"
echo ""

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 VPS updated successfully!"
    echo ""
else
    echo ""
    echo "❌ Update failed!"
    exit 1
fi
