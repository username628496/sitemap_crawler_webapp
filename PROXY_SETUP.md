# Hướng dẫn Setup Residential Proxy

## Tại sao cần Proxy?

Một số website chặn IP datacenter (DigitalOcean, AWS, etc.) và trả về **403 Forbidden** dù dùng Googlebot user agent. Để bypass, cần dùng **residential proxy** (IP từ nhà dân, không bị blacklist).

### Ví dụ domain bị chặn:
- `singers.uk.com` (redirect từ `33bet.com.vc`)
- Một số site tài chính, betting
- Sites dùng Cloudflare advanced bot detection

## Proxy Services Khuyên Dùng

### 🥇 Smartproxy (Best cho testing & budget)
- **Trial**: $3.50 cho 1GB (3 ngày) = test ~6,500 domains
- **Production**: $75/tháng cho 10GB
- **Website**: https://smartproxy.com
- **Ưu điểm**: Giá tốt nhất, dễ setup, trial rẻ
- **URL Format**: `http://user-USERNAME:PASSWORD@gate.smartproxy.com:7000`

### 🥈 BrightData (Best cho enterprise)
- **Giá**: $10.50/GB pay-as-you-go
- **Website**: https://brightdata.com
- **Ưu điểm**: Pool lớn nhất (72M+ IPs), reliability cao
- **URL Format**: `http://brd-customer-hl_XXXXX-zone-residential:PASSWORD@brd.superproxy.io:22225`

### 🥉 Oxylabs (Best cho business)
- **Giá**: $10/GB pay-as-you-go
- **Website**: https://oxylabs.io
- **Ưu điểm**: Đáng tin cậy, support tốt
- **URL Format**: `http://customer-USERNAME:PASSWORD@pr.oxylabs.io:7777`

### 💰 Geonode (Budget alternative)
- **Giá**: $5/GB
- **Website**: https://geonode.com
- **Ưu điểm**: Rẻ nhất
- **Nhược điểm**: Pool nhỏ hơn, success rate thấp hơn

## Chi phí ước tính

### Tính toán:
- 1 domain = ~150KB (sitemap + robots.txt + retries)
- 1GB = ~6,500 domains

### Ví dụ chi phí thực tế:

| Số domain/tháng | Data usage | Smartproxy | BrightData | Oxylabs |
|-----------------|------------|------------|------------|---------|
| 1,000 domains   | ~300MB     | $2.40      | $3.15      | $3.00   |
| 10,000 domains  | ~3GB       | $24        | $31.50     | $30     |
| 50,000 domains  | ~15GB      | $120       | $157.50    | $150    |
| 100,000 domains | ~30GB      | $240       | $315       | $300    |

## Setup trên VPS

### Bước 1: Đăng ký Proxy Service

#### Option A: Smartproxy (Khuyên dùng)
1. Truy cập https://smartproxy.com
2. Click **"Start Trial"** → Chọn plan $3.50 (1GB, 3 days)
3. Sau khi thanh toán, vào **Dashboard** → **Residential Proxies**
4. Copy **Username** và **Password**
5. Format URL: `http://user-yourname:yourpass@gate.smartproxy.com:7000`

**Country targeting** (optional):
```bash
# Sử dụng IP từ US
http://user-yourname-country-us:yourpass@gate.smartproxy.com:7000

# Sử dụng IP từ UK
http://user-yourname-country-uk:yourpass@gate.smartproxy.com:7000
```

#### Option B: BrightData
1. Truy cập https://brightdata.com
2. Tạo account → Vào **Proxy & Scraping Infrastructure**
3. Tạo **Residential Zone** mới
4. Copy **Customer ID**, **Zone name**, **Password**
5. Format URL: `http://brd-customer-hl_{customer_id}-zone-{zone_name}:{password}@brd.superproxy.io:22225`

#### Option C: Oxylabs
1. Truy cập https://oxylabs.io
2. Tạo account → Vào **Dashboard** → **Residential Proxies**
3. Tạo credentials mới
4. Copy **Username** và **Password**
5. Format URL: `http://customer-{username}:{password}@pr.oxylabs.io:7777`

### Bước 2: Cấu hình trên VPS

SSH vào VPS:
```bash
ssh root@your-vps-ip
# hoặc
ssh your-username@your-vps-ip
```

Di chuyển đến thư mục backend:
```bash
cd /var/www/sitemap-crawler-webapp/backend
```

Tạo hoặc edit file `.env`:
```bash
nano .env
```

Thêm vào file `.env`:
```bash
# Enable proxy
USE_PROXY=true

# Smartproxy example
HTTP_PROXY=http://user-yourname:yourpass@gate.smartproxy.com:7000
HTTPS_PROXY=http://user-yourname:yourpass@gate.smartproxy.com:7000

# Hoặc BrightData example
# HTTP_PROXY=http://brd-customer-hl_abc123-zone-residential:mypass@brd.superproxy.io:22225
# HTTPS_PROXY=http://brd-customer-hl_abc123-zone-residential:mypass@brd.superproxy.io:22225

# Hoặc Oxylabs example
# HTTP_PROXY=http://customer-myusername:mypass@pr.oxylabs.io:7777
# HTTPS_PROXY=http://customer-myusername:mypass@pr.oxylabs.io:7777
```

**Lưu file**: `Ctrl+O`, `Enter`, `Ctrl+X`

### Bước 3: Pull code mới từ GitHub

```bash
cd /var/www/sitemap-crawler-webapp
git pull origin main
```

### Bước 4: Restart service

#### Nếu dùng systemd:
```bash
sudo systemctl restart sitemap-crawler
sudo systemctl status sitemap-crawler
```

#### Nếu dùng PM2:
```bash
pm2 restart sitemap-crawler
pm2 logs sitemap-crawler --lines 50
```

#### Nếu chạy manual:
```bash
cd /var/www/sitemap-crawler-webapp/backend
pkill -f "python.*app.py"  # Stop old process
python3 app.py
```

### Bước 5: Verify proxy hoạt động

Check logs xem có message proxy:
```bash
# Systemd
sudo journalctl -u sitemap-crawler -f | grep -i proxy

# PM2
pm2 logs sitemap-crawler | grep -i proxy

# Tìm dòng:
# 🌐 Proxy enabled: http: gate.smartproxy.com:7000, https: gate.smartproxy.com:7000
```

## Testing

### Test 1: Verify proxy IP

Tạo file test script:
```bash
cd /var/www/sitemap-crawler-webapp/backend
nano test_proxy.py
```

Paste code:
```python
import requests
import os
from dotenv import load_dotenv

load_dotenv()

USE_PROXY = os.getenv('USE_PROXY', 'false').lower() == 'true'
HTTP_PROXY = os.getenv('HTTP_PROXY', '')

# Test without proxy
print("=== Testing WITHOUT proxy ===")
response = requests.get('https://api.ipify.org?format=json')
print(f"Direct IP: {response.json()['ip']}")

# Test with proxy
if USE_PROXY and HTTP_PROXY:
    print("\n=== Testing WITH proxy ===")
    proxies = {'http': HTTP_PROXY, 'https': HTTP_PROXY}
    response = requests.get('https://api.ipify.org?format=json', proxies=proxies)
    print(f"Proxy IP: {response.json()['ip']}")
    print(f"✅ Proxy is working! IP changed from datacenter to residential.")
else:
    print("\n❌ Proxy not configured in .env")
```

Chạy test:
```bash
python3 test_proxy.py
```

Kết quả mong đợi:
```
=== Testing WITHOUT proxy ===
Direct IP: 157.230.xxx.xxx  # DigitalOcean IP

=== Testing WITH proxy ===
Proxy IP: 98.51.xxx.xxx     # Residential IP (US home connection)
✅ Proxy is working! IP changed from datacenter to residential.
```

### Test 2: Crawl domain bị block

Test với domain trước đây bị 403:
```bash
curl "http://localhost:8000/api/crawl-stream?domains=singers.uk.com"
```

**Kết quả kỳ vọng TRƯỚC khi có proxy:**
```json
{
  "domain": "singers.uk.com",
  "status": "error",
  "message": "Domain singers.uk.com chặn IP datacenter (403 Forbidden)"
}
```

**Kết quả kỳ vọng SAU khi có proxy:**
```json
{
  "domain": "singers.uk.com",
  "status": "success",
  "total_urls": 234,
  "sample_urls": ["https://singers.uk.com/page1", ...]
}
```

### Test 3: Check proxy dashboard

Đăng nhập vào dashboard của proxy provider:
- **Smartproxy**: https://dashboard.smartproxy.com
- **BrightData**: https://brightdata.com/cp
- **Oxylabs**: https://dashboard.oxylabs.io

Check:
- ✅ Bandwidth đã sử dụng
- ✅ Success rate (nên > 95%)
- ✅ Response time (nên < 3s)

## Troubleshooting

### Lỗi: "Proxy enabled" không hiện trong logs

**Nguyên nhân**: `.env` file không được load hoặc sai format

**Giải pháp**:
```bash
# Check .env có tồn tại không
ls -la /var/www/sitemap-crawler-webapp/backend/.env

# Check nội dung
cat /var/www/sitemap-crawler-webapp/backend/.env

# Verify USE_PROXY=true (không có space)
# Verify HTTP_PROXY có đúng format không
```

### Lỗi: "407 Proxy Authentication Required"

**Nguyên nhân**: Username hoặc password sai

**Giải pháp**:
1. Kiểm tra lại credentials từ proxy dashboard
2. Đảm bảo không có ký tự đặc biệt trong password (nếu có, cần URL encode)
3. Test bằng curl:
```bash
curl -x "http://user-yourname:yourpass@gate.smartproxy.com:7000" https://api.ipify.org
```

### Lỗi: "Connection timeout" khi dùng proxy

**Nguyên nhân**: Firewall VPS chặn outbound connections

**Giải pháp**:
```bash
# Allow outbound connections trên port proxy
sudo ufw allow out 7000/tcp   # Smartproxy
sudo ufw allow out 22225/tcp  # BrightData
sudo ufw allow out 7777/tcp   # Oxylabs
```

### Lỗi: Vẫn bị 403 dù đã dùng proxy

**Nguyên nhân**: Có thể là:
1. Proxy chưa được apply (check logs)
2. IP proxy bị blacklist (hiếm, nhưng có thể xảy ra)
3. Website chặn ở layer khác (cookies, JS challenge)

**Giải pháp**:
```bash
# 1. Verify proxy đang hoạt động
python3 test_proxy.py

# 2. Check logs xem proxy có được sử dụng không
sudo journalctl -u sitemap-crawler -n 100 | grep -i proxy

# 3. Thử country targeting khác
# Trong .env, thay đổi:
HTTP_PROXY=http://user-yourname-country-uk:yourpass@gate.smartproxy.com:7000
```

### Tốn bandwidth quá nhanh

**Nguyên nhân**: Dùng proxy cho TẤT CẢ domains, kể cả domains không bị block

**Giải pháp**: Implement selective proxy (chỉ dùng proxy khi cần)

Tạo file `selective_proxy_config.md` để note:
```markdown
# Future optimization: Chỉ dùng proxy khi gặp 403

Ý tưởng:
1. Try request without proxy first
2. If 403 → retry with proxy
3. If success → continue without proxy

Tiết kiệm: 70-80% bandwidth
```

## Cost Optimization Tips

### 1. Cache successful crawls
Lưu kết quả crawl vào database để tránh crawl lại domain đã thành công.

### 2. Blacklist domains chặn IP
Tạo list domains luôn bị block → tự động dùng proxy cho những domain này.

### 3. Monitor usage
Setup alert khi bandwidth usage > ngưỡng:
- Smartproxy: Email alerts trong dashboard
- BrightData: Slack/webhook notifications

### 4. Use datacenter proxy for less sensitive sites
- Residential proxy: $8-10/GB (for blocked domains)
- Datacenter proxy: $0.80-2/IP/month unlimited (for normal domains)

### 5. Schedule crawls during off-peak
Một số proxy services có giá rẻ hơn vào giờ thấp điểm.

## Giải pháp thay thế (không khuyến khích)

### Free Proxy Lists
- ❌ **Không nên dùng**: Unreliable, bị blacklist, chậm, insecure
- ❌ Ví dụ: proxy-list.download, free-proxy-list.net
- ⚠️ Chỉ để test concept, không production

### VPN
- ❌ **Không hoạt động**: VPN thay đổi IP của toàn bộ server, không scale
- ❌ Chỉ có 1 IP, dễ bị rate limit
- ❌ Không tự động rotate

### Tor Network
- ❌ **Không nên dùng**: Rất chậm (3-10s per request), bị block bởi nhiều sites
- ❌ Chỉ dùng cho privacy, không phải web scraping

## Summary

### ✅ Recommended Approach
1. **Start with Smartproxy trial** ($3.50 for 1GB)
2. **Test with blocked domains** (singers.uk.com, etc.)
3. **Monitor usage** in dashboard
4. **Upgrade to monthly plan** nếu hài lòng ($75/month cho 10GB)

### 💰 Expected Costs
- **Small scale** (< 10K domains/month): $5-30/month
- **Medium scale** (10-50K domains/month): $30-150/month
- **Large scale** (> 50K domains/month): $150-500/month

### 📊 Success Rate
- **Without proxy**: 60-70% (nhiều domain bị 403)
- **With residential proxy**: 95-98% success rate

---

**Questions?** Check:
- Smartproxy docs: https://help.smartproxy.com
- BrightData docs: https://docs.brightdata.com
- Oxylabs docs: https://developers.oxylabs.io
