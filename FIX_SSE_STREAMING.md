# 🔴 Fix SSE Streaming - ResultCards không hiện real-time

## Vấn đề:
- Thanh tiến trình chạy OK ✅
- ResultCards chỉ hiện sau khi crawl xong HẾT ❌
- Phải đợi tất cả domain xong mới thấy kết quả ❌

## Nguyên nhân:
**Gunicorn `worker-class sync` không hỗ trợ SSE streaming tốt!**

Worker `sync` buffer response cho đến khi hoàn thành. SSE cần worker async để stream từng event một.

---

## ✅ Giải pháp:

### Bước 1: Cài gevent trên VPS

```bash
ssh root@your-vps

# Activate venv
cd /var/www/sitemap-crawler/backend
source venv/bin/activate

# Install gevent
pip install gevent

# Verify
pip list | grep gevent
```

### Bước 2: Update systemd service

Upload file mới:

```bash
# Từ local
scp sitemap-crawler-fixed.service root@your-vps:/tmp/

# Trên VPS
sudo cp /tmp/sitemap-crawler-fixed.service /etc/systemd/system/sitemap-crawler.service
sudo systemctl daemon-reload
```

### Bước 3: Restart service

```bash
sudo systemctl restart sitemap-crawler
sudo systemctl status sitemap-crawler
```

### Bước 4: Test SSE streaming

```bash
# Test với curl (should see results streaming one by one)
curl -N "http://localhost:8000/api/crawl-stream?domains=example.com,google.com,github.com"
```

**Expected output:**
```
data: {"status":"starting","message":"Khởi động crawler...","total":3}

data: {"domain":"example.com","status":"success","total_urls":123,...}

data: {"domain":"google.com","status":"success","total_urls":456,...}

data: {"domain":"github.com","status":"success","total_urls":789,...}

data: {"status":"completed","message":"Tất cả domain đã crawl xong"}
```

---

## 🔍 So sánh Worker Types:

### ❌ `sync` (hiện tại - KHÔNG TỐT cho SSE)
```ini
--worker-class sync
--workers 4
```
- **Vấn đề**: Buffer toàn bộ response trước khi gửi
- **Kết quả**: SSE không streaming real-time
- **Use case**: REST API thông thường, không có streaming

### ✅ `gevent` (khuyến nghị cho SSE)
```ini
--worker-class gevent
--workers 1
--worker-connections 1000
```
- **Ưu điểm**: Async I/O, streaming real-time
- **Kết quả**: SSE stream từng event một
- **Use case**: SSE, WebSocket, long-polling

### ⚡ `eventlet` (alternative)
```ini
--worker-class eventlet
--workers 1
--worker-connections 1000
```
- Tương tự gevent
- Nếu gevent không work, thử eventlet:
  ```bash
  pip install eventlet
  ```

---

## 📝 Changes in systemd service:

```diff
ExecStart=/var/www/sitemap-crawler/backend/venv/bin/gunicorn \
-   --workers 4 \
+   --workers 1 \
    --bind 127.0.0.1:8000 \
-   --timeout 300 \
+   --timeout 3600 \
-   --worker-class sync \
+   --worker-class gevent \
+   --worker-connections 1000 \
    --keep-alive 5 \
```

**Key changes:**
1. `workers: 4 → 1` - Gevent handles concurrency internally
2. `timeout: 300 → 3600` - Allow long-running crawls (1 hour)
3. `worker-class: sync → gevent` - Enable async streaming
4. `worker-connections: 1000` - Max concurrent connections per worker

---

## 🧪 Test Real-time Streaming:

### Test 1: Console logs
Mở browser console khi crawl:
```
useCrawl: Calling onResultUpdate for example.com
App: handleResultUpdate called with 1 results
useCrawl: Calling onResultUpdate for google.com
App: handleResultUpdate called with 2 results
useCrawl: Calling onResultUpdate for github.com
App: handleResultUpdate called with 3 results
```

### Test 2: Visual check
1. Nhập 5 domains
2. Click "Bắt đầu Crawl"
3. **Quan sát**: ResultCard phải xuất hiện **TỪNG CÁI MỘT** khi mỗi domain crawl xong
4. **KHÔNG** đợi tất cả 5 domains xong mới hiện

### Test 3: Timing
- Domain 1 crawl xong sau 3s → ResultCard #1 hiện ngay lập tức
- Domain 2 crawl xong sau 5s → ResultCard #2 hiện ngay
- Domain 3 crawl xong sau 2s → ResultCard #3 hiện ngay
- **Không đợi** cả 3 domains (10s) xong mới hiện tất cả

---

## 🐛 Nếu vẫn không work:

### 1. Check nginx buffering
```bash
sudo nano /etc/nginx/sites-enabled/sm.aeseo1.org
```

Đảm bảo có:
```nginx
location /api/crawl-stream {
    proxy_buffering off;              # CRITICAL
    proxy_cache off;                  # CRITICAL
    proxy_set_header X-Accel-Buffering no;  # CRITICAL

    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_connect_timeout 3600s;
}
```

### 2. Check backend logs
```bash
sudo journalctl -u sitemap-crawler -f
```

Should see:
```
📤 Streamed result for example.com (1/3)
📤 Streamed result for google.com (2/3)
📤 Streamed result for github.com (3/3)
✅ Stream completed
```

### 3. Test without nginx (direct to backend)
```bash
# Temporarily change frontend API URL
# frontend/src/services/api.js
const api = axios.create({
  baseURL: 'http://your-vps-ip:8000/api',
})
```

Nếu work → vấn đề ở nginx
Nếu không work → vấn đề ở gunicorn/backend

---

## 📊 Performance với Gevent:

**Before (sync):**
- 4 workers × 1 request/worker = 4 concurrent requests
- SSE bị buffer, không real-time

**After (gevent):**
- 1 worker × 1000 connections = 1000 concurrent requests
- SSE streaming real-time
- Handle nhiều requests hơn với ít workers hơn

---

## ✅ Checklist sau khi fix:

- [ ] gevent installed: `pip list | grep gevent`
- [ ] systemd service updated với `worker-class gevent`
- [ ] service restarted: `sudo systemctl restart sitemap-crawler`
- [ ] curl test shows streaming: `curl -N http://localhost:8000/api/crawl-stream?domains=example.com`
- [ ] Browser console shows `onResultUpdate` being called cho từng domain
- [ ] ResultCards hiện từng cái một, không đợi tất cả xong
- [ ] nginx config có `proxy_buffering off`

---

## 🚀 Deploy commands (quick):

```bash
# Local
scp sitemap-crawler-fixed.service root@your-vps:/tmp/

# VPS
ssh root@your-vps
cd /var/www/sitemap-crawler/backend
source venv/bin/activate
pip install gevent
deactivate

sudo cp /tmp/sitemap-crawler-fixed.service /etc/systemd/system/sitemap-crawler.service
sudo systemctl daemon-reload
sudo systemctl restart sitemap-crawler
sudo systemctl status sitemap-crawler

# Test
curl -N "http://localhost:8000/api/crawl-stream?domains=example.com,google.com"
```

Sau khi làm xong, test lại trên webapp. ResultCards sẽ hiện **TỪNG CÁI MỘT** khi crawl xong!
