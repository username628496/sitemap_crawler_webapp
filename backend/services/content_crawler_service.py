"""
GP Content Crawler Service
Crawls URLs from sitemap and extracts: URL + Title + Keywords
"""

import random
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import time, sleep
from typing import Callable, Dict, List, Optional, Tuple
from urllib.parse import urlparse, urlunparse

from config import Config
from models.database import DatabaseManager
from services.sitemap_parser import SitemapParser
from utils.html_parser import HTMLParser
from utils.logger import logger


class ContentCrawlerService:

    def __init__(self, db: DatabaseManager = None):
        self.timeout = Config.REQUEST_TIMEOUT
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        self.max_workers = 5
        self.sitemap_parser = SitemapParser()
        self.html_parser = HTMLParser()
        self.db = db or DatabaseManager()

    def crawl_single_url(
        self,
        url: str,
        original_domain: str = '',
        target_domain: str = ''
    ) -> Optional[Dict]:
        """
        Crawl 1 URL, trả về {original_url, actual_url, title, keywords, status, duration}.

        Args:
            url: URL thật để crawl (actual_url)
            original_domain: Domain gốc user nhập (e.g., "keonhacai.fit")
            target_domain: Domain đích sau redirect (e.g., "pricol.org.mx")

        Returns:
            Dict with original_url (hiển thị), actual_url (click), title, keywords
        """
        start_time = time()
        try:
            response = requests.get(
                url,
                headers=self.headers,
                timeout=self.timeout,
                allow_redirects=True,
                verify=False,
            )

            # Auto-detect encoding cho tiếng Việt
            if response.encoding is None or response.encoding.lower() == 'iso-8859-1':
                response.encoding = response.apparent_encoding or 'utf-8'

            html_content = response.text
            duration = time() - start_time

            # ✅ FIX: Dùng extract_keywords_from_html (có dấu) thay vì extract_keywords_from_url (không dấu)
            title = self.html_parser.extract_title_from_html(html_content)
            keywords = self.html_parser.extract_keywords_from_html(html_content, url)

            # Create original_url by replacing domain
            original_url = self._replace_domain(url, target_domain, original_domain)

            logger.info(f"✅ Crawled {url} ({duration:.2f}s) | title='{title[:40]}' | kw='{keywords[:30]}'")

            return {
                'domain': original_domain,     # Domain người dùng nhập
                'original_url': original_url,  # https://keonhacai.fit/slug/
                'actual_url': url,             # https://pricol.org.mx/slug/
                'title': title,
                'keywords': keywords,
                'status': 'success',
                'duration': round(duration, 2),
            }

        except requests.exceptions.Timeout:
            logger.warning(f"⏱️ Timeout: {url}")
            return None
        except requests.exceptions.RequestException as e:
            logger.warning(f"❌ Request failed {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error {url}: {e}")
            return None

    def discover_and_crawl_domain(
        self,
        domain: str,
        callback: Optional[Callable] = None,
    ) -> Dict:
        """
        Discover sitemap → lấy URLs → crawl từng URL.

        Args:
            domain: Domain cần crawl (có hoặc không có https://)
            callback: fn(result, completed, total) — gọi mỗi khi crawl xong 1 URL

        Returns:
            {domain, status, total_urls, crawled_urls, results, duration}
        """
        domain = domain.strip().replace('https://', '').replace('http://', '').rstrip('/')
        logger.info(f"🚀 [GP Content] Starting: {domain}")
        start_time = time()

        try:
            # Step 1: Discover sitemaps
            sitemap_urls, _ = self.sitemap_parser.discover_sitemaps(domain)
            if not sitemap_urls:
                return self._error(domain, 'Không tìm thấy sitemap')

            # Step 2: Parse sitemaps → lấy tất cả URLs
            all_urls = []
            for sitemap_url in sitemap_urls:
                try:
                    urls, _ = self.sitemap_parser.parse_sitemap(sitemap_url)
                    all_urls.extend(urls)
                except Exception as e:
                    logger.warning(f"⚠️ Failed to parse {sitemap_url}: {e}")

            all_urls = list(set(all_urls))

            # Step 3: Smart domain filtering (handle redirect domain)
            all_urls, target_domain = self._filter_urls_by_domain(domain, all_urls)
            total_urls = len(all_urls)

            if total_urls == 0:
                return self._error(domain, 'Không tìm thấy URLs trong sitemap')

            original_domain = domain
            has_redirect = (original_domain != target_domain)

            logger.info(f"🔍 [GP Content] {total_urls} URLs → starting crawl")

            # Step 4: Concurrent crawl
            results = []
            completed = 0

            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                future_to_url = {
                    executor.submit(self.crawl_single_url, url, original_domain, target_domain): url
                    for url in all_urls
                }

                for future in as_completed(future_to_url):
                    url = future_to_url[future]
                    try:
                        result = future.result()
                        if result:
                            results.append(result)
                            completed += 1
                            if callback:
                                callback(result, completed, total_urls)
                        sleep(random.uniform(0.3, 0.8))
                    except Exception as e:
                        logger.error(f"❌ Error processing {url}: {e}")
                        completed += 1

            duration = time() - start_time
            logger.info(f"✅ Done {domain}: {len(results)}/{total_urls} URLs in {duration:.1f}s")

            # Save to database
            session_id = self.db.save_gp_content_session(
                domain=original_domain,
                original_domain=original_domain,
                target_domain=target_domain,
                has_redirect=has_redirect,
                status='success',
                total_urls=total_urls,
                crawled_urls=len(results),
                duration=round(duration, 2),
                url_results=results
            )

            if session_id:
                logger.info(f"💾 Saved GP Content session {session_id} to database")

            return {
                'domain': domain,
                'original_domain': original_domain,
                'target_domain': target_domain,
                'has_redirect': has_redirect,
                'status': 'success',
                'total_urls': total_urls,
                'crawled_urls': len(results),
                'results': results,
                'duration': round(duration, 2),
                'session_id': session_id
            }

        except Exception as e:
            logger.error(f"❌ [GP Content] {domain}: {e}")

            # Save failed session to database
            duration = time() - start_time
            self.db.save_gp_content_session(
                domain=domain,
                original_domain=domain,
                target_domain=domain,
                has_redirect=False,
                status='failed',
                total_urls=0,
                crawled_urls=0,
                duration=round(duration, 2),
                error_message=str(e)
            )

            return self._error(domain, str(e))

    def process_domains(
        self,
        domains: List[str],
        callback: Optional[Callable] = None,
    ) -> List[Dict]:
        """Crawl nhiều domains tuần tự."""
        logger.info(f"🚀 [GP Content] Processing {len(domains)} domains")
        results = []

        for i, domain in enumerate(domains):
            domain = domain.strip()
            if not domain:
                continue

            result = self.discover_and_crawl_domain(
                domain,
                callback=lambda r, c, t: callback(r, c, t) if callback else None,
            )
            results.append(result)

            if callback:
                callback(result, i + 1, len(domains))

            logger.info(f"✅ [{i+1}/{len(domains)}] Done: {domain}")

        return results

    # ─── Helpers ────────────────────────────────────────────────

    @staticmethod
    def _replace_domain(url: str, from_domain: str, to_domain: str) -> str:
        """
        Replace domain trong URL.

        Example:
            url         = "https://pricol.org.mx/tai-app/"
            from_domain = "pricol.org.mx"
            to_domain   = "keonhacai.fit"
            result      = "https://keonhacai.fit/tai-app/"

        Safe fallbacks:
        - If from_domain == to_domain → return url unchanged
        - If url doesn't contain from_domain → return url unchanged
        """
        if not from_domain or not to_domain or from_domain == to_domain:
            return url

        parsed = urlparse(url)
        url_domain = parsed.netloc.replace('www.', '').lower()
        check_from = from_domain.replace('www.', '').lower()

        # Only replace if domains match
        if url_domain != check_from:
            return url

        # Replace netloc, keep scheme/path/params
        new_parsed = parsed._replace(netloc=to_domain)
        return urlunparse(new_parsed)

    @staticmethod
    def _filter_urls_by_domain(original_domain: str, all_urls: List[str]) -> Tuple[List[str], str]:
        """
        Filter URLs theo domain, cho phép redirect domain.

        Args:
            original_domain: Domain user nhập (e.g., "keonhacai.fit")
            all_urls: List URLs từ sitemap

        Returns:
            (filtered_urls, target_domain)
            - filtered_urls: URLs matching original or target domain
            - target_domain: Domain thật trong sitemap (có thể khác original nếu redirect)

        Example:
            original = "keonhacai.fit"
            sitemap URLs = ["https://pricol.org.mx/..."]
            → return (filtered_urls, "pricol.org.mx")
        """
        original = original_domain.replace('www.', '').lower()

        # Phát hiện domain từ danh sách URLs thực tế
        detected = {urlparse(u).netloc.replace('www.', '').lower() for u in all_urls}

        # Nếu chỉ có 1 domain detected → đó là target
        target = list(detected)[0] if len(detected) == 1 else (
            original if original in detected else (list(detected)[0] if detected else original)
        )

        if target != original:
            logger.info(f"✅ Redirect detected: {original} → {target}")

        filtered = [
            u for u in all_urls
            if urlparse(u).netloc.replace('www.', '').lower() in {original, target}
        ]

        return filtered, target

    @staticmethod
    def _error(domain: str, message: str) -> Dict:
        return {
            'domain': domain,
            'status': 'failed',
            'error': message,
            'total_urls': 0,
            'crawled_urls': 0,
            'results': [],
        }