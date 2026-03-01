# 🚀 Hướng Dẫn Deploy Code Từ GitHub Lên VPS

## 📋 Tổng Quan

Có **2 phương pháp** để deploy code mới lên VPS:

1. **Phương pháp A**: Pull code trực tiếp từ GitHub trên VPS (Nhanh, đơn giản)
2. **Phương pháp B**: Build frontend trên máy local và rsync lên VPS (Cần build)

---

## ⚡ Phương Pháp A: Pull Từ GitHub Trên VPS (Recommended)

### Bước 1: Chạy script tự động (Từ máy local)

```bash
cd /Users/peter/sitemap-crawler-webapp
./update-vps-from-github.sh
```

Script này sẽ tự động:
- ✅ Backup databases
- ✅ Pull code mới từ GitHub
- ✅ Install dependencies
- ✅ Restart service
- ✅ Test health endpoint

### Bước 2: Verify deployment

```bash
# Từ máy local
curl https://sm.aeseo1.org/api/health | python3 -m json.tool
```

**Hoặc** test từ browser: https://sm.aeseo1.org/

---

## 🔧 Phương Pháp B: Manual Deploy Từ Local

### Chỉ deploy backend (không cần build frontend)

```bash
# 1. SSH vào VPS
ssh peter@sm.aeseo1.org

# 2. Navigate to project
cd /var/www/sitemap-crawler

# 3. Backup databases
cd backend
cp crawl_history.db crawl_history.db.backup.$(date +%Y%m%d_%H%M%S)
cp gp_content_history.db gp_content_history.db.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cd ..

# 4. Pull from GitHub
git stash
git pull origin main

# 5. Update dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt

# 6. Restart service
sudo systemctl restart sitemap-crawler

# 7. Check status
sudo systemctl status sitemap-crawler
curl http://localhost:8000/api/health | python3 -m json.tool
```

### Deploy cả frontend + backend

```bash
# 1. Build frontend (trên máy local)
cd /Users/peter/sitemap-crawler-webapp/frontend
npm run build

# 2. Upload frontend
rsync -avz --delete dist/ peter@sm.aeseo1.org:/var/www/sitemap-crawler/frontend/dist/

# 3. Làm theo các bước trên để pull backend
```

---

## 🔍 Kiểm Tra Sau Khi Deploy

### 1. Check service status

```bash
ssh peter@sm.aeseo1.org
sudo systemctl status sitemap-crawler
```

**Expect:**
```
● sitemap-crawler.service - Sitemap Crawler Backend with SSE Support
   Active: active (running)
```

### 2. Test health endpoint

```bash
curl https://sm.aeseo1.org/api/health
```

**Expect:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "components": {
    "database": "ok"
  }
}
```

### 3. Test GP Content endpoint

```bash
curl -N "https://sm.aeseo1.org/api/gp-content/crawl-stream?domains=example.com" | head -20
```

**Expect:** SSE streaming events

### 4. Test frontend

Mở browser: https://sm.aeseo1.org/

- ✅ Nhập domain
- ✅ Click "Crawl Content (GP)" (nút tím)
- ✅ Xem kết quả real-time
- ✅ Check History có 2 tabs
- ✅ Verify toast dùng icons (không có emoji)

---

## 🐛 Troubleshooting

### Backend không start

```bash
# Xem logs
sudo journalctl -u sitemap-crawler -n 50 --no-pager

# Check port 8000
sudo lsof -Pi :8000 -sTCP:LISTEN

# Restart thủ công
cd /var/www/sitemap-crawler/backend
source venv/bin/activate
python app.py
# Xem error nếu có
```

### Dependencies missing

```bash
cd /var/www/sitemap-crawler/backend
source venv/bin/activate

# Check installed packages
pip list | grep -E "beautifulsoup4|lxml|html5lib"

# Reinstall
pip install beautifulsoup4==4.12.3 lxml==5.3.0 html5lib==1.1
```

### Database issues

```bash
cd /var/www/sitemap-crawler/backend

# Check if databases exist
ls -lh *.db

# Check tables in GP Content DB
sqlite3 gp_content_history.db "SELECT name FROM sqlite_master WHERE type='table';"

# Expected: crawls, results
```

### Frontend 404 errors

```bash
# Check if dist folder exists
ls -la /var/www/sitemap-crawler/frontend/dist/

# Rebuild and redeploy frontend
cd /Users/peter/sitemap-crawler-webapp/frontend
npm run build
rsync -avz --delete dist/ peter@sm.aeseo1.org:/var/www/sitemap-crawler/frontend/dist/
```

---

## 📊 View Logs Real-time

### Backend logs

```bash
# Follow backend logs
sudo journalctl -u sitemap-crawler -f

# Last 100 lines
sudo journalctl -u sitemap-crawler -n 100 --no-pager
```

### Nginx logs

```bash
# Access logs
sudo tail -f /var/log/nginx/sitemap_access.log

# Error logs
sudo tail -f /var/log/nginx/sitemap_error.log
```

---

## 🔄 Rollback Nếu Có Vấn Đề

### Rollback code

```bash
ssh peter@sm.aeseo1.org
cd /var/www/sitemap-crawler

# Xem commit history
git log --oneline -10

# Rollback về commit trước (thay COMMIT_HASH)
git reset --hard COMMIT_HASH

# Restart service
sudo systemctl restart sitemap-crawler
```

### Restore database

```bash
cd /var/www/sitemap-crawler/backend

# Xem backups
ls -lh *.backup.*

# Restore (thay tên file backup)
cp crawl_history.db.backup.20260301_120000 crawl_history.db
cp gp_content_history.db.backup.20260301_120000 gp_content_history.db

# Restart
sudo systemctl restart sitemap-crawler
```

---

## 🎯 Workflow Deployment Chuẩn

### Khi có code mới:

1. **Local**: Test kỹ trên localhost
2. **Local**: Commit và push lên GitHub
3. **Local**: Chạy `./update-vps-from-github.sh`
4. **VPS**: Script tự động pull, install, restart
5. **Browser**: Test https://sm.aeseo1.org/
6. **Monitor**: Theo dõi logs 5-10 phút
7. **Done**: ✅

### Emergency fix:

```bash
# Fix nhanh trên VPS
ssh peter@sm.aeseo1.org
cd /var/www/sitemap-crawler/backend
nano app.py  # hoặc file cần fix
sudo systemctl restart sitemap-crawler

# Sau đó update GitHub
git add .
git commit -m "Emergency fix: ..."
git push origin main
```

---

## 📝 Checklist Trước Khi Deploy

- [ ] Code đã test kỹ trên local
- [ ] Đã commit và push lên GitHub
- [ ] Đã backup databases (script tự động làm)
- [ ] Đã thông báo cho team (nếu có)
- [ ] Chuẩn bị rollback nếu cần

---

## 📞 Quick Commands

```bash
# Update VPS từ GitHub (1 command)
./update-vps-from-github.sh

# Check status nhanh
ssh peter@sm.aeseo1.org "sudo systemctl status sitemap-crawler"

# Restart service
ssh peter@sm.aeseo1.org "sudo systemctl restart sitemap-crawler"

# View logs
ssh peter@sm.aeseo1.org "sudo journalctl -u sitemap-crawler -n 50 --no-pager"

# Test health
curl https://sm.aeseo1.org/api/health
```

---

## ✅ Done!

Deployment hoàn tất. Code mới đã chạy trên production.

**Next**: Monitor logs và test các tính năng mới.
