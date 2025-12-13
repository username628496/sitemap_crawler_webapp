from services.sitemap_parser import SitemapParser
from utils.logger import logger

parser = SitemapParser()

domain = "for88-vn.co"
logger.info(f"🧭 Test discover sitemaps cho: {domain}")

sitemaps, final_domain = parser.discover_sitemaps(domain)
logger.info(f"📜 Sitemaps tìm thấy: {sitemaps}")
logger.info(f"🌐 Final domain sau redirect: {final_domain}")

if sitemaps:
    for sm in sitemaps:
        logger.info(f"🚀 Parse sitemap: {sm}")
        urls = parser.parse_sitemap(sm)
        logger.info(f"✅ {len(urls)} URLs được parse từ {sm}")
else:
    logger.warning("⚠️ Không tìm thấy sitemap nào")