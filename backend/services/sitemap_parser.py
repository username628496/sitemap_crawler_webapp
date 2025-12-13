import requests
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse
from typing import List, Tuple, Set, Optional
from time import time, sleep
from dataclasses import dataclass, asdict
from config import Config
from utils.logger import logger


# ============================================================
# Redirect Tracking Data Structures
# ============================================================
@dataclass
class RedirectHop:
    """Represents a single hop in a redirect chain"""
    url: str
    status_code: int
    location: Optional[str]
    duration: float  # milliseconds


@dataclass
class RedirectChain:
    """Complete redirect chain information"""
    initial_url: str
    final_url: str
    hops: List[RedirectHop]
    total_redirects: int
    total_duration: float  # milliseconds
    has_loop: bool = False
    loop_at: Optional[int] = None

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'initial_url': self.initial_url,
            'final_url': self.final_url,
            'total_redirects': self.total_redirects,
            'total_duration': round(self.total_duration, 2),
            'has_loop': self.has_loop,
            'loop_at': self.loop_at,
            'hops': [
                {
                    'url': hop.url,
                    'status_code': hop.status_code,
                    'location': hop.location,
                    'duration': round(hop.duration, 2)
                }
                for hop in self.hops
            ]
        }


# ============================================================
# Redirect Tracker
# ============================================================
class RedirectTracker:
    """Tracks and analyzes HTTP redirect chains"""

    def __init__(self, max_redirects: int = 10):
        self.max_redirects = max_redirects

    def fetch_with_redirect_tracking(
        self,
        url: str,
        headers: dict,
        timeout: int,
        verify: bool = True
    ) -> Tuple[requests.Response, RedirectChain]:
        """
        Fetch URL and track complete redirect chain.

        Returns:
            Tuple of (final_response, redirect_chain)

        Raises:
            Exception if redirect loop detected or too many redirects
        """
        chain_start = time()
        hops = []
        visited_urls = set()
        current_url = url

        for redirect_count in range(self.max_redirects + 1):
            # Detect redirect loop
            if current_url in visited_urls:
                chain = RedirectChain(
                    initial_url=url,
                    final_url=current_url,
                    hops=hops,
                    total_redirects=len(hops),
                    total_duration=(time() - chain_start) * 1000,
                    has_loop=True,
                    loop_at=redirect_count
                )
                raise Exception(
                    f"Redirect loop detected at {current_url} "
                    f"(visited {redirect_count} times)"
                )

            visited_urls.add(current_url)
            hop_start = time()

            try:
                # Request WITHOUT auto-follow redirects
                response = requests.get(
                    current_url,
                    headers=headers,
                    timeout=timeout,
                    allow_redirects=False,  # Manual redirect handling
                    verify=verify
                )
            except Exception as e:
                raise Exception(f"Request failed at {current_url}: {e}")

            hop_duration = (time() - hop_start) * 1000

            # Record this hop
            location = response.headers.get('Location')
            hops.append(RedirectHop(
                url=current_url,
                status_code=response.status_code,
                location=location,
                duration=hop_duration
            ))

            # Check if this is a redirect response
            if response.status_code in (301, 302, 303, 307, 308):
                if not location:
                    raise Exception(
                        f"Redirect {response.status_code} without Location header at {current_url}"
                    )

                # Resolve relative URLs
                next_url = urljoin(current_url, location)

                # Log redirect type
                redirect_type = {
                    301: "Permanent",
                    302: "Found (Temporary)",
                    303: "See Other",
                    307: "Temporary",
                    308: "Permanent"
                }.get(response.status_code, "Unknown")

                logger.info(
                    f"🔄 {response.status_code} {redirect_type}: "
                    f"{current_url} → {next_url} ({hop_duration:.0f}ms)"
                )

                current_url = next_url

                # Check max redirects limit
                if redirect_count >= self.max_redirects:
                    raise Exception(
                        f"Too many redirects (>{self.max_redirects}). "
                        f"Last URL: {current_url}"
                    )

                continue  # Next hop

            # Final response (2xx, 4xx, 5xx - not a redirect)
            total_duration = (time() - chain_start) * 1000
            chain = RedirectChain(
                initial_url=url,
                final_url=current_url,
                hops=hops,
                total_redirects=len(hops) - 1,  # -1 because final hop is not a redirect
                total_duration=total_duration
            )

            if chain.total_redirects > 0:
                logger.info(
                    f"✅ Redirect chain complete: {url} → {current_url} "
                    f"({chain.total_redirects} redirects, {total_duration:.0f}ms)"
                )

            return response, chain

        raise Exception(f"Unexpected: exceeded max redirects in loop")


# ============================================================
# Sitemap Parser
# ============================================================
class SitemapParser:
    def __init__(self):
        self.headers = Config.REQUEST_HEADERS
        self.timeout = Config.REQUEST_TIMEOUT
        self.max_depth = Config.MAX_SITEMAP_DEPTH
        self.redirect_tracker = RedirectTracker(max_redirects=10)
        # Use session to maintain cookies (important for Cloudflare)
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    # -------------------------------
    # Helper: Safe fetch with retries and redirect tracking
    # -------------------------------
    def fetch_url(self, url: str, retries: int = 3, track_redirects: bool = True) -> Tuple[str, Optional[RedirectChain]]:
        """
        Fetch content from URL with auto-retry, SSL fallback, and optional redirect tracking.

        Args:
            url: URL to fetch
            retries: Number of retry attempts
            track_redirects: If True, track full redirect chain. If False, use fast auto-follow.

        Returns:
            Tuple of (response_text, redirect_chain)
            redirect_chain is None if track_redirects=False or no redirects occurred
        """
        for attempt in range(1, retries + 1):
            try:
                if track_redirects:
                    # Use redirect tracker to fetch with full chain tracking
                    response, chain = self.redirect_tracker.fetch_with_redirect_tracking(
                        url,
                        self.headers,
                        self.timeout,
                        verify=False  # SSL verification OFF (many domains have invalid certs)
                    )
                    response.raise_for_status()

                    # Log redirect summary if redirects occurred
                    if chain.total_redirects > 0:
                        logger.warning(
                            f"⚠️ {url} đã redirect {chain.total_redirects} lần: "
                            f"{chain.initial_url} → {chain.final_url}"
                        )
                    else:
                        logger.info(f"✅ Fetch thành công ({response.status_code}) {url}")

                    # Small delay after successful request (anti-Cloudflare)
                    import random
                    sleep(random.uniform(0.5, 1.5))

                    return response.text, chain
                else:
                    # Fast path: use auto-follow redirects (no tracking)
                    response = self.session.get(
                        url,
                        timeout=self.timeout,
                        allow_redirects=True,  # Auto-follow (faster)
                        verify=False  # SSL verification OFF (many domains have invalid certs)
                    )
                    response.raise_for_status()
                    logger.info(f"✅ Fetch thành công ({response.status_code}) {url}")

                    # Small delay after successful request (anti-Cloudflare)
                    import random
                    sleep(random.uniform(0.5, 1.5))

                    return response.text, None

            except requests.exceptions.SSLError as e:
                logger.warning(f"⚠️ SSL Error khi fetch {url}: {e}")
                if attempt == retries:
                    logger.warning(f"⏩ Bỏ verify SSL và thử lại lần cuối: {url}")
                    try:
                        if track_redirects:
                            # Retry with SSL verification off + redirect tracking
                            response, chain = self.redirect_tracker.fetch_with_redirect_tracking(
                                url,
                                self.headers,
                                self.timeout,
                                verify=False  # fallback SSL verify off
                            )
                            response.raise_for_status()

                            if chain.total_redirects > 0:
                                logger.warning(
                                    f"⚠️ {url} đã redirect {chain.total_redirects} lần (SSL off): "
                                    f"{chain.initial_url} → {chain.final_url}"
                                )

                            return response.text, chain
                        else:
                            # Fast path with SSL off
                            response = self.session.get(
                                url,
                                timeout=self.timeout,
                                allow_redirects=True,
                                verify=False
                            )
                            response.raise_for_status()
                            return response.text, None
                    except Exception as e2:
                        raise Exception(f"SSL fallback thất bại: {e2}")

            except requests.exceptions.RequestException as e:
                logger.warning(f"⚠️ fetch_url thất bại ({attempt}/{retries}) cho {url}: {e}")
                if attempt < retries:
                    # Random delay để tránh Cloudflare bot detection
                    import random
                    delay = 2.0 + random.uniform(0, 2.0)  # 2-4 seconds random
                    sleep(delay)
                else:
                    raise Exception(f"Không thể tải {url} sau {retries} lần thử: {e}")

            except Exception as e:
                # Handle redirect loop or other errors
                if "loop" in str(e).lower():
                    logger.error(f"🔄 Phát hiện redirect loop tại {url}: {e}")
                    raise Exception(f"Redirect loop detected: {e}")
                logger.warning(f"⚠️ Lỗi khi fetch {url} (attempt {attempt}/{retries}): {e}")
                if attempt < retries:
                    sleep(1.5 * attempt)
                else:
                    raise

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
                # Use fast path (no redirect tracking) for discovery phase
                content, chain = self.fetch_url(url, track_redirects=False)
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
                                # Fast path for robots.txt sitemaps too
                                xml_data, _ = self.fetch_url(sm_url, track_redirects=False)
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
    def parse_sitemap(self, sitemap_url: str, visited: Set[str] = None, depth: int = 0) -> Tuple[List[str], List[RedirectChain]]:
        """
        Parse XML sitemap and return list of URLs with redirect chains.
        Supports nested sitemap indexes.

        Returns:
            Tuple of (urls_list, redirect_chains_list)
        """
        if visited is None:
            visited = set()
        if sitemap_url in visited:
            return [], []
        if depth > self.max_depth:
            logger.warning(f"⚠️ Quá độ sâu cho sitemap: {sitemap_url}")
            return [], []

        visited.add(sitemap_url)
        logger.info(f"📥 Đang parse sitemap: {sitemap_url}")

        try:
            xml_data, chain = self.fetch_url(sitemap_url)
        except Exception as e:
            raise Exception(f"Lỗi tải sitemap: {e}")

        urls = []
        redirect_chains = []

        # Collect redirect chain if there were redirects
        if chain and chain.total_redirects > 0:
            redirect_chains.append(chain)

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
                    nested_urls, nested_chains = self.parse_sitemap(nested_url, visited, depth + 1)
                    urls.extend(nested_urls)
                    redirect_chains.extend(nested_chains)

            logger.info(f"✅ Parsed {len(urls)} URLs từ {sitemap_url}")
            return list(set(urls)), redirect_chains

        except ET.ParseError as e:
            raise Exception(f"Lỗi parse XML {sitemap_url}: {e}")
        except Exception as e:
            raise Exception(f"Lỗi không xác định khi parse sitemap {sitemap_url}: {e}")