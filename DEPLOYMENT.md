# Deployment Guide cho sm.aeseo1.org

## 📋 Tổng quan

Webapp này được thiết kế để deploy trên domain `https://sm.aeseo1.org/` với cấu hình sau:
- **Backend**: Flask API chạy trên port 8000
- **Frontend**: React SPA build static files
- **Web Server**: Nginx làm reverse proxy

## 🚀 Deployment Steps

### 1. Chuẩn bị VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip python3-venv nginx git

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Clone Repository

```bash
cd /var/www
sudo git clone <your-repo-url> sitemap-crawler
cd sitemap-crawler
sudo chown -R $USER:$USER /var/www/sitemap-crawler
```

### 3. Setup Backend

```bash
cd /var/www/sitemap-crawler/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
nano .env  # Edit if needed

# Test backend
FLASK_ENV=production python app.py
```

### 4. Setup Frontend

```bash
cd /var/www/sitemap-crawler/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### 5. Configure Nginx

Tạo file `/etc/nginx/sites-available/sm.aeseo1.org`:

```nginx
server {
    listen 80;
    server_name sm.aeseo1.org;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sm.aeseo1.org;

    # SSL certificates (Certbot sẽ tự động thêm)
    ssl_certificate /etc/letsencrypt/live/sm.aeseo1.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sm.aeseo1.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend static files
    root /var/www/sitemap-crawler/frontend/dist;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Flask backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings for SSE streaming
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;

        # Disable buffering for SSE
        proxy_buffering off;
        proxy_cache off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/sm.aeseo1.org /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL với Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d sm.aeseo1.org
```

### 7. Setup Systemd Service cho Backend

Tạo file `/etc/systemd/system/sitemap-crawler.service`:

```ini
[Unit]
Description=Sitemap Crawler Flask Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/sitemap-crawler/backend
Environment="FLASK_ENV=production"
ExecStart=/var/www/sitemap-crawler/backend/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable và start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sitemap-crawler
sudo systemctl start sitemap-crawler
sudo systemctl status sitemap-crawler
```

### 8. Configure Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## 🔄 Update Deployment

### Update Backend

```bash
cd /var/www/sitemap-crawler/backend
git pull
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart sitemap-crawler
```

### Update Frontend

```bash
cd /var/www/sitemap-crawler/frontend
git pull
npm install
npm run build
sudo systemctl reload nginx
```

## 📊 Monitoring

### Check Backend Status
```bash
sudo systemctl status sitemap-crawler
sudo journalctl -u sitemap-crawler -f
```

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Check Application Logs
```bash
tail -f /var/www/sitemap-crawler/backend/crawler.log
```

## 🔧 Troubleshooting

### Backend không start
```bash
# Check logs
sudo journalctl -u sitemap-crawler -n 50

# Test manually
cd /var/www/sitemap-crawler/backend
source venv/bin/activate
FLASK_ENV=production python app.py
```

### CORS errors
- Kiểm tra domain trong `backend/app.py` CORS config
- Đảm bảo `https://sm.aeseo1.org` đã được thêm vào origins

### SSL certificate issues
```bash
sudo certbot renew --dry-run
sudo certbot certificates
```

## 📝 Notes

- **Port 8000**: Flask backend chạy local, không public
- **Port 80/443**: Nginx reverse proxy
- **Database**: SQLite file tại `backend/crawl_history.db`
- **CORS**: Đã cấu hình cho `https://sm.aeseo1.org`
- **SSE Streaming**: Timeout 300s cho realtime crawl updates
- **Auto SSL renewal**: Certbot tự động renew certificates

## ✅ Production Checklist

- [ ] Clone repository
- [ ] Install backend dependencies
- [ ] Install frontend dependencies
- [ ] Build frontend production
- [ ] Configure Nginx
- [ ] Setup SSL certificate
- [ ] Create systemd service
- [ ] Configure firewall
- [ ] Test domain access
- [ ] Test API endpoints
- [ ] Test crawl functionality
- [ ] Setup monitoring/logging

## 🆘 Support

Nếu có vấn đề, check:
1. Backend logs: `sudo journalctl -u sitemap-crawler -f`
2. Nginx logs: `/var/log/nginx/error.log`
3. Application logs: `backend/crawler.log`
