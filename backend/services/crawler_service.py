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

                    urls = self.parser.parse_sitemap(sitemap_url)
                    sitemap_duration = time.time() - sitemap_start

                    unique_urls = list(set(urls))
                    all_urls.update(unique_urls)

                    sitemaps_data.append({
                        "sitemap": sitemap_url,
                        "count": len(unique_urls),
                        "duration": round(sitemap_duration, 2),
                        "urls": unique_urls,
                    })

                    logger.info(
                        f"✅ Đã parse {len(unique_urls)} URL từ {sitemap_url} ({sitemap_duration:.2f}s)"
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

            # Lưu kết quả vào DB
            session_id = self.db.save_crawl_session(
                domain=final_domain,
                status="success",
                total_urls=total_urls,
                duration=total_duration,
                sitemaps_data=sitemaps_data,
                sample_urls=list(all_urls)[:100],
            )

            logger.info(
                f"🏁 Crawl hoàn tất cho {final_domain}: {total_urls} URL trong {total_duration:.2f}s"
            )

            return {
                "domain": final_domain,
                "status": "success",
                "total_urls": total_urls,
                "duration": total_duration,
                "sitemaps": sitemaps_data,
                "session_id": session_id,
            }

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
    def process_domains(self, domains: List[str], max_workers: int = None) -> List[Dict]:
        if max_workers is None:
            max_workers = self.config.MAX_WORKERS

        results = []
        logger.info(
            f"⚙️ Bắt đầu crawl đồng thời {len(domains)} domain với {max_workers} worker"
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
                except Exception as e:
                    logger.error(f"🚫 Lỗi bất ngờ khi xử lý {domain}: {e}")
                    results.append({
                        "domain": domain,
                        "status": "failed",
                        "error": f"Unexpected error: {str(e)}",
                    })

        logger.info(f"✅ Hoàn tất crawl {len(domains)} domain")
        return results
