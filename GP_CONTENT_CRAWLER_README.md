# 🔍 GP Content Crawler - Documentation

## Tổng Quan

**GP Content Crawler** là module mới được tích hợp vào ứng dụng Sitemap Crawler, cho phép crawl và trích xuất:
- ✅ **URL**
- ✅ **Title** (tiêu đề trang)
- ✅ **Keywords** (từ URL slug)

Output được tối ưu để **copy-paste trực tiếp vào Google Sheets** với format chuẩn (Tab-separated values).

---

## 🎯 Use Cases

### Khi nào dùng "Crawl Sitemap"?
- Chỉ cần danh sách URLs
- Submit URLs lên Google Search Console / Indexing services
- Kiểm tra sitemap structure
- **Tốc độ**: Rất nhanh (~30 giây)

### Khi nào dùng "Crawl Content (GP)"?
- SEO audit (phân tích title tags)
- Content inventory (kiểm kê nội dung website)
- Keyword research (xem các trang target từ khóa gì)
- Competitor analysis
- **Tốc độ**: Chậm (~30-60 phút cho 500-1000 URLs)

---

## 🚀 Cách Sử Dụng

### Bước 1: Nhập Domain

```
example.com
vnexpress.net
dantri.com.vn
```

### Bước 2: Click "Crawl Content (GP)"

Button màu **tím** (purple) ở bên phải:
- Icon: 🔍 (Search)
- Text: "Crawl Content (GP)"

### Bước 3: Đợi Crawl Hoàn Thành

- Progress bar hiển thị tiến độ real-time
- Mỗi URL sẽ được stream ngay khi crawl xong
- Ước tính:
  - 100 URLs: ~5 phút
  - 500 URLs: ~25 phút
  - 1000 URLs: ~50 phút

### Bước 4: Copy vào Google Sheets

1. Click button **"Copy for Google Sheets"**
2. Mở Google Sheets
3. Paste (Ctrl+V / Cmd+V)

**Kết quả** sẽ tự động tách thành 3 cột:

| URL | Title | Keywords |
|-----|-------|----------|
| example.com/huong-dan-seo | Hướng dẫn SEO 2024 | Hướng Dẫn Seo |
| example.com/lien-he | Liên hệ - Contact | Liên Hệ |

---

## 🔧 Kỹ Thuật

### Backend Architecture

```
Backend Flow:
1. Nhận request từ frontend
2. Crawl sitemap (internal, tự động)
3. Lấy danh sách URLs từ sitemap
4. Crawl từng URL:
   - Fetch HTML (UTF-8)
   - Extract title từ <title> tag
   - Extract keywords từ URL slug
5. Stream kết quả qua SSE (real-time)
```

**Files mới**:
- `backend/services/content_crawler_service.py` - Main crawler service
- `backend/utils/html_parser.py` - HTML parsing & keyword extraction
- `backend/app.py` - Endpoint `/api/gp-content/crawl-stream`

### Frontend Architecture

```
Frontend Flow:
1. User click "Crawl Content (GP)"
2. Open ContentResultsModal
3. EventSource connect to backend SSE
4. Receive results in real-time → update table
5. User click "Copy" → clipboard TSV format
```

**Files mới**:
- `frontend/src/hooks/useGPContentCrawl.js` - Custom hook
- `frontend/src/components/ContentResultsModal.jsx` - Results UI
- `frontend/src/components/CrawlForm.jsx` - Updated với 2 buttons

### Keyword Extraction Logic

```python
# Ví dụ URL:
https://sunwinuk.com/tai-xiu-livestream-sunwin/

# Processing:
1. Extract path: "tai-xiu-livestream-sunwin"
2. Replace hyphens with spaces: "tai xiu livestream sunwin"
3. Title case: "Tai Xiu Livestream Sunwin"

# Output:
Keywords: "Tai Xiu Livestream Sunwin"
```

**Đặc biệt**: Hỗ trợ tiếng Việt có dấu (UTF-8):
```
huong-dan-seo-tien-viet → Hướng Dẫn Seo Tiếng Việt
```

---

## 📊 Output Format

### Copy to Google Sheets (TSV)

```
URL	Title	Keywords
example.com/page1	Page 1	Page1
example.com/page2	Page 2	Page2
```

Tab-separated → tự động tách cột khi paste vào Sheets ✅

### Download CSV

```csv
"URL","Title","Keywords"
"example.com/page1","Page 1","Page1"
"example.com/page2","Page 2","Page2"
```

Standard CSV format → import vào Excel, Numbers, etc.

---

## ⚙️ Configuration

### Backend Settings

**File**: `backend/services/content_crawler_service.py`

```python
self.max_workers = 5  # Concurrent crawl workers (default: 5)
self.timeout = 15     # Request timeout in seconds
```

**Rate Limiting**:
```python
sleep(random.uniform(0.5, 1.5))  # 0.5-1.5 giây delay giữa các request
```

### Không Giới Hạn URLs

Module sẽ crawl **TẤT CẢ URLs** trong sitemap, không có hard limit.

⚠️ **Lưu ý**: Nếu sitemap có 10,000 URLs → crawl sẽ mất ~8-10 giờ.

---

## 🐛 Troubleshooting

### Lỗi: "Không tìm thấy sitemap"

**Nguyên nhân**: Domain không có sitemap.xml hoặc robots.txt

**Giải pháp**:
- Kiểm tra domain có đúng không
- Thử thêm www (www.example.com)
- Verify sitemap tồn tại: `https://domain.com/sitemap.xml`

### Lỗi: "403 Forbidden"

**Nguyên nhân**: Website chặn IP datacenter

**Giải pháp**:
- Không thể bypass (website chặn IP)
- Thử domain khác

### Crawl quá chậm

**Nguyên nhân**: Nhiều URLs + rate limiting

**Giải pháp**:
- Chờ crawl hoàn thành (không thể tăng tốc để tránh bị ban)
- Hoặc close modal và làm việc khác (crawl chạy background)

### Một số URLs failed

**Giải pháp**: Skip failed URLs tự động, chỉ hiển thị URLs thành công.

---

## 🔒 Security Notes

### ⚠️ SSL Verification Disabled

```python
verify=False  # Bỏ qua SSL verification
```

**Lý do**: Nhiều website có SSL certificate không hợp lệ
**Risk**: Có thể bị MITM attack (chỉ nên dùng cho public data)

### Rate Limiting

Built-in delay 0.5-1.5s giữa các request để:
- Tránh bị ban IP
- Respect website resources
- Tuân thủ robots.txt (best practice)

---

## 🚀 Future Improvements

### Phase 2 (Nếu cần):
- [ ] User-selectable URL limit (100, 500, 1000, All)
- [ ] Pause/Resume functionality
- [ ] Background jobs (Celery)
- [ ] Email notification khi crawl xong
- [ ] Extract thêm: Meta description, H1 tags, Images
- [ ] Database storage (lưu lịch sử crawl)

---

## 📝 Testing

### Test với Vietnamese Websites

**Test URLs**:
```
vnexpress.net
dantri.com.vn
tuoitre.vn
```

**Verify**:
- ✅ Title có dấu tiếng Việt hiển thị đúng
- ✅ Keywords từ slug tiếng Việt (có dấu) hoạt động
- ✅ Copy to Sheets → hiển thị đúng UTF-8

---

## 📞 Support

Nếu gặp vấn đề:
1. Check browser console (F12) xem error logs
2. Check backend logs: `tail -f backend/crawler_*.log`
3. Verify API endpoint: `http://localhost:8000/api/health`

---

## ✅ Summary

### Tính Năng Chính:
- ✅ 2 buttons riêng biệt: "Crawl Sitemap" vs "Crawl Content (GP)"
- ✅ Real-time SSE streaming
- ✅ UTF-8 Vietnamese support
- ✅ Keywords extraction từ URL slug
- ✅ Copy to Google Sheets (TSV format)
- ✅ Download CSV
- ✅ Search/filter results
- ✅ No URL limit

### Performance:
- Backend: ThreadPoolExecutor với 5 workers
- Rate limiting: 0.5-1.5s per URL
- In-memory only (không lưu database)
- Skip failed URLs tự động

### Output:
- **Format**: URL | Title | Keywords
- **Encoding**: UTF-8
- **Target**: Google Sheets paste

---

**Version**: 1.0.0
**Date**: 2026-02-28
**Author**: Claude Code
