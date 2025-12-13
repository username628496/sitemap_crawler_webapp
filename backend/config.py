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

    # User agent (giả lập Googlebot để vượt bot detection)
    # Websites allow Googlebot to crawl sitemaps
    USER_AGENT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

    # Request headers (giả lập Googlebot - minimal headers)
    REQUEST_HEADERS = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate",
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