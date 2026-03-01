# 🔧 GP Content Crawler - Fixes Applied

## Issues Fixed

### ✅ Issue 1: Chỉ lấy URLs từ domain gốc

**Problem**:
- User nhập `33bet.com.vc`
- Domain redirect sang `8au2t97.uk.com`
- Sitemap chứa URLs của `8au2t97.uk.com`
- Code cũ chỉ lấy URLs có domain = `33bet.com.vc` → 0 URLs

**Solution**:
- Auto-detect domain đích từ URLs trong sitemap
- Cho phép lấy URLs từ domain đích (sau redirect)
- Logic: Scan toàn bộ URLs → detect domain phổ biến nhất → dùng làm target

**Code**: `backend/services/content_crawler_service.py` lines 148-158

---

### ✅ Issue 2: Không lấy được title

**Problem**:
- HTML encoding không đúng
- BeautifulSoup parse sai UTF-8

**Solution**:
- Better encoding detection (apparent_encoding)
- Force UTF-8 decoding
- Multiple fallbacks: `<title>` → `og:title` → `meta[name="title"]` → `<h1>`
- Use `from_encoding='utf-8'` in BeautifulSoup

**Code**:
- `backend/services/content_crawler_service.py` lines 59-75
- `backend/utils/html_parser.py` lines 75-123

---

### ✅ Issue 3: Keywords không có dấu tiếng Việt

**Problem**:
- URL slug: `tai-xiu-sunwin` (không dấu)
- Output: `Tai Xiu Sunwin` (không dấu) ❌
- Expected: `Tài Xỉu Sunwin` (có dấu) ✅

**Solution**:
- Created `VietnameseConverter` class
- Dictionary mapping: `tai → Tài`, `xiu → Xỉu`, etc.
- 60+ common Vietnamese words mapped
- Auto-convert after slug parsing

**Code**: `backend/utils/html_parser.py` lines 13-80

---

## How to Test

### Restart Backend
```bash
cd /Users/peter/sitemap-crawler-webapp/backend
# Activate venv first
python app.py
```

### Test
1. Open: http://localhost:3001
2. Input: `33bet.com.vc`
3. Click: **"Crawl Content (GP)"** (purple button)
4. Wait for results

### Expected Output
```
URL                              | Title                      | Keywords
---------------------------------|----------------------------|------------------
8au2t97.uk.com/tai-xiu-sunwin   | Tài Xỉu Sunwin [Title]    | Tài Xỉu Sunwin
8au2t97.uk.com/game-bai         | Game Bài [Title]           | Game Bài
```

---

## Files Modified

1. `backend/services/content_crawler_service.py`
   - Line 59-75: Better UTF-8 encoding
   - Line 144-183: Smart domain detection from URLs

2. `backend/utils/html_parser.py`
   - Line 13-80: Vietnamese word converter
   - Line 66-67: Apply Vietnamese conversion
   - Line 75-123: Improved title extraction

3. `backend/requirements.txt`
   - Added: beautifulsoup4, lxml, pytz

---

## Verification

Run this test:
```bash
cd backend
python3 -c "
from utils.html_parser import HTMLParser

urls = [
    'https://example.com/tai-xiu-sunwin/',
    'https://example.com/game-bai-doi-thuong/',
    'https://example.com/huong-dan-seo/',
]

for url in urls:
    kw = HTMLParser.extract_keywords_from_url(url)
    print(f'{url} → {kw}')
"
```

Expected:
```
https://example.com/tai-xiu-sunwin/ → Tài Xỉu Sunwin
https://example.com/game-bai-doi-thuong/ → Game Bài Đổi Thưởng
https://example.com/huong-dan-seo/ → Hướng Dẫn SEO
```

---

**Status**: ✅ All issues fixed
**Date**: 2026-02-28
