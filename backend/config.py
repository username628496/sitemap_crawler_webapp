import os

class Config:
    # Flask
    DEBUG = False
    HOST = '0.0.0.0'
    PORT = 8000
    
    # Database
    DATABASE_PATH = 'crawl_history.db'
    
    # Crawler settings
    MAX_WORKERS = 10
    REQUEST_TIMEOUT = 10
    MAX_SITEMAP_DEPTH = 10
    
    # User agent
    USER_AGENT = (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    )
    
    # Request headers
    REQUEST_HEADERS = {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    # History settings
    MAX_SAMPLE_URLS = 50
    DEFAULT_HISTORY_LIMIT = 20
    MAX_HISTORY_LIMIT = 100
    
    # Timezone
    TIMEZONE = 'Asia/Ho_Chi_Minh'

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}