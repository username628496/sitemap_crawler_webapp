import requests
import xml.etree.ElementTree as ET
from xml.etree.ElementTree import ParseError
from typing import List, Set, Optional
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from utils.logger import logger

class SitemapParser:
    def __init__(self):
        self.config = Config()
    
    def fetch_url(self, url: str, timeout: int = None) -> Optional[str]:
        """Fetch URL content with error handling"""
        if timeout is None:
            timeout = self.config.REQUEST_TIMEOUT
        
        try:
            response = requests.get(
                url, 
                headers=self.config.REQUEST_HEADERS,
                timeout=timeout
            )
            response.raise_for_status()
            
            # Handle encoding
            response.encoding = response.apparent_encoding
            return response.text
            
        except requests.exceptions.HTTPError as e:
            if response.status_code == 403:
                raise Exception(f"403 Forbidden – Trang từ chối truy cập: {url}")
            elif response.status_code == 404:
                raise Exception(f"404 Not Found – Không tìm thấy: {url}")
            else:
                raise Exception(f"Lỗi HTTP {response.status_code} – {url}")
                
        except requests.exceptions.Timeout:
            raise Exception(f"Timeout – Không thể kết nối trong {timeout}s: {url}")
            
        except requests.exceptions.ConnectionError:
            raise Exception(f"Connection Error – Không thể kết nối: {url}")
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request Error – {url}: {str(e)}")
    
    def is_valid_xml(self, text: str) -> bool:
        """Check if text is valid XML"""
        if not text or not text.strip():
            return False
        
        try:
            ET.fromstring(text.encode('utf-8'))
            return True
        except (ParseError, UnicodeEncodeError):
            return False
    
    def parse_sitemap(self, url: str, visited_sitemaps: Set[str] = None, depth: int = 0) -> List[str]:
        """
        Parse sitemap with recursion protection
        
        Args:
            url: Sitemap URL to parse
            visited_sitemaps: Set of already visited sitemaps
            depth: Current recursion depth
            
        Returns:
            List of URLs found in sitemap
        """
        if visited_sitemaps is None:
            visited_sitemaps = set()
        
        # Prevent infinite recursion
        if depth >= self.config.MAX_SITEMAP_DEPTH:
            logger.warning(f"Max sitemap depth reached for {url}")
            return []
        
        # Check if already visited
        if url in visited_sitemaps:
            logger.debug(f"Sitemap already visited: {url}")
            return []
        
        visited_sitemaps.add(url)
        urls = []
        
        try:
            xml_data = self.fetch_url(url)
            if not xml_data:
                raise Exception("Không tải được sitemap")
            
            # Parse XML
            try:
                root = ET.fromstring(xml_data.encode('utf-8'))
            except UnicodeEncodeError:
                # Try with different encoding
                root = ET.fromstring(xml_data.encode('latin-1'))
            
            # Define namespace
            ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            
            # Extract URLs
            for loc in root.findall('.//ns:url/ns:loc', ns):
                link = loc.text
                if link:
                    link = link.strip()
                    # Filter out sitemap files from results
                    if not self._is_sitemap_file(link):
                        urls.append(link)
            
            # Process nested sitemaps recursively
            for sitemap in root.findall('.//ns:sitemap/ns:loc', ns):
                sitemap_url = sitemap.text
                if sitemap_url:
                    sitemap_url = sitemap_url.strip()
                    try:
                        nested_urls = self.parse_sitemap(
                            sitemap_url, 
                            visited_sitemaps.copy(),
                            depth + 1
                        )
                        urls.extend(nested_urls)
                    except Exception as e:
                        logger.warning(f"Could not parse nested sitemap {sitemap_url}: {e}")
                        continue
            
            logger.info(f"Parsed {len(urls)} URLs from {url}")
            return urls
            
        except ParseError as e:
            raise Exception(f"XML lỗi: {str(e)}")
        except Exception as e:
            raise Exception(str(e))
    
    def _is_sitemap_file(self, url: str) -> bool:
        """Check if URL is a sitemap file"""
        url_lower = url.lower()
        return any(pattern in url_lower for pattern in [
            'sitemap.xml',
            'sitemap_index.xml',
            'sitemap-index.xml',
            '/sitemap/',
            'sitemaps.xml'
        ])
    
    def discover_sitemaps(self, domain: str) -> List[str]:
        """
        Discover sitemaps for a domain
        
        Args:
            domain: Domain to search (without protocol)
            
        Returns:
            List of discovered sitemap URLs
        """
        def try_fetch_domain(domain_variant: str) -> List[str]:
            found_sitemaps = []
            
            # Try robots.txt first
            try:
                robots_url = f"https://{domain_variant}/robots.txt"
                robots_txt = self.fetch_url(robots_url)
                
                if robots_txt:
                    for line in robots_txt.splitlines():
                        line = line.strip()
                        if line.lower().startswith('sitemap:'):
                            sitemap_url = line.split(':', 1)[1].strip()
                            try:
                                content = self.fetch_url(sitemap_url)
                                if content and self.is_valid_xml(content):
                                    found_sitemaps.append(sitemap_url)
                                    logger.info(f"Found sitemap in robots.txt: {sitemap_url}")
                            except Exception as e:
                                logger.debug(f"Sitemap from robots.txt not accessible: {sitemap_url}")
            except Exception as e:
                logger.debug(f"Could not fetch robots.txt for {domain_variant}: {e}")
            
            # Try common sitemap paths
            if not found_sitemaps:
                common_paths = [
                    'sitemap.xml',
                    'sitemap_index.xml',
                    'sitemap-index.xml',
                    'sitemap1.xml',
                    'wp-sitemap.xml',
                    'post-sitemap.xml'
                ]
                
                for path in common_paths:
                    try:
                        url = f"https://{domain_variant}/{path}"
                        content = self.fetch_url(url)
                        if content and self.is_valid_xml(content):
                            found_sitemaps.append(url)
                            logger.info(f"Found sitemap at common path: {url}")
                            break  # Stop after finding first valid sitemap
                    except Exception:
                        continue
            
            return found_sitemaps
        
        # Clean domain
        domain = domain.replace('https://', '').replace('http://', '').strip('/')
        
        # Try domain as entered
        sitemaps = try_fetch_domain(domain)
        
        # If not found and doesn't start with www, try with www
        if not sitemaps and not domain.startswith('www.'):
            www_domain = f"www.{domain}"
            sitemaps = try_fetch_domain(www_domain)
            if sitemaps:
                logger.info(f"Found sitemaps using www variant: {www_domain}")
        
        # If not found and starts with www, try without www
        if not sitemaps and domain.startswith('www.'):
            non_www_domain = domain.replace('www.', '', 1)
            sitemaps = try_fetch_domain(non_www_domain)
            if sitemaps:
                logger.info(f"Found sitemaps using non-www variant: {non_www_domain}")
        
        return sitemaps