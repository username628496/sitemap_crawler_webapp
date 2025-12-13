import os

class Config:
    # Flask server
    DEBUG = False
    HOST = '0.0.0.0'
    PORT = 8000

    # Database
    DATABASE_PATH = 'crawl_history.db'

    # Crawler settings
    MAX_WORKERS = 10
    REQUEST_TIMEOUT = 15          # tăng timeout để tránh lỗi Connection Reset
    MAX_SITEMAP_DEPTH = 10        # giữ nguyên để crawl sâu sitemap_index.xml

    # Multiple user agents to rotate (bypass bot detection)
    USER_AGENTS = [
        # Googlebot
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        # Bingbot
        "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
        # Chrome on Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        # Chrome on Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        # Firefox
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    ]

    # Default user agent (will be rotated)
    USER_AGENT = USER_AGENTS[0]

    # Request headers (minimal to look like real browser)
    REQUEST_HEADERS = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

    # History settings
    MAX_SAMPLE_URLS = 50
    DEFAULT_HISTORY_LIMIT = 20
    MAX_HISTORY_LIMIT = 100

    # Timezone
    TIMEZONE = 'Asia/Ho_Chi_Minh'

    # Optional: Proxy config (nếu bạn cần crawl domain chỉ mở tại VN)
    USE_PROXY = False
    PROXIES = {
        "http":  os.getenv("HTTP_PROXY", ""),
        "https": os.getenv("HTTPS_PROXY", ""),
    }


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}