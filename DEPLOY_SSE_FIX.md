# 🚀 Deploy SSE Real-time Streaming Fix

## Changes Made:

### Backend (app.py):
1. ✅ Added gevent monkey patching for async compatibility
2. ✅ Added explicit SSE headers (Cache-Control, X-Accel-Buffering)

### Frontend (CrawlResults.jsx):
1. ✅ Added useEffect to log results updates for debugging
2. ✅ Added fade-in animation when new ResultCards appear
3. ✅ Staggered animation delays for better visual feedback

---

## 📦 Deployment Steps:

### Step 1: Deploy Backend

```bash
# SSH to VPS
ssh root@sm.aeseo1.org

# Pull latest code
cd /var/www/sitemap-crawler
git pull origin main

# Restart backend service
sudo systemctl restart sitemap-crawler

# Verify it's running
sudo systemctl status sitemap-crawler

# Watch logs for SSE events
sudo journalctl -u sitemap-crawler -f
```

Expected logs:
```
📤 Streamed result for example.com (1/3)
📤 Streamed result for google.com (2/3)
📤 Streamed result for github.com (3/3)
✅ Stream completed
```

### Step 2: Build & Deploy Frontend

**Option A: Build on local machine (if you have npm)**
```bash
# On local machine
cd /Users/peter/sitemap-crawler-webapp/frontend
npm install
npm run build

# Upload to VPS
rsync -avz --delete dist/ root@sm.aeseo1.org:/var/www/sitemap-crawler/frontend/dist/
```

**Option B: Build on VPS**
```bash
# SSH to VPS
ssh root@sm.aeseo1.org

# Install Node.js if not installed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build frontend
cd /var/www/sitemap-crawler/frontend
npm install
npm run build

# Verify dist exists
ls -la dist/
```

### Step 3: Verify Deployment

**Test 1: Check backend is running**
```bash
curl -s http://localhost:8000/api/health | python3 -m json.tool
```

**Test 2: Test SSE streaming**
```bash
curl -N "http://localhost:8000/api/crawl-stream?domains=example.com,google.com"
```

Should see:
```
data: {"status":"starting",...}

data: {"domain":"example.com",...}

data: {"domain":"google.com",...}

data: {"status":"completed",...}
```

Events should appear **one by one**, not all at once!

**Test 3: Test in browser**

Open https://sm.aeseo1.org → F12 Console:

```javascript
const es = new EventSource('https://sm.aeseo1.org/api/crawl-stream?domains=example.com,google.com');
let count = 0;
const start = Date.now();

es.onmessage = (e) => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    const data = JSON.parse(e.data);
    if (data.domain) {
        count++;
        console.log(`[+${elapsed}s] Result #${count}:`, data.domain);
    }
};
```

Expected output:
```
[+2.5s] Result #1: example.com
[+4.8s] Result #2: google.com
```

NOT:
```
[+5.0s] Result #1: example.com
[+5.0s] Result #2: google.com  ❌ (both at same time = buffered!)
```

### Step 4: Test Full Webapp

1. Open https://sm.aeseo1.org
2. Enter 3-5 domains
3. Click "Bắt đầu Crawl"
4. Open browser console (F12)

**What to look for:**

Console logs:
```
useCrawl: Received data: {domain: "example.com", ...}
useCrawl: Calling onResultUpdate for example.com
App: handleResultUpdate called with 1 results
CrawlResults: results updated, length: 1
useCrawl: Received data: {domain: "google.com", ...}
useCrawl: Calling onResultUpdate for google.com
App: handleResultUpdate called with 2 results
CrawlResults: results updated, length: 2
```

Visual:
- ✅ ResultCard #1 appears after ~2-3s (first domain done)
- ✅ ResultCard #2 appears after ~4-5s (second domain done)
- ✅ ResultCard #3 appears after ~6-8s (third domain done)
- ✅ Cards fade in with animation
- ❌ NOT all cards appearing together at the end!

---

## 🐛 Troubleshooting

### Problem: Still see buffering (all results at once)

**Check 1: Gevent monkey patching loaded?**
```bash
# Check backend logs on startup
sudo journalctl -u sitemap-crawler -n 50 | grep -i gevent
```

Should see:
```
[INFO] Using worker: gevent
```

**Check 2: Is nginx still buffering?**
```bash
# Check nginx config
sudo nginx -t
grep -A 10 "location /api/crawl-stream" /etc/nginx/sites-enabled/sm.aeseo1.org

# Should see:
proxy_buffering off;
proxy_set_header X-Accel-Buffering no;
```

**Check 3: Test direct to backend (bypass nginx)**
```bash
# SSH port forward
ssh -L 8000:localhost:8000 root@sm.aeseo1.org

# On local machine, test
curl -N "http://localhost:8000/api/crawl-stream?domains=example.com,google.com"
```

If this streams real-time but webapp doesn't → nginx issue
If this also buffers → backend/gevent issue

### Problem: Frontend not updating

**Check browser console logs:**

If you DON'T see:
```
CrawlResults: results updated, length: 1
CrawlResults: results updated, length: 2
```

Then React state is not updating. Check:
1. Is `onResultUpdate` being called? (should see in console)
2. Is `App.jsx` updating `crawlResults` state?
3. Hard refresh browser (Ctrl+Shift+R)

### Problem: Animation not working

Check Tailwind CSS is loaded:
- Open DevTools → Elements
- Inspect a ResultCard wrapper div
- Should have classes: `animate-in fade-in slide-in-from-top-2`

If classes missing → Tailwind purge removed them, need to rebuild with proper config.

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Backend logs show "Using worker: gevent"
- [ ] `curl` test shows events streaming one by one
- [ ] Browser console test shows events with different timestamps
- [ ] Webapp shows ResultCards appearing one by one (not all at once)
- [ ] Console logs show "CrawlResults: results updated" for each domain
- [ ] Cards fade in with animation
- [ ] Progress bar updates in real-time
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

## 🎯 Expected Behavior (Final)

### Before Fix:
1. Click "Bắt đầu Crawl" with 5 domains
2. Progress bar updates: 1/5, 2/5, 3/5, 4/5, 5/5 ✅
3. Wait... wait... wait...
4. At 5/5, ALL 5 ResultCards appear at once ❌

### After Fix:
1. Click "Bắt đầu Crawl" with 5 domains
2. Progress bar: 1/5 → ResultCard #1 appears ✅
3. Progress bar: 2/5 → ResultCard #2 appears ✅
4. Progress bar: 3/5 → ResultCard #3 appears ✅
5. Progress bar: 4/5 → ResultCard #4 appears ✅
6. Progress bar: 5/5 → ResultCard #5 appears ✅

Each card appears **immediately** after its domain finishes crawling!

---

## 📊 Performance Impact

**Before (sync worker):**
- 4 workers, buffered responses
- Memory: ~200MB
- Concurrent requests: 4

**After (gevent worker):**
- 1 worker with 1000 connections
- Memory: ~150MB
- Concurrent requests: 1000
- Real-time streaming ✅

---

## 🔄 Rollback Plan

If something breaks:

```bash
# Rollback to previous commit
cd /var/www/sitemap-crawler
git log --oneline -5
git checkout <previous-commit-hash>

# Restart backend
sudo systemctl restart sitemap-crawler

# Rebuild frontend
cd frontend
npm run build
```

Or restore from backup:
```bash
# Restore nginx config
sudo cp /etc/nginx/sites-enabled/sm.aeseo1.org.backup /etc/nginx/sites-enabled/sm.aeseo1.org
sudo systemctl reload nginx
```
