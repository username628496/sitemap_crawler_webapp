#!/bin/bash

# ==============================================================================
# Update Script for Sitemap Crawler Webapp (sm.aeseo1.org)
# ==============================================================================
# Script để update toàn bộ application từ GitHub
# Usage: sudo ./update-all.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/sitemap-crawler"
BACKUP_DIR="/var/www/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SERVICE_NAME="sitemap-crawler"

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Vui lòng chạy script với sudo: sudo ./update-all.sh"
    exit 1
fi

print_info "=========================================="
print_info "Bắt đầu update Sitemap Crawler Webapp"
print_info "Timestamp: $TIMESTAMP"
print_info "=========================================="

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Step 1: Backup current database
print_info "Step 1/7: Backup database..."
if [ -f "$APP_DIR/backend/crawl_history.db" ]; then
    cp "$APP_DIR/backend/crawl_history.db" "$BACKUP_DIR/crawl_history_${TIMESTAMP}.db"
    print_success "Database backed up to $BACKUP_DIR/crawl_history_${TIMESTAMP}.db"
else
    print_warning "Database file không tồn tại, bỏ qua backup"
fi

# Step 2: Stop backend service
print_info "Step 2/7: Dừng backend service..."
if systemctl is-active --quiet "$SERVICE_NAME"; then
    systemctl stop "$SERVICE_NAME"
    print_success "Backend service đã dừng"
else
    print_warning "Backend service không chạy"
fi

# Step 3: Pull latest code from GitHub
print_info "Step 3/7: Pull code mới từ GitHub..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main
print_success "Code đã được update từ GitHub"

# Step 4: Update backend
print_info "Step 4/7: Update backend dependencies..."
cd "$APP_DIR/backend"

# Activate virtual environment and update dependencies
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    pip install -r requirements.txt --upgrade
    deactivate
    print_success "Backend dependencies đã được update"
else
    print_error "Virtual environment không tồn tại!"
    exit 1
fi

# Step 5: Update frontend
print_info "Step 5/7: Update frontend..."
cd "$APP_DIR/frontend"

# Install dependencies and build
npm install
npm run build
print_success "Frontend đã được build lại"

# Step 6: Restart services
print_info "Step 6/7: Khởi động lại services..."

# Start backend service
systemctl start "$SERVICE_NAME"
sleep 3

# Check if service started successfully
if systemctl is-active --quiet "$SERVICE_NAME"; then
    print_success "Backend service đã khởi động"
else
    print_error "Backend service không khởi động được!"
    print_error "Kiểm tra logs: sudo journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi

# Reload Nginx
systemctl reload nginx
print_success "Nginx đã được reload"

# Step 7: Verify deployment
print_info "Step 7/7: Kiểm tra deployment..."

# Wait a moment for service to fully start
sleep 2

# Check backend health
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    print_success "Backend health check: OK"
else
    print_warning "Backend health check: FAILED (có thể chưa có /api/health endpoint)"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    print_success "Nginx status: Running"
else
    print_error "Nginx status: Not running!"
fi

print_info "=========================================="
print_success "Update hoàn tất!"
print_info "=========================================="
print_info ""
print_info "Thông tin hữu ích:"
print_info "  - Backend logs: sudo journalctl -u $SERVICE_NAME -f"
print_info "  - Nginx logs: sudo tail -f /var/log/nginx/error.log"
print_info "  - Database backup: $BACKUP_DIR/crawl_history_${TIMESTAMP}.db"
print_info "  - Website: https://sm.aeseo1.org"
print_info ""
print_success "Deployment updated successfully! 🚀"
