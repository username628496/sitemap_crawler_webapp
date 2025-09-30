import time
from typing import Dict, List, Set
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
    
    def process_domain(self, domain: str) -> Dict:
        """
        Process a single domain - discover and parse sitemaps
        
        Args:
            domain: Domain to crawl
            
        Returns:
            Dictionary with crawl results
        """
        start_time = time.time()
        sitemaps_data = []
        all_urls = set()
        
        try:
            # Clean domain
            domain_clean = domain.replace('https://', '').replace('http://', '').strip('/')
            logger.info(f"Starting crawl for domain: {domain_clean}")
            
            # Discover sitemaps
            sitemaps = self.parser.discover_sitemaps(domain_clean)
            
            if not sitemaps:
                raise Exception("Không tìm thấy sitemap")
            
            logger.info(f"Found {len(sitemaps)} sitemap(s) for {domain_clean}")
            
            # Parse each sitemap
            for sitemap_url in sitemaps:
                sitemap_start = time.time()
                
                try:
                    urls = self.parser.parse_sitemap(sitemap_url)
                    sitemap_duration = time.time() - sitemap_start
                    
                    unique_urls = list(set(urls))
                    all_urls.update(unique_urls)
                    
                    sitemaps_data.append({
                        "sitemap": sitemap_url,
                        "count": len(unique_urls),
                        "duration": round(sitemap_duration, 2),
                        "urls": unique_urls
                    })
                    
                    logger.info(f"Parsed {len(unique_urls)} URLs from {sitemap_url} in {sitemap_duration:.2f}s")
                    
                except Exception as e:
                    sitemap_duration = time.time() - sitemap_start
                    logger.error(f"Error parsing sitemap {sitemap_url}: {e}")
                    
                    sitemaps_data.append({
                        "sitemap": sitemap_url,
                        "count": 0,
                        "duration": round(sitemap_duration, 2),
                        "error": str(e)
                    })
            
            total_duration = time.time() - start_time
            total_urls = len(all_urls)
            
            # Save to database
            session_id = self.db.save_crawl_session(
                domain=domain_clean,
                status="success",
                total_urls=total_urls,
                duration=total_duration,
                sitemaps_data=sitemaps_data,
                sample_urls=list(all_urls)[:100]
            )
            
            logger.info(f"Crawl completed for {domain_clean}: {total_urls} URLs in {total_duration:.2f}s")
            
            return {
                "domain": domain_clean,
                "status": "success",
                "total_urls": total_urls,
                "duration": total_duration,
                "sitemaps": sitemaps_data,
                "session_id": session_id
            }
            
        except Exception as e:
            total_duration = time.time() - start_time
            logger.error(f"Crawl failed for {domain}: {e}")
            
            # Save failed session
            self.db.save_crawl_session(
                domain=domain,
                status="failed",
                duration=total_duration,
                error_message=str(e),
                sitemaps_data=sitemaps_data
            )
            
            return {
                "domain": domain,
                "status": "failed",
                "error": str(e),
                "duration": total_duration
            }
    
    def process_domains(self, domains: List[str], max_workers: int = None) -> List[Dict]:
        """
        Process multiple domains concurrently
        
        Args:
            domains: List of domains to crawl
            max_workers: Maximum concurrent workers
            
        Returns:
            List of crawl results
        """
        if max_workers is None:
            max_workers = self.config.MAX_WORKERS
        
        results = []
        
        logger.info(f"Starting concurrent crawl for {len(domains)} domains with {max_workers} workers")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.process_domain, domain): domain for domain in domains}
            
            for future in as_completed(futures):
                domain = futures[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    logger.error(f"Unexpected error processing {domain}: {e}")
                    results.append({
                        "domain": domain,
                        "status": "failed",
                        "error": f"Unexpected error: {str(e)}"
                    })
        
        logger.info(f"Completed crawl for {len(domains)} domains")
        return results