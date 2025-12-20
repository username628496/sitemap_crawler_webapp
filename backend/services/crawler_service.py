import time
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from utils.logger import logger
from services.sitemap_parser import SitemapParser
from models.database import DatabaseManager


class CrawlerService:
    def __init__(self, db_manager: DatabaseManager = None):
        self.config = Config()
        self.parser = SitemapParser()
        self.db = db_manager or DatabaseManager()

    # ============================================================
    # Xử lý 1 domain duy nhất
    # ============================================================
    def process_domain(self, domain: str) -> Dict:
        start_time = time.time()
        sitemaps_data = []
        all_urls = set()
        all_redirect_chains = []  # Collect all redirect chains

        try:
            # Làm sạch domain
            domain_clean = domain.replace("https://", "").replace("http://", "").strip("/")
            logger.info(f"🚀 Bắt đầu crawl domain: {domain_clean}")

            # ⚡️ Discover sitemaps (phải unpack 2 giá trị)
            sitemaps, final_domain = self.parser.discover_sitemaps(domain_clean)

            if not sitemaps:
                raise Exception("Không tìm thấy sitemap hợp lệ")

            logger.info(f"🔍 Tìm thấy {len(sitemaps)} sitemap cho {final_domain}")

            # Crawl từng sitemap
            for sitemap_url in sitemaps:
                sitemap_start = time.time()
                try:
                    # Đảm bảo sitemap_url là string
                    if isinstance(sitemap_url, list):
                        sitemap_url = sitemap_url[0]
                    if not isinstance(sitemap_url, str) or not sitemap_url.strip():
                        raise Exception(f"Sai định dạng sitemap: {sitemap_url}")

                    # Parse sitemap and get redirect chains
                    urls, redirect_chains = self.parser.parse_sitemap(sitemap_url)
                    sitemap_duration = time.time() - sitemap_start

                    unique_urls = list(set(urls))
                    all_urls.update(unique_urls)
                    all_redirect_chains.extend(redirect_chains)

                    # Prepare sitemap data with redirect info
                    sitemap_info = {
                        "sitemap": sitemap_url,
                        "count": len(unique_urls),
                        "duration": round(sitemap_duration, 2),
                        "urls": unique_urls,
                    }

                    # Add redirect summary if there were redirects
                    if redirect_chains:
                        sitemap_info["redirect_count"] = len(redirect_chains)
                        sitemap_info["total_redirect_hops"] = sum(
                            chain.total_redirects for chain in redirect_chains
                        )

                    sitemaps_data.append(sitemap_info)

                    logger.info(
                        f"✅ Đã parse {len(unique_urls)} URL từ {sitemap_url} "
                        f"({sitemap_duration:.2f}s, {len(redirect_chains)} redirects)"
                    )

                except Exception as e:
                    sitemap_duration = time.time() - sitemap_start
                    logger.error(f"❌ Lỗi parse sitemap {sitemap_url}: {e}")

                    sitemaps_data.append({
                        "sitemap": sitemap_url,
                        "count": 0,
                        "duration": round(sitemap_duration, 2),
                        "error": str(e),
                    })

            total_duration = time.time() - start_time
            total_urls = len(all_urls)

            # Lưu kết quả vào DB (including redirect chains)
            session_id = self.db.save_crawl_session(
                domain=final_domain,
                original_domain=domain_clean,  # Save original domain
                status="success",
                total_urls=total_urls,
                duration=total_duration,
                sitemaps_data=sitemaps_data,
                sample_urls=list(all_urls)[:100],
                redirect_chains=all_redirect_chains,  # Pass redirect chains
            )

            # Prepare redirect summary for response
            redirect_summary = None
            if all_redirect_chains:
                redirect_summary = {
                    "total_chains": len(all_redirect_chains),
                    "total_hops": sum(chain.total_redirects for chain in all_redirect_chains),
                    "max_redirects": max(chain.total_redirects for chain in all_redirect_chains),
                    "has_loops": any(chain.has_loop for chain in all_redirect_chains),
                }

            logger.info(
                f"🏁 Crawl hoàn tất cho {final_domain}: {total_urls} URL trong {total_duration:.2f}s "
                f"({len(all_redirect_chains)} redirect chains)"
            )

            result = {
                "domain": final_domain,
                "original_domain": domain_clean,  # Include original domain in response
                "status": "success",
                "total_urls": total_urls,
                "duration": total_duration,
                "sitemaps": sitemaps_data,
                "session_id": session_id,
            }

            # Add redirect info if present
            if redirect_summary:
                result["redirect_info"] = redirect_summary
                result["redirect_chains"] = [chain.to_dict() for chain in all_redirect_chains[:5]]  # Limit to first 5 for response

            return result

        except Exception as e:
            total_duration = time.time() - start_time
            logger.error(f"💥 Crawl thất bại cho {domain}: {e}")

            # Lưu phiên thất bại
            self.db.save_crawl_session(
                domain=domain,
                status="failed",
                duration=total_duration,
                error_message=str(e),
                sitemaps_data=sitemaps_data,
            )

            return {
                "domain": domain,
                "status": "failed",
                "error": str(e),
                "duration": total_duration,
            }

    # ============================================================
    # Xử lý nhiều domain song song
    # ============================================================
    def process_domains(self, domains: List[str], max_workers: int = None, callback=None) -> List[Dict]:
        """
        Process multiple domains concurrently.

        Args:
            domains: List of domains to crawl
            max_workers: Number of concurrent workers
            callback: Optional callback function called after each domain completes.
                     Signature: callback(result: Dict, completed: int, total: int)

        Returns:
            List of crawl results
        """
        if max_workers is None:
            max_workers = self.config.MAX_WORKERS

        results = []
        completed_count = 0
        total_domains = len(domains)

        logger.info(
            f"⚙️ Bắt đầu crawl đồng thời {total_domains} domain với {max_workers} worker"
        )

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self.process_domain, domain): domain for domain in domains
            }

            for future in as_completed(futures):
                domain = futures[future]
                try:
                    result = future.result()
                    results.append(result)
                    completed_count += 1

                    # Call callback if provided (for SSE streaming)
                    if callback:
                        callback(result, completed_count, total_domains)

                except Exception as e:
                    logger.error(f"🚫 Lỗi bất ngờ khi xử lý {domain}: {e}")
                    error_result = {
                        "domain": domain,
                        "status": "failed",
                        "error": f"Unexpected error: {str(e)}",
                    }
                    results.append(error_result)
                    completed_count += 1

                    # Call callback for errors too
                    if callback:
                        callback(error_result, completed_count, total_domains)

        logger.info(f"✅ Hoàn tất crawl {total_domains} domain")
        return results