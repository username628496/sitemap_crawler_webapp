"""
Async Sitemap Crawler using httpx + asyncio
High-performance concurrent crawler with proper resource management
"""
import asyncio
import httpx
import xml.etree.ElementTree as ET
from typing import List, Optional, Tuple, Dict, Set
from dataclasses import dataclass, field
from time import time
from urllib.parse import urljoin, urlparse
import logging

logger = logging.getLogger(__name__)


@dataclass
class RedirectHop:
    """Single redirect hop"""
    url: str
    status_code: int
    location: Optional[str]
    duration: float  # milliseconds


@dataclass
class RedirectChain:
    """Complete redirect chain"""
    initial_url: str
    final_url: str
    hops: List[RedirectHop]
    total_redirects: int
    total_duration: float  # milliseconds
    has_loop: bool = False
    loop_at: Optional[int] = None


@dataclass
class SitemapResult:
    """Result from parsing a single sitemap"""
    sitemap: str
    count: int
    duration: float
    urls: List[str]
    redirect_count: int = 0


@dataclass
class DomainResult:
    """Result from crawling a single domain"""
    domain: str
    original_domain: str
    status: str
    total_urls: int
    duration: float
    sitemaps: List[SitemapResult]
    error: Optional[str] = None
    redirect_info: Optional[Dict] = None
    redirect_chains: List[RedirectChain] = field(default_factory=list)
    duplicates_removed: int = 0  # Number of duplicate URLs removed


class AsyncSitemapCrawler:
    """
    High-performance async sitemap crawler
    Features:
    - HTTP/2 support
    - Connection pooling
    - Concurrency control via semaphore
    - Timeout management
    - Redirect tracking
    - Memory limits
    """

    def __init__(
        self,
        max_concurrent: int = 50,
        timeout: float = 15.0,
        max_urls_per_domain: int = 100000,  # Increased to 100k URLs
        max_redirects: int = 10
    ):
        self.max_concurrent = max_concurrent
        self.timeout = timeout
        self.max_urls_per_domain = max_urls_per_domain
        self.max_redirects = max_redirects
        self.semaphore = asyncio.Semaphore(max_concurrent)

        # HTTP client with HTTP/2 and connection pooling
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(timeout),
            limits=httpx.Limits(
                max_connections=max_concurrent,
                max_keepalive_connections=max_concurrent // 2
            ),
            http2=True,
            verify=False,  # Disable SSL verification
            follow_redirects=False  # Manual redirect handling
        )

        logger.info(f"✅ AsyncSitemapCrawler initialized: {max_concurrent} concurrent, HTTP/2 enabled")

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

    async def fetch_with_redirect_tracking(
        self,
        url: str
    ) -> Tuple[str, Optional[RedirectChain]]:
        """
        Fetch URL and track complete redirect chain

        Returns:
            Tuple of (response_text, redirect_chain)
        """
        chain_start = time()
        hops = []
        visited_urls = set()
        current_url = url

        async with self.semaphore:  # Limit concurrent requests
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
                    raise Exception(f"Redirect loop detected at {current_url}")

                visited_urls.add(current_url)
                hop_start = time()

                try:
                    response = await self.client.get(current_url)
                    hop_duration = (time() - hop_start) * 1000

                    # Record hop
                    location = response.headers.get('location')
                    hops.append(RedirectHop(
                        url=current_url,
                        status_code=response.status_code,
                        location=location,
                        duration=hop_duration
                    ))

                    # Check if redirect
                    if response.is_redirect and location:
                        # Resolve relative URL
                        current_url = urljoin(current_url, location)

                        if redirect_count >= self.max_redirects:
                            raise Exception(f"Too many redirects (>{self.max_redirects})")

                        continue

                    # Final response
                    if response.status_code != 200:
                        raise Exception(f"HTTP {response.status_code}")

                    # Validate XML content
                    text = response.text
                    if not self._is_valid_xml(text):
                        content_type = response.headers.get('content-type', '')
                        raise Exception(f"Invalid content type: {content_type} (expected XML)")

                    # Build redirect chain if any redirects occurred
                    chain = None
                    if len(hops) > 1:
                        chain = RedirectChain(
                            initial_url=url,
                            final_url=current_url,
                            hops=hops,
                            total_redirects=len(hops) - 1,
                            total_duration=(time() - chain_start) * 1000
                        )

                    return text, chain

                except httpx.HTTPError as e:
                    raise Exception(f"HTTP error: {e}")

            raise Exception(f"Unexpected error in redirect loop")

    def _is_valid_xml(self, content: str) -> bool:
        """Check if content is valid XML"""
        content = content.strip()
        return (
            content.startswith('<?xml') or
            content.startswith('<urlset') or
            content.startswith('<sitemapindex')
        )

    async def parse_sitemap(
        self,
        sitemap_url: str,
        visited: Set[str],
        depth: int = 0
    ) -> Tuple[List[str], List[RedirectChain]]:
        """
        Parse sitemap recursively (for sitemap indexes)

        Returns:
            Tuple of (urls, redirect_chains)
        """
        if sitemap_url in visited:
            return [], []

        if depth > 5:  # Max depth limit
            logger.warning(f"Max depth exceeded for {sitemap_url}")
            return [], []

        visited.add(sitemap_url)

        try:
            # Fetch sitemap
            xml_data, chain = await self.fetch_with_redirect_tracking(sitemap_url)

            chains = []
            if chain and chain.total_redirects > 0:
                chains.append(chain)

            # Parse XML
            root = ET.fromstring(xml_data)

            # Check if it's a sitemap index
            if root.tag.endswith('sitemapindex'):
                # Parse nested sitemaps concurrently
                nested_sitemaps = [
                    elem.text
                    for elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                    if elem.text
                ]

                # Parse all nested sitemaps (no artificial limit)
                all_urls = []
                for sitemap in nested_sitemaps:  # Crawl all nested sitemaps
                    if len(all_urls) >= self.max_urls_per_domain:
                        logger.warning(f"Reached max_urls_per_domain limit ({self.max_urls_per_domain})")
                        break

                    nested_urls, nested_chains = await self.parse_sitemap(
                        sitemap, visited, depth + 1
                    )
                    all_urls.extend(nested_urls[:self.max_urls_per_domain - len(all_urls)])
                    chains.extend(nested_chains)

                return all_urls, chains

            # Regular sitemap with URLs
            urls = [
                elem.text
                for elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                if elem.text
            ]

            return urls[:self.max_urls_per_domain], chains

        except Exception as e:
            logger.error(f"Error parsing sitemap {sitemap_url}: {e}")
            return [], []

    async def discover_sitemaps(self, domain: str) -> Tuple[List[str], str]:
        """
        Discover sitemaps for a domain

        Returns:
            Tuple of (sitemap_urls, final_domain)
        """
        # Try without www first
        if not domain.startswith('http'):
            domain = f"https://{domain}"

        parsed = urlparse(domain)
        base_domain = parsed.netloc or parsed.path

        # Priority candidates
        priority_candidates = [
            f"https://{base_domain}/robots.txt",
            f"https://{base_domain}/sitemap.xml",
            f"https://{base_domain}/sitemap_index.xml",
        ]

        # Fallback candidates
        fallback_candidates = [
            f"https://{base_domain}/wp-sitemap.xml",
            f"https://{base_domain}/post-sitemap.xml",
        ]

        sitemaps_found = []
        has_index_sitemap = False
        discovery_errors = []

        # Check priority candidates first
        for candidate_url in priority_candidates:
            try:
                async with self.semaphore:
                    response = await self.client.get(candidate_url, follow_redirects=True)

                    if response.status_code == 200:
                        content = response.text

                        # Check for sitemaps in robots.txt
                        if 'robots.txt' in candidate_url and 'Sitemap:' in content:
                            for line in content.split('\n'):
                                if line.lower().startswith('sitemap:'):
                                    sm_url = line.split(':', 1)[1].strip()
                                    sitemaps_found.append(sm_url)
                                    if '<sitemapindex' in content:
                                        has_index_sitemap = True

                        # Check if it's a valid sitemap
                        elif self._is_valid_xml(content):
                            sitemaps_found.append(candidate_url)
                            if '<sitemapindex' in content:
                                has_index_sitemap = True
                    else:
                        discovery_errors.append(f"{candidate_url}: HTTP {response.status_code}")

            except httpx.TimeoutException:
                discovery_errors.append(f"{candidate_url}: Timeout")
            except httpx.ConnectError:
                discovery_errors.append(f"{candidate_url}: Connection refused")
            except Exception as e:
                discovery_errors.append(f"{candidate_url}: {str(e)[:50]}")
                logger.debug(f"Discovery failed for {candidate_url}: {e}")
                continue

        # Only check fallback if no sitemap index found
        if not has_index_sitemap:
            for candidate_url in fallback_candidates:
                try:
                    async with self.semaphore:
                        response = await self.client.get(candidate_url, follow_redirects=True)

                        if response.status_code == 200 and self._is_valid_xml(response.text):
                            sitemaps_found.append(candidate_url)

                except Exception:
                    continue

        # Try with www if no sitemaps found
        if not sitemaps_found and not base_domain.startswith('www.'):
            www_domain = f"www.{base_domain}"
            try:
                return await self.discover_sitemaps(www_domain)
            except Exception as e:
                # Add www error to discovery errors
                discovery_errors.append(f"www.{base_domain}: {str(e)[:50]}")

        # If no sitemaps found, raise detailed error
        if not sitemaps_found:
            error_msg = "Không tìm thấy sitemap hợp lệ. Đã kiểm tra:\n"
            if discovery_errors:
                error_msg += "\n".join(f"  • {err}" for err in discovery_errors[:5])
            else:
                error_msg += f"  • {base_domain}/robots.txt\n"
                error_msg += f"  • {base_domain}/sitemap.xml\n"
                error_msg += f"  • {base_domain}/sitemap_index.xml"
            raise Exception(error_msg)

        # Deduplicate
        unique_sitemaps = list(dict.fromkeys(sitemaps_found))

        return unique_sitemaps, base_domain

    async def crawl_domain(self, domain: str) -> DomainResult:
        """
        Crawl a single domain

        Returns:
            DomainResult with all URLs and metadata
        """
        start_time = time()
        original_domain = domain.replace('https://', '').replace('http://', '').rstrip('/')

        logger.info(f"🚀 Starting async crawl: {original_domain}")

        try:
            # Discover sitemaps
            sitemaps, final_domain = await self.discover_sitemaps(original_domain)

            if not sitemaps:
                duration = time() - start_time
                return DomainResult(
                    domain=final_domain,
                    original_domain=original_domain,
                    status="failed",
                    total_urls=0,
                    duration=duration,
                    sitemaps=[],
                    error="No sitemaps found"
                )

            logger.info(f"🔍 Found {len(sitemaps)} sitemaps for {final_domain}")

            # Parse all sitemaps concurrently
            sitemap_results = []
            all_redirect_chains = []
            all_urls_set = set()
            total_urls_before_dedup = 0  # Track total before deduplication

            for sitemap_url in sitemaps:
                sm_start = time()

                urls, chains = await self.parse_sitemap(
                    sitemap_url,
                    visited=set(),
                    depth=0
                )

                sm_duration = time() - sm_start
                total_urls_before_dedup += len(urls)  # Count all URLs before dedup

                # Deduplicate URLs
                unique_urls = [u for u in urls if u not in all_urls_set]
                for u in unique_urls[:self.max_urls_per_domain - len(all_urls_set)]:
                    all_urls_set.add(u)

                sitemap_results.append(SitemapResult(
                    sitemap=sitemap_url,
                    count=len(urls),  # Original count from sitemap
                    duration=sm_duration,
                    urls=urls,  # Return all URLs (frontend will dedupe if needed)
                    redirect_count=len(chains)
                ))

                all_redirect_chains.extend(chains)

                # Stop if max URLs reached
                if len(all_urls_set) >= self.max_urls_per_domain:
                    logger.warning(f"Max URLs limit reached for {final_domain}")
                    break

            duration = time() - start_time
            duplicates_removed = total_urls_before_dedup - len(all_urls_set)

            # Build redirect info
            redirect_info = None
            if all_redirect_chains:
                redirect_info = {
                    'total_chains': len(all_redirect_chains),
                    'total_hops': sum(c.total_redirects for c in all_redirect_chains),
                    'max_redirects': max(c.total_redirects for c in all_redirect_chains),
                    'has_loops': any(c.has_loop for c in all_redirect_chains)
                }

            logger.info(
                f"✅ Crawl complete for {final_domain}: {len(all_urls_set)} unique URLs "
                f"({total_urls_before_dedup} total, {duplicates_removed} duplicates removed) in {duration:.2f}s"
            )

            return DomainResult(
                domain=final_domain,
                original_domain=original_domain,
                status="success",
                total_urls=len(all_urls_set),
                duration=duration,
                sitemaps=sitemap_results,
                redirect_info=redirect_info,
                redirect_chains=all_redirect_chains[:5],  # Limit to first 5
                duplicates_removed=duplicates_removed
            )

        except httpx.TimeoutException:
            duration = time() - start_time
            error_msg = f"Timeout: Domain {original_domain} không phản hồi sau {self.timeout}s"
            logger.error(f"❌ {error_msg}")
            return DomainResult(
                domain=original_domain,
                original_domain=original_domain,
                status="failed",
                total_urls=0,
                duration=duration,
                sitemaps=[],
                error=error_msg
            )

        except httpx.ConnectError as e:
            duration = time() - start_time
            error_msg = f"Lỗi kết nối: Không thể kết nối tới {original_domain}"
            if "Name or service not known" in str(e):
                error_msg = f"Domain không tồn tại: {original_domain} không tìm thấy DNS record"
            elif "Connection refused" in str(e):
                error_msg = f"Kết nối bị từ chối: {original_domain} từ chối kết nối"
            logger.error(f"❌ {error_msg}")
            return DomainResult(
                domain=original_domain,
                original_domain=original_domain,
                status="failed",
                total_urls=0,
                duration=duration,
                sitemaps=[],
                error=error_msg
            )

        except httpx.HTTPStatusError as e:
            duration = time() - start_time
            error_msg = f"HTTP {e.response.status_code}: {original_domain} trả về lỗi"
            logger.error(f"❌ {error_msg}")
            return DomainResult(
                domain=original_domain,
                original_domain=original_domain,
                status="failed",
                total_urls=0,
                duration=duration,
                sitemaps=[],
                error=error_msg
            )

        except Exception as e:
            duration = time() - start_time
            error_msg = str(e)
            # Keep the detailed error message we created
            logger.error(f"❌ Crawl failed for {original_domain}: {error_msg}")

            return DomainResult(
                domain=original_domain,
                original_domain=original_domain,
                status="failed",
                total_urls=0,
                duration=duration,
                sitemaps=[],
                error=error_msg
            )

    async def crawl_domains(self, domains: List[str]) -> List[DomainResult]:
        """
        Crawl multiple domains concurrently

        Returns:
            List of DomainResult
        """
        logger.info(f"🚀 Starting async crawl for {len(domains)} domains")
        start_time = time()

        # Create tasks for all domains
        tasks = [self.crawl_domain(domain) for domain in domains]

        # Gather results (exceptions are caught in crawl_domain)
        results = await asyncio.gather(*tasks, return_exceptions=False)

        duration = time() - start_time
        success_count = sum(1 for r in results if r.status == 'success')
        total_urls = sum(r.total_urls for r in results)

        logger.info(
            f"✅ Async crawl complete: {len(domains)} domains, "
            f"{success_count} success, {total_urls} URLs, {duration:.2f}s"
        )

        return results
