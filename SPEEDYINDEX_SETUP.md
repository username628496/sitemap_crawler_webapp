# SpeedyIndex Integration Setup

## Trạng Thái Hiện Tại

✅ Backend API endpoints đã được implement:
- `/api/speedyindex/submit` - Submit URLs (batch)
- `/api/speedyindex/submit-stream` - Submit URLs với streaming progress

⚠️ **Cần API Documentation từ SpeedyIndex.com**

## Vấn Đề

SpeedyIndex.com không public API documentation. Tests cho thấy:

```bash
# ❌ Endpoints không hoạt động:
POST https://app.speedyindex.com/api/indexing  → 405 Not Allowed
POST https://speedyindex.com/api/submit → 404 Not Found

# ✅ Endpoint trả về HTML (web interface, not API):
GET https://app.speedyindex.com/api/indexing?apikey=xxx&url=xxx → 200 (HTML)
```

## Hướng Dẫn Lấy API Documentation

### Option 1: Kiểm Tra Dashboard SpeedyIndex

1. Đăng nhập vào https://app.speedyindex.com/
2. Tìm mục **API** hoặc **API Documentation**
3. Kiểm tra:
   - Endpoint URL chính xác
   - Authentication method (API key, Bearer token, etc.)
   - Request format (JSON, Form data, Query params)
   - Response format

### Option 2: Contact SpeedyIndex Support

Email: support@speedyindex.com (hoặc check website)

Hỏi:
```
Hi, I have API key: d7aba11fef7895c91b75ded66d406821

Can you please provide:
1. API endpoint URL for submitting URLs
2. Request method (GET/POST)
3. Authentication header format
4. Request body example
5. Response format example

Thank you!
```

### Option 3: Check Browser Network Tab

1. Đăng nhập https://app.speedyindex.com/
2. Mở DevTools (F12) → Network tab
3. Submit 1 URL manually trên web interface
4. Tìm API call trong Network tab
5. Copy:
   - Request URL
   - Request Headers
   - Request Payload
   - Response

## Khi Có API Documentation

Update file `/Users/peter/sitemap-crawler-webapp/backend/services/speedyindex_submitter.py`:

```python
class SpeedyIndexSubmitter:
    def __init__(self, api_key: str):
        self.api_key = api_key
        # Update với endpoint chính xác
        self.endpoint = "CORRECT_ENDPOINT_HERE"  # Ví dụ: https://api.speedyindex.com/v1/submit
```

## Testing

Sau khi update endpoint, test bằng:

```bash
# Test từ Python
cd /Users/peter/sitemap-crawler-webapp/backend
source venv/bin/activate
python test_speedyindex_api.py

# Test từ API
curl -X POST http://localhost:8000/api/speedyindex/submit \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com/page1", "https://example.com/page2"]}'
```

## API Key

Current API Key: `d7aba11fef7895c91b75ded66d406821`

Để thay đổi, set environment variable:
```bash
export SPEEDYINDEX_API_KEY="your-new-key"
```

## Frontend Integration

Frontend button đã được thêm vào [ResultCard.jsx](frontend/src/components/ResultCard.jsx).

User có thể click "Submit to SpeedyIndex" button để index URLs.
