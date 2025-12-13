import os

class Config:
    # Flask server
    DEBUG = False
    HOST = '0.0.0.0'
    PORT = int(os.getenv('PORT', 8000))

    # Database
    DATABASE_PATH = os.getenv('DATABASE_PATH', 'crawl_history.db')

    # Crawler settings
    MAX_WORKERS = int(os.getenv('MAX_WORKERS', 10))
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', 20))  # tăng lên 20s
    MAX_SITEMAP_DEPTH = int(os.getenv('MAX_SITEMAP_DEPTH', 10))

    # User Agent Pool - Googlebot first
    USER_AGENTS = [
        # Googlebot (highest priority for sitemap access)
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Googlebot/2.1 (+http://www.google.com/bot.html)",

        # Other search engine bots
        "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
        "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",

        # Regular browsers
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    ]

    USER_AGENT = USER_AGENTS[0]  # Default Googlebot

    # Request headers
    REQUEST_HEADERS = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "DNT": "1",
    }

    # Retry settings
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', 3))
    RETRY_DELAY = float(os.getenv('RETRY_DELAY', 2.0))
    EXPONENTIAL_BACKOFF = True

    # Rate limiting
    MIN_DELAY = float(os.getenv('MIN_DELAY', 1.0))
    MAX_DELAY = float(os.getenv('MAX_DELAY', 3.0))

    # Request behavior
    ALLOW_REDIRECTS = True
    MAX_REDIRECTS = int(os.getenv('MAX_REDIRECTS', 5))
    VERIFY_SSL = os.getenv('VERIFY_SSL', 'true').lower() == 'true'

    # Domain validation
    VALIDATE_DOMAIN_MATCH = True  # Log warning nếu redirect sang domain khác
    SKIP_ON_403 = os.getenv('SKIP_ON_403', 'false').lower() == 'true'

    # History settings
    MAX_SAMPLE_URLS = int(os.getenv('MAX_SAMPLE_URLS', 50))
    DEFAULT_HISTORY_LIMIT = int(os.getenv('DEFAULT_HISTORY_LIMIT', 20))
    MAX_HISTORY_LIMIT = int(os.getenv('MAX_HISTORY_LIMIT', 100))

    # Timezone
    TIMEZONE = os.getenv('TIMEZONE', 'Asia/Ho_Chi_Minh')

    # Proxy config
    USE_PROXY = os.getenv('USE_PROXY', 'false').lower() == 'true'
    PROXIES = {
        "http": os.getenv("HTTP_PROXY", ""),
        "https": os.getenv("HTTPS_PROXY", ""),
    } if os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY") else None

    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_REDIRECTS = True
    LOG_REQUEST_DETAILS = True


class DevelopmentConfig(Config):
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    MAX_WORKERS = 5


class ProductionConfig(Config):
    DEBUG = False
    LOG_LEVEL = 'WARNING'


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
