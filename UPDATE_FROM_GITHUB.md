# 🔄 Hướng dẫn cập nhật code từ GitHub lên VPS

## 📋 Thông tin VPS
- **Domain:** sm.aeseo1.org
- **User:** peter (hoặc root)
- **Project path:** `/var/www/sitemap-crawler`
- **GitHub:** https://github.com/username628496/sitemap_crawler_webapp

---

## 🚀 Bước 1: SSH vào VPS

```bash
ssh peter@sm.aeseo1.org
# Hoặc nếu dùng root:
# ssh root@sm.aeseo1.org
```

---

## 🔄 Bước 2: Di chuyển vào thư mục project

```bash
cd /var/www/sitemap-crawler
```

Nếu chưa có thư mục này, clone project lần đầu:
```bash
cd /var/www
git clone https://github.com/username628496/sitemap_crawler_webapp.git sitemap-crawler
cd sitemap-crawler
```

---

## 📥 Bước 3: Pull code mới từ GitHub

```bash
# Kiểm tra branch hiện tại
git branch

# Stash các thay đổi local (nếu có)
git stash

# Pull code mới
git pull origin main

# Nếu có conflict, xem status
git status
```

**Lưu ý quan trọng:** File `.env` sẽ KHÔNG bị ghi đè vì nó trong `.gitignore`

---

## 🔧 Bước 4: Cập nhật Backend

```bash
cd /var/www/sitemap-crawler/backend

# Kích hoạt virtual environment
source venv/bin/activate

# Cài đặt dependencies mới (nếu có)
pip install --upgrade pip
pip install -r requirements.txt

# Kiểm tra config
cat .env | grep -E "PORT|MAX_WORKERS|DATABASE"

# Deactivate venv
deactivate
```

---

## 🎨 Bước 5: Build Frontend (nếu có thay đổi)

```bash
cd /var/www/sitemap-crawler/frontend

# Cài đặt dependencies (nếu cần)
npm install

# Build frontend
npm run build

# Kiểm tra dist folder
ls -lh dist/
```

---

## 🔄 Bước 6: Restart Backend Service

```bash
# Restart backend service
sudo systemctl restart sitemap-crawler

# Kiểm tra status
sudo systemctl status sitemap-crawler

# Xem logs nếu có lỗi
sudo journalctl -u sitemap-crawler -n 50 --no-pager
```

---

## 🌐 Bước 7: Reload Nginx (nếu cần)

```bash
# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Hoặc restart nginx
sudo systemctl restart nginx
```

---

## ✅ Bước 8: Kiểm tra hoạt động

### 1. Test health endpoint
```bash
curl http://localhost:8000/api/health | python3 -m json.tool
```

Kết quả mong đợi:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T...",
  "components": {
    "database": {
      "status": "ok",
      "total_sessions": 123
    },
    "config": {
      "max_workers": 20,
      "request_timeout": 15
    }
  }
}
```

### 2. Test qua domain
```bash
curl https://sm.aeseo1.org/api/health
```

### 3. Test crawl một domain nhỏ
```bash
curl "https://sm.aeseo1.org/api/crawl-stream?domains=8hwtrje.uk.com"
```

---

## 🔍 Kiểm tra logs

### Backend logs
```bash
# Real-time logs
sudo journalctl -u sitemap-crawler -f

# Last 100 lines
sudo journalctl -u sitemap-crawler -n 100

# Logs with errors only
sudo journalctl -u sitemap-crawler -p err
```

### Nginx logs
```bash
# Access logs
sudo tail -f /var/log/nginx/sitemap_access.log

# Error logs
sudo tail -f /var/log/nginx/sitemap_error.log
```

---

## 🛠️ Troubleshooting

### Lỗi: Service không start được

```bash
# Xem chi tiết lỗi
sudo journalctl -u sitemap-crawler -n 50 --no-pager

# Kiểm tra port 8000 có bị chiếm không
sudo lsof -i :8000

# Kill process nếu cần
sudo kill -9 <PID>

# Restart service
sudo systemctl restart sitemap-crawler
```

### Lỗi: Git pull conflict

```bash
# Xem files bị conflict
git status

# Giữ lại version từ GitHub (overwrite local)
git checkout --theirs <file>

# Hoặc giữ lại version local
git checkout --ours <file>

# Sau khi resolve xong
git add .
git stash drop
```

### Lỗi: Frontend không update

```bash
# Clear browser cache hoặc hard refresh (Ctrl+Shift+R)

# Kiểm tra dist folder
ls -lh /var/www/sitemap-crawler/frontend/dist/

# Rebuild nếu cần
cd /var/www/sitemap-crawler/frontend
npm run build
```

### Lỗi: Module not found

```bash
cd /var/www/sitemap-crawler/backend
source venv/bin/activate
pip install -r requirements.txt --force-reinstall
deactivate
sudo systemctl restart sitemap-crawler
```

---

## 📦 Commit mới nhất đã push

```
Commit: 96a2bd7
Message: Remove proxy support and clean up codebase
Changes:
- Removed all proxy configuration
- Fixed health endpoint
- Cleaned up error messages
- -558 lines of code removed
```

---

## 🆕 Latest Fix: GZIP Decompression (2026-03-01)

### Issue
Sitemap content was being returned as GZIP compressed binary data:
```
�䚮ꤩv��%V}g�����������a/��y�ᥟz...
```

### Solution
Added automatic GZIP decompression to `backend/services/sitemap_parser.py`:

1. **Added GZIP import**
   ```python
   import gzip
   ```

2. **Created helper method `_decompress_if_needed()`**
   - Detects GZIP magic bytes (0x1f 0x8b)
   - Checks for non-printable characters (>30% garbage)
   - Automatically decompresses and decodes to UTF-8

3. **Applied to all response paths in `fetch_url()`**
   - Line ~308: Redirect tracking path
   - Line ~322: Fast path (cloudscraper)
   - Line ~343: SSL fallback with redirect tracking
   - Line ~356: SSL fallback fast path

### Testing domains with GZIP sitemaps
```
bufa.cc
kubet86.net
33bet.com.vc
```

### Files Modified
- `backend/services/sitemap_parser.py`
  - Line 8: Added `import gzip`
  - Lines 217-263: Added `_decompress_if_needed()` method
  - Lines 305, 320, 341, 354: Applied decompression

**Status**: ✅ FIXED - Backend tested and working

---

## 🆕 Latest Fix: Title Extraction Issue (2026-03-01)

### Issue
Title extraction was returning "(No title)" for all URLs despite HTML being fetched successfully:
```
🔍 [DEBUG] HTML length: 22764, Title: '(No title)', Keywords: 'Bắn Cá Online'
```

### Root Cause
The backend was using **Googlebot User-Agent** by default (from `Config.REQUEST_HEADERS`), which caused websites to serve reduced/mobile versions of pages without proper `<title>` tags.

**Evidence**:
- HTML fetched by backend: 22,764 bytes (reduced version)
- HTML fetched by real browser: 99,612 bytes (full version with title)

### Solution
Modified `backend/services/content_crawler_service.py` to override User-Agent for content crawling:

```python
def __init__(self):
    self.timeout = Config.REQUEST_TIMEOUT
    self.headers = Config.REQUEST_HEADERS.copy()
    # Use real browser User-Agent for content crawling (not Googlebot)
    # This ensures we get full HTML content with title tags
    self.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    self.max_workers = 5
    self.sitemap_parser = SitemapParser()
    self.html_parser = HTMLParser()
```

### Testing
```bash
# Test the same URL that was failing before
curl "http://localhost:8000/api/gp-content/crawl-stream?domains=33bet.com.vc"
```

Expected result: Title should now be extracted correctly instead of "(No title)"

### Files Modified
- `backend/services/content_crawler_service.py`
  - Line 30-36: Override User-Agent with real browser string

**Status**: ✅ FIXED - Browser User-Agent now used for content crawling

---

## 🎯 Quick Commands (Copy & Paste)

### Update toàn bộ (1 command)
```bash
cd /var/www/sitemap-crawler && \
git stash && \
git pull origin main && \
cd backend && source venv/bin/activate && pip install -q -r requirements.txt && deactivate && \
cd ../frontend && npm install && npm run build && \
cd .. && \
sudo systemctl restart sitemap-crawler && \
sudo systemctl reload nginx && \
echo "✅ Update complete!" && \
curl http://localhost:8000/api/health | python3 -m json.tool
```

### Chỉ update backend (không build frontend)
```bash
cd /var/www/sitemap-crawler && \
git pull origin main && \
cd backend && source venv/bin/activate && pip install -q -r requirements.txt && deactivate && \
sudo systemctl restart sitemap-crawler && \
echo "✅ Backend updated!" && \
curl http://localhost:8000/api/health | python3 -m json.tool
```

### Chỉ update frontend
```bash
cd /var/www/sitemap-crawler && \
git pull origin main && \
cd frontend && npm install && npm run build && \
echo "✅ Frontend updated! Clear browser cache and refresh."
```

---

## ⚠️ Lưu ý quan trọng

1. **File .env sẽ KHÔNG bị ghi đè** khi pull code (vì nó trong .gitignore)
2. **Database sẽ KHÔNG bị xóa** (crawl_history.db cũng trong .gitignore)
3. Luôn **kiểm tra logs** sau khi update
4. **Test health endpoint** trước khi test crawl
5. Nếu có lỗi, xem logs với: `sudo journalctl -u sitemap-crawler -f`

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Service status: `sudo systemctl status sitemap-crawler`
2. Backend logs: `sudo journalctl -u sitemap-crawler -n 100`
3. Nginx logs: `sudo tail -f /var/log/nginx/sitemap_error.log`
4. Port 8000 available: `sudo lsof -i :8000`
5. File permissions: `ls -la /var/www/sitemap-crawler/`

---

**Cập nhật lần cuối:** 2026-01-31
**Commit:** 96a2bd7 (Remove proxy support)
