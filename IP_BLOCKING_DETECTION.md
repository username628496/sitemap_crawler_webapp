# IP Blocking Detection & Handling

## Summary

Added intelligent detection for datacenter IP blocking to provide clear feedback when domains cannot be crawled due to IP-based restrictions.

## What Was Fixed

### Problem
Some domains (like `singers.uk.com`, `33bet.com.vc`) block ALL datacenter IPs (DigitalOcean, AWS, etc.) regardless of user agent. The app would:
- Rotate through all 8 user agents (Googlebot, Bingbot, browsers)
- Still get 403 Forbidden on every attempt
- Give unclear error message "Không tìm thấy sitemap hợp lệ"

### Solution
Now the app **tracks 403 errors** during sitemap discovery:

```python
forbidden_count = 0  # Track 403 errors
total_attempts = 0

for url in candidates:
    total_attempts += 1
    try:
        content, chain = self.fetch_url(url, track_redirects=False)
        # ... parse sitemap ...
    except Exception as e:
        if "403" in str(e) or "Forbidden" in str(e):
            forbidden_count += 1
            logger.warning(f"⚠️ 403 Forbidden cho {url}")
```

If **ALL** candidate URLs return 403, it detects IP blocking:

```python
if forbidden_count > 0 and forbidden_count == total_attempts:
    raise Exception(
        f"Domain {domain} chặn IP datacenter (403 Forbidden). "
        f"Domain này chặn IP từ datacenter và không thể crawl được. "
        f"Không thể bypass bằng user agent."
    )
```

## Error Messages Now

### Before
- ❌ "Không tìm thấy sitemap hợp lệ" (unclear what went wrong)

### After
- ✅ "Domain chặn IP datacenter (403 Forbidden). Domain này chặn IP từ datacenter và không thể crawl được. Không thể bypass bằng user agent."
- ✅ Clear distinction between:
  1. Domains with no sitemap
  2. Domains blocking datacenter IPs
  3. Timeout/DNS errors

## Technical Details

### File Changed
- `backend/services/sitemap_parser.py` (lines 349-416)

### How It Works
1. Try 6 candidate URLs (robots.txt, sitemap.xml, sitemap_index.xml, etc.)
2. For each URL, `fetch_url()` automatically rotates through 8 user agents on 403 errors
3. Track how many URLs return 403
4. If **all URLs** return 403 → IP blocking detected
5. If **some URLs** work → continue normal flow
6. If **no sitemaps found** → "Không tìm thấy sitemap hợp lệ"

### User Agents Tried
1. Googlebot desktop
2. Googlebot mobile (Android)
3. Googlebot simple
4. Bingbot
5. YandexBot
6. Chrome Windows
7. Chrome macOS
8. Firefox

## What Cannot Be Fixed

**IP-based blocking is unfixable from datacenter IPs** because:
- Websites maintain blocklists of datacenter IP ranges (AWS, DigitalOcean, Azure, etc.)
- This is done at firewall/CDN level, before user agent is even checked
- No amount of user agent rotation can bypass this

### Affected Domains
Examples of domains that block datacenter IPs:
- `singers.uk.com` (redirected from `33bet.com.vc`)
- High-security financial sites
- Anti-bot protected e-commerce sites

### Solutions
1. **Crawl from home/office IP**
   - Run crawler from non-datacenter connection

2. **Accept limitation**
   - Skip these domains
   - Show clear error to user

## Testing

Test with domains that block datacenter IPs:
```bash
# This will now show clear IP blocking error:
curl -X GET "http://localhost:8000/api/crawl-stream?domains=33bet.com.vc"

# Expected response:
{
  "domain": "33bet.com.vc",
  "status": "error",
  "message": "Domain 33bet.com.vc chặn IP datacenter (403 Forbidden). Domain này chặn IP từ datacenter và không thể crawl được. Không thể bypass bằng user agent."
}
```

Test with working domains:
```bash
# These should work fine:
curl -X GET "http://localhost:8000/api/crawl-stream?domains=vnexpress.net,dantri.com.vn"
```

## Logs

Now you'll see clear logs distinguishing IP blocking:

### IP Blocking Detected
```
🚫 Domain singers.uk.com blocks datacenter IPs (403 Forbidden on all 6 attempts).
Đã thử 8 user agents khác nhau, tất cả đều bị chặn.
```

### Normal Errors
```
⚠️ Không tìm thấy sitemap cho example.com
⚠️ Không thể fetch https://example.com/robots.txt: Connection timeout
```

## Commit
- Commit: `71f9db0`
- Message: "Add graceful handling for datacenter IP blocking (403 Forbidden)"
- Date: 2025-12-13
