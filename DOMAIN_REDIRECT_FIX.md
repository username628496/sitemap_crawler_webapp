# 🔧 Domain Redirect Fix - Implementation Complete

## Problem Statement

When user inputs a domain that redirects to another domain:
- **Input:** `keonhacai.fit`
- **Redirects to:** `pricol.org.mx`
- **Old behavior:** Frontend displays `https://pricol.org.mx/tai-app/` ❌
- **New behavior:** Frontend displays `https://keonhacai.fit/tai-app/` ✅
- **Click behavior:** Opens `https://pricol.org.mx/tai-app/` (actual working URL)

## Solution - Hướng 3 Implementation

Track both `original_domain` (user input) and `target_domain` (after redirect). Each URL result contains both `original_url` (for display/export) and `actual_url` (for clicking).

---

## Files Modified

### 1. Backend: `backend/services/content_crawler_service.py`

#### Added Imports
```python
from typing import Callable, Dict, List, Optional, Tuple
from urllib.parse import urlparse, urlunparse
```

#### New Helper Method: `_replace_domain()`
```python
@staticmethod
def _replace_domain(url: str, from_domain: str, to_domain: str) -> str:
    """
    Replace domain in URL while preserving scheme/path.

    Example:
        url         = "https://pricol.org.mx/tai-app/"
        from_domain = "pricol.org.mx"
        to_domain   = "keonhacai.fit"
        result      = "https://keonhacai.fit/tai-app/"
    """
```
**Location:** Lines ~98-114

#### Updated `_filter_urls_by_domain()` Return Type
```python
@staticmethod
def _filter_urls_by_domain(original_domain: str, all_urls: List[str]) -> Tuple[List[str], str]:
    """Returns (filtered_urls, target_domain)"""
```
**Location:** Lines ~116-138
**Change:** Now returns `Tuple[List[str], str]` instead of just `List[str]`

#### Updated `crawl_single_url()` Signature
```python
def crawl_single_url(
    self,
    url: str,
    original_domain: str = '',
    target_domain: str = ''
) -> Optional[Dict]:
```
**Location:** Lines ~51-96
**Change:** Added `original_domain` and `target_domain` parameters

#### Updated `crawl_single_url()` Return Value
```python
return {
    'original_url': original_url,  # https://keonhacai.fit/slug/
    'actual_url': url,             # https://pricol.org.mx/slug/
    'title': title,
    'keywords': keywords,
    'status': 'success',
    'duration': round(duration, 2),
}
```
**Location:** Lines ~85-92

#### Updated `discover_and_crawl_domain()` Logic
```python
# Get filtered URLs and detect target domain
all_urls, target_domain = self._filter_urls_by_domain(domain, all_urls)
original_domain = domain
has_redirect = (original_domain != target_domain)

# Pass domains to ThreadPoolExecutor
with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
    future_to_url = {
        executor.submit(self.crawl_single_url, url, original_domain, target_domain): url
        for url in all_urls
    }

# Return with domain info
return {
    'domain': domain,
    'original_domain': original_domain,
    'target_domain': target_domain,
    'has_redirect': has_redirect,
    'total_urls': total_urls,
    'crawled_urls': crawled_urls,
    'results': results,
    'errors': errors,
}
```
**Location:** Lines ~158-202

---

### 2. Backend: `backend/app.py`

#### Updated SSE Stream to Include Domain Info
```python
elif item['type'] == 'domain_complete':
    # Domain completed
    result = item['data']
    response_data = {
        'status': 'domain_complete',
        'domain': result['domain'],
        'crawled_urls': result['crawled_urls'],
        'total_urls': result['total_urls'],
        'original_domain': result.get('original_domain', result['domain']),
        'target_domain': result.get('target_domain', result['domain']),
        'has_redirect': result.get('has_redirect', False)
    }
    yield f"data: {json.dumps(response_data)}\n\n"
```
**Location:** Lines 479-491

---

### 3. Frontend: `frontend/src/hooks/useGPContentCrawl.js`

#### Added State for Domain Info
```javascript
const [domainInfo, setDomainInfo] = useState(null) // { original_domain, target_domain, has_redirect }
```
**Location:** Line 13

#### Updated Result Object Structure
```javascript
tempResults.push({
  url: data.url,
  original_url: data.original_url,
  actual_url: data.actual_url,
  title: data.title,
  keywords: data.keywords
})
```
**Location:** Lines 81-87

#### Extract Domain Info from Backend Response
```javascript
if (data.status === 'domain_complete') {
  // Extract domain info from backend response
  if (data.original_domain && data.target_domain !== undefined) {
    setDomainInfo({
      original_domain: data.original_domain,
      target_domain: data.target_domain,
      has_redirect: data.has_redirect || false
    })
  }
  // ...
}
```
**Location:** Lines 54-62

#### Export Domain Info from Hook
```javascript
return {
  isLoading,
  results,
  progress,
  currentDomain,
  domainInfo,  // ← Added
  startCrawl,
  clearResults
}
```
**Location:** Lines 125-133

---

### 4. Frontend: `frontend/src/components/CrawlForm.jsx`

#### Destructure Domain Info from Hook
```javascript
const {
  isLoading: isContentLoading,
  results: contentResults,
  progress: contentProgress,
  currentDomain,
  domainInfo,  // ← Added
  startCrawl: startContentCrawl,
  clearResults: clearContentResults
} = useGPContentCrawl()
```
**Location:** Lines 12-19

#### Pass Domain Info to Modal
```javascript
<ContentResultsModal
  results={contentResults}
  isOpen={showContentModal}
  onClose={() => setShowContentModal(false)}
  progress={contentProgress}
  currentDomain={currentDomain}
  isLoading={isContentLoading}
  domainInfo={domainInfo}  // ← Added
/>
```
**Location:** Lines 222-229

---

### 5. Frontend: `frontend/src/components/ContentResultsModal.jsx`

#### Updated Component Props
```javascript
const ContentResultsModal = ({
  results,
  isOpen,
  onClose,
  progress,
  currentDomain,
  isLoading,
  domainInfo  // ← Added: { original_domain, target_domain, has_redirect }
}) => {
```
**Location:** Lines 10-18

#### Updated Search Filter (Backward Compatible)
```javascript
const filteredResults = results.filter(item => {
  const searchableUrl = (item.original_url || item.url || '').toLowerCase()
  // ...
})
```
**Location:** Lines 24-33

#### Updated TSV Export
```javascript
results.forEach(item => {
  const url = item.original_url || item.url || ''  // Use original_url for export
  const title = item.title || '(No title)'
  const keywords = item.keywords || '(No keywords)'
  text += `${url}\t${title}\t${keywords}\n`
})
```
**Location:** Lines 49-55

#### Updated CSV Export
```javascript
results.forEach(item => {
  const url = `"${(item.original_url || item.url || '').replace(/"/g, '""')}"`
  // ...
})
```
**Location:** Lines 79-87

#### Added Redirect Notice Badge
```javascript
{domainInfo?.has_redirect && (
  <div className="px-6 py-3 border-b bg-blue-50">
    <div className="flex items-start gap-2 text-sm">
      <span className="text-blue-600 font-semibold">ℹ️</span>
      <div className="text-blue-800">
        <span className="font-medium">Domain redirect detected:</span>{' '}
        <span className="font-semibold">{domainInfo.original_domain}</span>
        {' → '}
        <span className="font-semibold">{domainInfo.target_domain}</span>
        <p className="text-blue-700 text-xs mt-1">
          Hiển thị URL gốc (<span className="font-medium">{domainInfo.original_domain}</span>),
          click sẽ mở URL đích (<span className="font-medium">{domainInfo.target_domain}</span>)
        </p>
      </div>
    </div>
  </div>
)}
```
**Location:** Lines 152-168

#### Updated Table Display
```javascript
<td className="px-4 py-3 text-sm text-blue-600">
  <a
    href={item.actual_url || item.url}  // ← Click opens actual_url
    target="_blank"
    rel="noopener noreferrer"
    className="hover:underline break-all"
    title={item.actual_url && item.actual_url !== item.original_url
      ? `Original: ${item.original_url}\nActual: ${item.actual_url}`
      : item.original_url || item.url}
  >
    {item.original_url || item.url}  // ← Display shows original_url
  </a>
</td>
```
**Location:** Lines 225-237

---

## Data Flow Diagram

```
User Input: keonhacai.fit
    ↓
Backend: content_crawler_service.py
    ├─ Fetch sitemap from keonhacai.fit
    ├─ Detect redirect → pricol.org.mx
    ├─ Extract URLs: [https://pricol.org.mx/tai-app/, ...]
    ├─ _filter_urls_by_domain() → returns (urls, "pricol.org.mx")
    ├─ original_domain = "keonhacai.fit"
    ├─ target_domain = "pricol.org.mx"
    └─ has_redirect = True
    ↓
Backend: crawl_single_url()
    ├─ Fetches: https://pricol.org.mx/tai-app/
    ├─ Extracts: title + keywords
    ├─ Generates original_url: https://keonhacai.fit/tai-app/
    └─ Returns: { original_url, actual_url, title, keywords }
    ↓
Backend: app.py SSE Stream
    └─ Sends: { original_domain, target_domain, has_redirect, original_url, actual_url }
    ↓
Frontend: useGPContentCrawl hook
    ├─ Receives SSE events
    ├─ Stores domainInfo: { original_domain, target_domain, has_redirect }
    └─ Stores results: [{ original_url, actual_url, title, keywords }]
    ↓
Frontend: CrawlForm.jsx
    └─ Passes domainInfo to ContentResultsModal
    ↓
Frontend: ContentResultsModal.jsx
    ├─ Shows redirect notice if has_redirect
    ├─ Displays original_url in table
    ├─ Links to actual_url (href)
    └─ Exports original_url in CSV/TSV
```

---

## Testing

### Test Case 1: Domain with Redirect
```bash
# Input domain
keonhacai.fit

# Expected behavior:
# 1. Blue banner shows: "keonhacai.fit → pricol.org.mx"
# 2. Table displays: https://keonhacai.fit/tai-app/
# 3. Click opens: https://pricol.org.mx/tai-app/
# 4. Export contains: https://keonhacai.fit/tai-app/
```

### Test Case 2: Domain without Redirect
```bash
# Input domain
example.com

# Expected behavior:
# 1. No blue banner shown
# 2. Table displays: https://example.com/page/
# 3. Click opens: https://example.com/page/
# 4. Export contains: https://example.com/page/
```

### Test Case 3: Backward Compatibility
```bash
# Test with old backend response (no original_url field)

# Expected behavior:
# Falls back to 'url' field
# No errors, graceful degradation
```

---

## Backward Compatibility

All frontend changes use fallbacks:
```javascript
// If original_url doesn't exist, use url field
item.original_url || item.url

// If domainInfo doesn't exist, no redirect notice shown
domainInfo?.has_redirect && (...)
```

---

## Status

✅ **Backend implementation:** Complete
✅ **Frontend hook update:** Complete
✅ **Frontend component update:** Complete
✅ **SSE stream update:** Complete
✅ **Backward compatibility:** Ensured

**Next Step:** Restart backend to apply changes, then test with redirect domain (e.g., `keonhacai.fit` or `33bet.com.vc`)

---

**Date:** 2026-03-01
**Implementation:** Hướng 3 (Direction 3)
