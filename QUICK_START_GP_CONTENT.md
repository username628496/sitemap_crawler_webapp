# 🚀 Quick Start - GP Content Crawler

## Bắt Đầu Ngay trong 3 Phút!

---

## 📦 Installation

### Bước 1: Install Dependencies

```bash
# Backend
cd backend
pip install beautifulsoup4==4.12.3 lxml==5.3.0

# Frontend (không cần thêm gì, đã có sẵn)
cd frontend
npm install
```

### Bước 2: Start Services

```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Bước 3: Mở Browser

```
http://localhost:3001
```

---

## 🎯 Sử Dụng

### Option 1: Crawl Sitemap (URLs Only)

**Khi nào dùng**: Cần danh sách URLs để submit lên indexing services

1. Nhập domain:
   ```
   example.com
   ```

2. Click **"Crawl Sitemap"** (button cam 🚀)

3. Nhận kết quả: Danh sách URLs

4. Copy hoặc Export CSV

**Thời gian**: ~30 giây

---

### Option 2: Crawl Content (URL + Title + Keywords) ⭐

**Khi nào dùng**: Cần phân tích SEO, content audit, keyword research

1. Nhập domain:
   ```
   vnexpress.net
   ```

2. Click **"Crawl Content (GP)"** (button tím 🔍)

3. Modal mở ra → Crawl bắt đầu

4. Đợi crawl hoàn thành (xem progress bar)

5. Click **"Copy for Google Sheets"**

6. Mở Google Sheets → Paste (Ctrl+V)

7. **DONE!** ✅ Bạn có 3 cột:
   ```
   URL | Title | Keywords
   ```

**Thời gian**:
- 100 URLs: ~5 phút
- 500 URLs: ~25 phút

---

## 💡 Tips

### 1. Copy to Google Sheets

Khi copy, dữ liệu tự động format với **Tab-separated** (TSV):

```
URL[TAB]Title[TAB]Keywords
example.com/page1[TAB]Page Title[TAB]Page1
```

Khi paste vào Sheets → tự động tách 3 cột! 🎉

### 2. Search trong Results

Modal có search box:
- Tìm theo URL
- Tìm theo Title
- Tìm theo Keywords

### 3. Download CSV

Nếu muốn lưu file:
- Click "Download CSV"
- Import vào Excel, Numbers, etc.

---

## 🔍 Ví Dụ Thực Tế

### Example 1: SEO Audit

**Mục tiêu**: Kiểm tra tất cả title tags của website

```
1. Input: yourwebsite.com
2. Click: "Crawl Content (GP)"
3. Wait: ~10 phút (cho 200 URLs)
4. Review: Cột "Title" → tìm duplicate, missing, too long
5. Export: Copy to Sheets để phân tích
```

### Example 2: Competitor Analysis

**Mục tiêu**: Xem đối thủ target từ khóa gì

```
1. Input: competitor.com
2. Click: "Crawl Content (GP)"
3. Wait: Xong
4. Review: Cột "Keywords" → thấy pattern từ khóa
5. Search: Tìm keywords liên quan đến niche của bạn
```

### Example 3: Content Inventory

**Mục tiêu**: Kiểm kê toàn bộ nội dung website

```
1. Input: company.com
2. Click: "Crawl Content (GP)"
3. Export: Download CSV
4. Analysis: Pivot table, filters, etc. trong Excel
```

---

## ⚙️ Customization (Advanced)

### Thay Đổi Số Workers

**File**: `backend/services/content_crawler_service.py`

```python
self.max_workers = 5  # Tăng lên 10 nếu muốn nhanh hơn
```

**Trade-off**:
- Tăng workers = nhanh hơn
- Nhưng dễ bị ban IP hơn

### Thay Đổi Rate Limit

**File**: `backend/services/content_crawler_service.py`

```python
sleep(random.uniform(0.5, 1.5))  # Giảm xuống 0.2-0.5 để nhanh hơn
```

**Warning**: Giảm delay → nguy cơ bị chặn IP cao!

---

## 🐛 Troubleshooting

### "Module 'bs4' not found"

```bash
pip install beautifulsoup4
```

### "Cannot connect to backend"

```bash
# Check backend running:
curl http://localhost:8000/api/health

# Check CORS settings
# Verify frontend .env has correct API URL
```

### "Tiếng Việt bị lỗi font"

- Browser encoding phải là **UTF-8**
- Google Sheets phải set font support tiếng Việt (Arial, Roboto, etc.)

### "Crawl quá chậm"

- Bình thường! Đây là rate limit để tránh ban IP
- Không thể tăng tốc (nếu tăng → bị 403 Forbidden)
- Giải pháp: Đợi hoặc chỉ crawl 100-200 URLs đầu

---

## 📊 So Sánh 2 Chức Năng

| Feature | Crawl Sitemap | Crawl Content (GP) |
|---------|---------------|-------------------|
| **Button** | 🚀 Cam (Rocket) | 🔍 Tím (Search) |
| **Output** | URLs only | URL + Title + Keywords |
| **Tốc độ** | Rất nhanh (~30s) | Chậm (~30 phút) |
| **Use case** | Submit URLs | SEO audit, analysis |
| **Result** | Danh sách URLs | Table với 3 cột |
| **Copy** | Plain text | TSV for Sheets |

---

## ✅ Checklist Sử Dụng

- [ ] Backend đang chạy (port 8000)
- [ ] Frontend đang chạy (port 3001)
- [ ] Dependencies installed (beautifulsoup4, lxml)
- [ ] Nhập domain vào form
- [ ] Click "Crawl Content (GP)"
- [ ] Đợi modal mở
- [ ] Xem progress bar
- [ ] Kết quả hiển thị trong table
- [ ] Click "Copy for Google Sheets"
- [ ] Paste vào Google Sheets
- [ ] Verify 3 cột: URL | Title | Keywords

---

## 🎉 Success!

Nếu bạn thấy kết quả trong Google Sheets với 3 cột đúng format:

```
URL                          | Title              | Keywords
----------------------------|-------------------|------------------
example.com/huong-dan-seo   | Hướng dẫn SEO     | Hướng Dẫn Seo
example.com/lien-he         | Liên hệ           | Liên Hệ
```

**Congratulations! 🎊** Module hoạt động hoàn hảo!

---

## 📚 Đọc Thêm

- [GP_CONTENT_CRAWLER_README.md](GP_CONTENT_CRAWLER_README.md) - Full documentation
- [GP_CONTENT_IMPLEMENTATION_SUMMARY.md](GP_CONTENT_IMPLEMENTATION_SUMMARY.md) - Technical details

---

**Happy Crawling!** 🚀🔍
