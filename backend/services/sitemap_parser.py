import requests
import xml.etree.ElementTree as ET
from urllib.parse import urljoin
from typing import List, Tuple, Set
from time import time, sleep
from config import Config
from utils.logger import logger

class SitemapParser:
    def __init__(self):
        self.headers = Config.REQUEST_HEADERS
        self.timeout = Config.REQUEST_TIMEOUT
        self.max_depth = Config.MAX_SITEMAP_DEPTH

    # -------------------------------
    # Helper: Safe fetch with retries
    # -------------------------------
    def fetch_url(self, url: str, retries: int = 3) -> str:
        """
        Fetch content from URL with auto-retry and SSL fallback.
        Returns response text or raises exception.
        """
        for attempt in range(1, retries + 1):
            try:
                res = requests.get(
                    url,
                    headers=self.headers,
                    timeout=self.timeout,
                    allow_redirects=True,
                    verify=True  # SSL verification ON
                )
                res.raise_for_status()
                logger.info(f"✅ Fetch thành công ({res.status_code}) {url}")
                return res.text

            except requests.exceptions.SSLError as e:
                logger.warning(f"⚠️ SSL Error khi fetch {url}: {e}")
                if attempt == retries:
                    logger.warning(f"⏩ Bỏ verify SSL và thử lại lần cuối: {url}")
                    try:
                        res = requests.get(
                            url,
                            headers=self.headers,
                            timeout=self.timeout,
                            allow_redirects=True,
                            verify=False  # fallback SSL verify off
                        )
                        res.raise_for_status()
                        return res.text
                    except Exception as e2:
                        raise Exception(f"SSL fallback thất bại: {e2}")

            except requests.exceptions.RequestException as e:
                logger.warning(f"⚠️ fetch_url thất bại ({attempt}/{retries}) cho {url}: {e}")
                if attempt < retries:
                    sleep(1.5 * attempt)
                else:
                    raise Exception(f"Không thể tải {url} sau {retries} lần thử: {e}")

        raise Exception(f"fetch_url không thành công sau {retries} lần thử: {url}")

    # -------------------------------
    # Tìm sitemap trong robots.txt
    # -------------------------------
    def discover_sitemaps(self, domain: str) -> Tuple[List[str], str]:
        """
        Discover sitemap URLs for a domain.
        Returns (list_of_sitemaps, final_domain)
        """
        logger.info(f"🚀 Bắt đầu crawl domain: {domain}")
        candidates = [
            f"https://{domain}/robots.txt",
            f"https://{domain}/sitemap.xml",
            f"https://{domain}/sitemap_index.xml",
            f"https://{domain}/sitemap-index.xml",
            f"https://{domain}/wp-sitemap.xml",
            f"https://{domain}/post-sitemap.xml",
        ]

        sitemaps_found = []
        final_domain = None

        for url in candidates:
            try:
                content = self.fetch_url(url)
                if "sitemap" in url and self.is_valid_xml(content):
                    logger.info(f"✅ Tìm thấy sitemap tại: {url}")
                    sitemaps_found.append(url)
                    final_domain = domain
                    continue

                # robots.txt special case
                if "robots.txt" in url and "Sitemap:" in content:
                    for line in content.splitlines():
                        if line.lower().startswith("sitemap:"):
                            sm_url = line.split(":", 1)[1].strip()
                            if sm_url.startswith("/"):
                                sm_url = urljoin(f"https://{domain}", sm_url)
                            logger.info(f"📜 Phát hiện sitemap trong robots.txt: {sm_url}")
                            try:
                                xml_data = self.fetch_url(sm_url)
                                if self.is_valid_xml(xml_data):
                                    sitemaps_found.append(sm_url)
                                    final_domain = domain
                            except Exception as e:
                                logger.warning(f"⚠️ Không thể tải sitemap từ robots.txt {sm_url}: {e}")

            except Exception as e:
                logger.warning(f"⚠️ Không thể fetch {url}: {e}")
                continue

        # thử thêm www nếu chưa có sitemap
        if not sitemaps_found and not domain.startswith("www."):
            try:
                www_domain = f"www.{domain}"
                logger.info(f"🔁 Thử lại với www: {www_domain}")
                sitemaps_found, final_domain = self.discover_sitemaps(www_domain)
            except Exception as e:
                logger.warning(f"⚠️ Không thể crawl www domain: {e}")

        if not sitemaps_found:
            logger.warning(f"⚠️ Không tìm thấy sitemap cho {domain}")
            raise Exception("Không tìm thấy sitemap hợp lệ")

        logger.info(f"🔍 Tìm thấy {len(sitemaps_found)} sitemap cho {domain}")
        return list(set(sitemaps_found)), final_domain

    # -------------------------------
    # Xác định sitemap hợp lệ
    # -------------------------------
    def is_valid_xml(self, text: str) -> bool:
        try:
            ET.fromstring(text)
            return True
        except ET.ParseError:
            return False

    # -------------------------------
    # Đệ quy parse sitemap
    # -------------------------------
    def parse_sitemap(self, sitemap_url: str, visited: Set[str] = None, depth: int = 0) -> List[str]:
        """
        Parse XML sitemap and return list of URLs.
        Supports nested sitemap indexes.
        """
        if visited is None:
            visited = set()
        if sitemap_url in visited:
            return []
        if depth > self.max_depth:
            logger.warning(f"⚠️ Quá độ sâu cho sitemap: {sitemap_url}")
            return []

        visited.add(sitemap_url)
        logger.info(f"📥 Đang parse sitemap: {sitemap_url}")

        try:
            xml_data = self.fetch_url(sitemap_url)
        except Exception as e:
            raise Exception(f"Lỗi tải sitemap: {e}")

        urls = []
        try:
            root = ET.fromstring(xml_data)
            ns = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}

            # URL set
            for loc in root.findall(".//ns:url/ns:loc", ns):
                if loc.text:
                    urls.append(loc.text.strip())

            # Nested sitemaps
            for sm in root.findall(".//ns:sitemap/ns:loc", ns):
                nested_url = sm.text.strip()
                if nested_url not in visited:
                    nested_urls = self.parse_sitemap(nested_url, visited, depth + 1)
                    urls.extend(nested_urls)

            logger.info(f"✅ Parsed {len(urls)} URLs từ {sitemap_url}")
            return list(set(urls))

        except ET.ParseError as e:
            raise Exception(f"Lỗi parse XML {sitemap_url}: {e}")
        except Exception as e:
            raise Exception(f"Lỗi không xác định khi parse sitemap {sitemap_url}: {e}")
