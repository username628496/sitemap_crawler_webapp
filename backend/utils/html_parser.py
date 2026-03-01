"""
HTML Parser Utility - Tối ưu cho WordPress/Vietnamese sites
Extracts: Title + Keywords với đầy đủ dấu tiếng Việt

PRIORITY CHAIN:
  Title:    og:title → twitter:title → <title> → <h1>
  Keywords: meta keywords → og:title[trước " - "] → h1 → title[trước " - "] → slug

Lý do og:title là đầu tiên:
  - WordPress + Yoast/RankMath luôn set og:title TĨNH trong HTML
  - <title> thường RỖNG với WordPress (JS fill sau khi load)
  - og:title luôn có tiếng Việt đầy đủ dấu
"""

import re
import warnings
from typing import Dict
from urllib.parse import urlparse

from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)


class HTMLParser:

    @staticmethod
    def extract_title_from_html(html_content: str) -> str:
        """
        Extract page title.
        Priority: og:title → twitter:title → <title> → <h1>
        """
        if not html_content:
            return ''

        soup = BeautifulSoup(html_content, 'lxml')

        # 1. og:title — WordPress Yoast/RankMath luôn set tĩnh, đầy đủ dấu
        og = soup.find('meta', property='og:title')
        if og:
            val = og.get('content', '').strip()
            if val:
                return val

        # 2. twitter:title
        tw = soup.find('meta', attrs={'name': 'twitter:title'})
        if tw:
            val = tw.get('content', '').strip()
            if val:
                return val

        # 3. <title> — thường rỗng với WordPress SPA (JS fill sau)
        title = soup.find('title')
        if title:
            val = title.get_text(strip=True)
            if val:
                return val

        # 4. <h1>
        h1 = soup.find('h1')
        if h1:
            val = h1.get_text(strip=True)
            if val:
                return val

        return ''

    @staticmethod
    def extract_keywords_from_html(html_content: str, url: str = '') -> str:
        """
        Extract keywords từ HTML — ưu tiên meta tags có dấu tiếng Việt.
        Priority: meta keywords → og:title[trước " - "] → h1 → title[trước " - "] → slug
        """
        if not html_content:
            return HTMLParser._slug_fallback(url)

        soup = BeautifulSoup(html_content, 'lxml')

        # 1. meta keywords — có dấu đầy đủ, nguồn tốt nhất
        meta_kw = soup.find('meta', attrs={'name': re.compile(r'^keywords$', re.I)})
        if meta_kw:
            val = meta_kw.get('content', '').strip()
            if val:
                return val

        # 2. og:title → lấy phần trước " - "
        og = soup.find('meta', property='og:title')
        if og:
            val = og.get('content', '').strip()
            if val:
                return val.split(' - ')[0].strip()

        # 3. h1
        h1 = soup.find('h1')
        if h1:
            val = h1.get_text(strip=True)
            if val:
                return val

        # 4. <title> → lấy phần trước " - "
        title = soup.find('title')
        if title:
            val = title.get_text(strip=True)
            if val:
                return val.split(' - ')[0].strip()

        # 5. Slug — KHÔNG có dấu, fallback cuối cùng
        return HTMLParser._slug_fallback(url)

    @staticmethod
    def _slug_fallback(url: str) -> str:
        """Slug fallback — không dấu tiếng Việt. Example: /tai-app/ → 'Tai App'"""
        if not url:
            return ''
        path = urlparse(url).path.strip('/')
        if not path:
            return ''
        slug = path.split('/')[-1]
        slug = re.sub(r'\.\w+$', '', slug)
        return slug.replace('-', ' ').title()

    @staticmethod
    def parse_page(url: str, html_content: str) -> Dict[str, str]:
        """Parse page và trả về tất cả metadata."""
        return {
            'url': url,
            'title': HTMLParser.extract_title_from_html(html_content),
            'keywords': HTMLParser.extract_keywords_from_html(html_content, url),
        }