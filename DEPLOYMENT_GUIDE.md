# 🚀 Deployment Guide - Sitemap Crawler

## Vấn đề hiện tại đã phát hiện:

### ❌ Backend KHÔNG chạy đúng app
- Port 8000 đang chạy app **ranking-checker**, KHÔNG phải **sitemap-crawler**
- Do đó SSE và proxy KHÔNG hoạt động vì đang test sai app

### ❌ Thiếu file .env trong production
- Backend cần file `.env` để load cấu hình proxy
- File `.env.example` chỉ là template

---

## 🔧 Cách khắc phục (Local Development)

### 1. Tạo file .env với proxy enabled

File `.env` đã được tạo tại: `backend/.env`

```bash
# Kiểm tra file .env
cat backend/.env
```

Nội dung quan trọng:
```env
USE_PROXY=true
PROXY_HOST=180.93.75.90
PROXY_PORT=52916
PROXY_USERNAME=3aga3gh3
PROXY_PASSWORD=wIkN2o5b
```

### 2. Stop app ranking-checker đang chạy port 8000

```bash
# Tìm process đang chiếm port 8000
lsof -Pi :8000 -sTCP:LISTEN -t

# Kill process (PID 15037 trong trường hợp này)
kill 15037
```

### 3. Start backend sitemap-crawler

**Option A: Dùng script tự động**
```bash
chmod +x start-backend.sh
./start-backend.sh
```

**Option B: Start thủ công**
```bash
cd backend

# Activate virtual environment nếu có
source venv/bin/activate

# Start Flask
python app.py
```

### 4. Test proxy và SSE

```bash
# Test health check (xem proxy status)
curl http://localhost:8000/api/health | python3 -m json.tool

# Test SSE endpoint
curl -N "http://localhost:8000/api/crawl-stream?domains=example.com"
```

**Expected output:**
```json
{
  "status": "healthy",
  "components": {
    "proxy": {
      "enabled": true,
      "host": "180.93.75.90"
    }
  }
}
```

### 5. Test frontend real-time

1. Mở webapp: http://localhost:3001
2. Nhập 2-3 domains
3. Click "Bắt đầu Crawl"
4. **Quan sát**: Kết quả phải hiện **từng cái một** khi crawl xong, không đợi tất cả

---

## 🌐 Deployment to VPS

### Bước 1: Upload code lên VPS

```bash
# Từ máy local
cd /Users/peter/sitemap-crawler-webapp

# Sync code lên VPS (thay your-vps-ip)
rsync -avz --exclude 'venv' --exclude 'node_modules' --exclude '__pycache__' \
  . peter@your-vps-ip:/var/www/sitemap-crawler/
```

### Bước 2: Tạo file .env trên VPS

```bash
# SSH vào VPS
ssh peter@your-vps-ip

# Navigate to backend
cd /var/www/sitemap-crawler/backend

# Copy và edit .env
cp .env.example .env
nano .env
```

**Set các giá trị sau trong .env:**
```env
FLASK_ENV=production
USE_PROXY=true
PROXY_HOST=180.93.75.90
PROXY_PORT=52916
PROXY_USERNAME=3aga3gh3
PROXY_PASSWORD=wIkN2o5b
MAX_WORKERS=20
```

### Bước 3: Install dependencies trên VPS

```bash
cd /var/www/sitemap-crawler/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Bước 4: Setup systemd service

Tạo file `/etc/systemd/system/sitemap-crawler.service`:

```ini
[Unit]
Description=Sitemap Crawler Backend
After=network.target

[Service]
Type=simple
User=peter
WorkingDirectory=/var/www/sitemap-crawler/backend
Environment="PATH=/var/www/sitemap-crawler/backend/venv/bin"
ExecStart=/var/www/sitemap-crawler/backend/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Hoặc dùng Gunicorn (recommended):**

```ini
[Unit]
Description=Sitemap Crawler Backend (Gunicorn)
After=network.target

[Service]
Type=notify
User=peter
WorkingDirectory=/var/www/sitemap-crawler/backend
Environment="PATH=/var/www/sitemap-crawler/backend/venv/bin"
ExecStart=/var/www/sitemap-crawler/backend/venv/bin/gunicorn \
    --workers 4 \
    --bind 127.0.0.1:8000 \
    --timeout 300 \
    --worker-class sync \
    --access-logfile /var/log/sitemap-crawler/access.log \
    --error-logfile /var/log/sitemap-crawler/error.log \
    app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable và start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable sitemap-crawler
sudo systemctl start sitemap-crawler
sudo systemctl status sitemap-crawler
```

### Bước 5: Deploy nginx config

```bash
# Từ máy local, upload nginx config
scp nginx-config-vps-updated.conf peter@your-vps-ip:/tmp/

# Trên VPS, backup và replace
ssh peter@your-vps-ip
sudo cp /etc/nginx/sites-enabled/sm.aeseo1.org /etc/nginx/sites-enabled/sm.aeseo1.org.backup
sudo cp /tmp/nginx-config-vps-updated.conf /etc/nginx/sites-enabled/sm.aeseo1.org

# Test và reload
sudo nginx -t
sudo systemctl reload nginx
```

### Bước 6: Build và deploy frontend

```bash
# Từ máy local
cd /Users/peter/sitemap-crawler-webapp/frontend

# Build production
npm run build

# Upload dist to VPS
rsync -avz dist/ peter@your-vps-ip:/var/www/sitemap-crawler/frontend/dist/
```

### Bước 7: Verify deployment

```bash
# Test backend health
curl https://sm.aeseo1.org/api/health

# Test SSE (should see streaming response)
curl -N "https://sm.aeseo1.org/api/crawl-stream?domains=example.com"

# Check logs
sudo journalctl -u sitemap-crawler -f
```

---

## 🔍 Troubleshooting

### SSE không real-time

**Kiểm tra:**
1. Backend có đang chạy đúng app không?
   ```bash
   curl http://localhost:8000/api/health
   # Phải trả về "Sitemap Crawler API"
   ```

2. Nginx có disable buffering không?
   ```bash
   grep proxy_buffering /etc/nginx/sites-enabled/sm.aeseo1.org
   # Phải thấy: proxy_buffering off;
   ```

3. Check browser console:
   - Mở DevTools → Console
   - Phải thấy: "useCrawl: Calling onResultUpdate for [domain]"

### Proxy không hoạt động

**Kiểm tra:**
1. File .env có USE_PROXY=true không?
   ```bash
   grep USE_PROXY backend/.env
   ```

2. Test proxy trực tiếp:
   ```bash
   curl http://localhost:8000/api/health | grep proxy
   # Phải thấy: "enabled": true
   ```

3. Check logs khi crawl:
   ```bash
   # Should see proxy being used in requests
   tail -f backend/crawler.log
   ```

### Backend không start

```bash
# Check if port 8000 is already in use
lsof -Pi :8000 -sTCP:LISTEN

# Check systemd logs
sudo journalctl -u sitemap-crawler -n 50

# Check for Python errors
cd /var/www/sitemap-crawler/backend
source venv/bin/activate
python app.py  # Run manually to see errors
```

---

## 📊 Verify Everything Works

### Test checklist:

- [ ] Backend running on port 8000
- [ ] `/api/health` returns "proxy.enabled": true
- [ ] `/api/crawl-stream` returns SSE events
- [ ] Frontend shows results **one by one** as they complete
- [ ] Browser console shows "onResultUpdate" being called
- [ ] IP address used is 180.93.75.90 (residential proxy)

### Quick verification script:

```bash
cd /Users/peter/sitemap-crawler-webapp
./test-proxy-sse.sh
```

---

## 📝 Notes

- **Proxy IP**: 180.93.75.90 (Residential Vietnam)
- **Backend Port**: 8000 (NOT 5000)
- **SSE Endpoint**: `/api/crawl-stream`
- **Max Workers**: 20 (optimized for speed)
- **Request Timeout**: 15s (reduced from 20s)

---

## 🎯 Next Steps After Deployment

1. Monitor logs for first few hours:
   ```bash
   sudo journalctl -u sitemap-crawler -f
   ```

2. Test with real domains to verify proxy working

3. Monitor performance and adjust MAX_WORKERS if needed

4. Set up log rotation:
   ```bash
   sudo logrotate -f /etc/logrotate.d/sitemap-crawler
   ```
