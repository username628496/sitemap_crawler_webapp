from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import sys
import os
import requests as http_requests

# Monkey patch for gevent compatibility (must be first!)
try:
    from gevent import monkey
    monkey.patch_all()
except ImportError:
    pass  # gevent not installed, skip patching

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import config, Config
from utils.logger import logger
from services.crawler_service import CrawlerService
from services.content_crawler_service import ContentCrawlerService

# Initialize Flask app
app = Flask(__name__)

# CORS configuration for production domain
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3001",  # Development
            "https://sm.aeseo1.org",  # Production
            "http://sm.aeseo1.org"    # Production (HTTP redirect)
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Load configuration
app_config = config.get(os.getenv('FLASK_ENV', 'default'))
app.config.from_object(app_config)

# Initialize services
crawler_service = CrawlerService()
content_crawler_service = ContentCrawlerService()

logger.info("✅ Application initialized with Sync Crawler (requests)")
logger.info("Application initialized successfully")

# Routes
@app.route('/')
def index():
    """Basic info endpoint"""
    return jsonify({
        "status": "running",
        "service": "Sitemap Crawler API",
        "version": "3.0"
    })

@app.route('/api/health')
def health_check():
    """Comprehensive health check endpoint"""
    from datetime import datetime

    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": {}
    }

    # Check configuration
    health_status["components"]["config"] = {
        "max_workers": Config.MAX_WORKERS,
        "request_timeout": Config.REQUEST_TIMEOUT
    }

    status_code = 200 if health_status["status"] == "healthy" else 503
    return jsonify(health_status), status_code

@app.route('/api/crawl', methods=['POST'])
def crawl():
    """Synchronous crawl endpoint"""
    try:
        data = request.get_json()
        domains = data.get("domains", [])

        if not domains:
            return jsonify({
                "error": "Không có domain để crawl",
                "message": "Vui lòng nhập ít nhất một domain (ví dụ: example.com)",
                "suggestion": "Mỗi domain một dòng, không cần http:// hoặc https://"
            }), 400

        logger.info(f"Received crawl request for {len(domains)} domains")
        results = crawler_service.process_domains(domains)

        return jsonify(results)

    except Exception as e:
        logger.error(f"Error in /api/crawl: {e}")
        error_msg = str(e)

        # User-friendly error messages
        if "403" in error_msg or "Forbidden" in error_msg:
            return jsonify({
                "error": "Website chặn IP của chúng tôi",
                "message": "Website này không cho phép truy cập từ IP datacenter",
                "suggestion": "Domain này chặn IP datacenter và không thể crawl được"
            }), 403
        elif "timeout" in error_msg.lower():
            return jsonify({
                "error": "Kết nối timeout",
                "message": "Website không phản hồi trong thời gian quy định",
                "suggestion": "Kiểm tra domain có đúng không, hoặc thử lại sau"
            }), 504
        elif "sitemap" in error_msg.lower():
            return jsonify({
                "error": "Không tìm thấy sitemap",
                "message": "Website này không có sitemap.xml hoặc robots.txt",
                "suggestion": "Kiểm tra lại domain, một số website không public sitemap"
            }), 404
        else:
            return jsonify({
                "error": "Lỗi hệ thống",
                "message": "Đã xảy ra lỗi không mong muốn khi crawl",
                "suggestion": "Vui lòng thử lại hoặc liên hệ hỗ trợ",
                "details": error_msg
            }), 500

@app.route('/api/crawl-stream')
def crawl_stream():
    """Streaming crawl endpoint with Server-Sent Events - Real-time results"""
    from queue import Queue
    from threading import Thread

    def stream_sync_results(domains):
        """Stream results from sync crawler with real-time updates"""
        result_queue = Queue()

        def result_callback(result, completed, total):
            """Callback to receive results as they complete"""
            result_queue.put({
                'type': 'result',
                'data': result,
                'progress': {
                    'completed': completed,
                    'total': total,
                    'percentage': round((completed / total) * 100, 1)
                }
            })

        def crawl_worker():
            """Run crawler in background thread"""
            try:
                crawler_service.process_domains(domains, callback=result_callback)
                result_queue.put({'type': 'done'})
            except Exception as e:
                logger.error(f"❌ Crawler error: {e}")
                result_queue.put({'type': 'error', 'message': str(e)})

        # Start crawler in background
        Thread(target=crawl_worker, daemon=True).start()

        # Send initial message
        yield f"data: {json.dumps({'status': 'starting', 'message': 'Khởi động crawler...', 'total': len(domains)})}\n\n"

        # Stream results as they arrive
        while True:
            item = result_queue.get()

            if item['type'] == 'result':
                # Stream individual domain result with progress
                yield f"data: {json.dumps(item['data'])}\n\n"
                logger.info(f"📤 Streamed result for {item['data'].get('domain')} ({item['progress']['completed']}/{item['progress']['total']})")

            elif item['type'] == 'done':
                # All done
                yield f"data: {json.dumps({'status': 'completed', 'message': 'Tất cả domain đã crawl xong'})}\n\n"
                logger.info("✅ Stream completed")
                break

            elif item['type'] == 'error':
                # Error occurred
                yield f"data: {json.dumps({'status': 'error', 'message': item['message']})}\n\n"
                logger.error(f"❌ Stream error: {item['message']}")
                break

    domains_param = request.args.get("domains", "")
    domain_list = [d.strip() for d in domains_param.split(",") if d.strip()]

    if not domain_list:
        return jsonify({
            "error": "Không có domain để crawl",
            "message": "Vui lòng nhập ít nhất một domain",
            "suggestion": "Format: ?domains=example.com,google.com"
        }), 400

    logger.info(f"🚀 Starting real-time SSE stream for {len(domain_list)} domains")

    response = Response(stream_sync_results(domain_list), content_type='text/event-stream')
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['X-Accel-Buffering'] = 'no'
    return response


@app.route('/api/sinbyte/submit', methods=['POST'])
def sinbyte_submit():
    """Proxy endpoint for Sinbyte to avoid CORS"""
    try:
        data = request.get_json()
        apikey = data.get('apikey')
        urls = data.get('urls', [])
        name = data.get('name', 'Sitemap Crawler')
        dripfeed = data.get('dripfeed', 1)

        if not apikey:
            return jsonify({"error": "Missing API key"}), 400

        if not urls:
            return jsonify({"error": "Missing URLs"}), 400

        logger.info(f"Proxying Sinbyte request: {len(urls)} URLs for {name}")

        # Forward to Sinbyte
        response = http_requests.post(
            'https://app.sinbyte.com/api/indexing/',
            json={
                'apikey': apikey,
                'name': name,
                'dripfeed': dripfeed,
                'urls': urls
            },
            timeout=30
        )

        logger.info(f"Sinbyte response: {response.status_code}")

        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        logger.error("Sinbyte request timeout")
        return jsonify({"error": "Request timeout"}), 504

    except http_requests.exceptions.RequestException as e:
        logger.error(f"Error proxying to Sinbyte: {e}")
        return jsonify({"error": f"Sinbyte error: {str(e)}"}), 502

    except Exception as e:
        logger.error(f"Unexpected error in Sinbyte proxy: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/1hping/campaign/create', methods=['POST'])
def onehping_campaign_create():
    """Proxy endpoint for 1hping campaign creation to avoid CORS"""
    try:
        data = request.get_json()
        apikey = data.get('apikey')
        urls = data.get('urls', [])
        campaign_name = data.get('campaign_name', 'Sitemap Crawler')
        number_of_day = data.get('number_of_day', 1)

        if not apikey:
            return jsonify({"success": False, "message": "Missing API key"}), 400
        if not urls:
            return jsonify({"success": False, "message": "Missing URLs"}), 400

        logger.info(f"Proxying 1hping campaign create: {len(urls)} URLs for {campaign_name}")

        response = http_requests.post(
            'https://app.1hping.com/external/api/campaign/create?culture=vi-VN',
            headers={'ApiKey': apikey, 'Content-Type': 'application/json'},
            json={'CampaignName': campaign_name, 'NumberOfDay': number_of_day, 'Urls': urls},
            timeout=30
        )

        logger.info(f"1hping campaign create response: {response.status_code}")
        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Request timeout"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        logger.error(f"Unexpected error in 1hping proxy: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/1hping/balance', methods=['GET'])
def onehping_balance():
    """Proxy endpoint for 1hping balance check"""
    try:
        apikey = request.headers.get('X-ApiKey') or request.args.get('apikey')
        if not apikey:
            return jsonify({"success": False, "message": "Missing API key"}), 400

        response = http_requests.get(
            'https://app.1hping.com/external/api/balance',
            headers={'ApiKey': apikey},
            timeout=15
        )
        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Request timeout"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/1hping/campaign/list', methods=['GET'])
def onehping_campaign_list():
    """Proxy endpoint for 1hping campaign list"""
    try:
        apikey = request.headers.get('X-ApiKey') or request.args.get('apikey')
        page = request.args.get('page', 1)
        page_size = request.args.get('pageSize', 50)
        if not apikey:
            return jsonify({"success": False, "message": "Missing API key"}), 400

        response = http_requests.get(
            f'https://app.1hping.com/external/api/campaign/list?page={page}&pageSize={page_size}',
            headers={'ApiKey': apikey},
            timeout=15
        )
        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Request timeout"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/instantindexer/submit', methods=['POST'])
def instantindexer_submit():
    """Proxy endpoint for InstantIndexer to avoid CORS"""
    try:
        data = request.get_json()
        apikey = data.get('apikey')
        urls = data.get('urls', [])
        project = data.get('project', 'Sitemap Crawler')
        instant = data.get('instant', False)

        if not apikey:
            return jsonify({"success": False, "message": "Missing API key"}), 400
        if not urls:
            return jsonify({"success": False, "message": "Missing URLs"}), 400

        logger.info(f"Proxying InstantIndexer submit: {len(urls)} URLs for {project}")

        response = http_requests.post(
            'https://instantindexer.org/api/submit.php',
            headers={'X-API-Key': apikey, 'Content-Type': 'application/json'},
            json={'project': project, 'urls': urls, 'instant': instant},
            timeout=30
        )

        logger.info(f"InstantIndexer submit response: {response.status_code}")
        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Request timeout"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        logger.error(f"Unexpected error in InstantIndexer proxy: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/instantindexer/balance', methods=['GET'])
def instantindexer_balance():
    """Proxy endpoint for InstantIndexer balance check"""
    try:
        apikey = request.headers.get('X-ApiKey') or request.args.get('apikey')
        if not apikey:
            return jsonify({"success": False, "message": "Missing API key"}), 400

        response = http_requests.get(
            'https://instantindexer.org/api/balance.php',
            headers={'X-API-Key': apikey},
            timeout=15
        )
        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Request timeout"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/linksindexer/submit', methods=['POST'])
def linksindexer_submit():
    """Proxy endpoint for LinksIndexer to avoid CORS"""
    try:
        data = request.get_json()
        apikey = data.get('apikey')
        urls = data.get('urls', [])
        campaign_name = data.get('campaign_name', 'Sitemap Crawler')
        dripfeed = data.get('dripfeed', 0)

        if not apikey:
            return jsonify({"success": False, "message": "Missing API key"}), 400
        if not urls:
            return jsonify({"success": False, "message": "Missing URLs"}), 400

        logger.info(f"Proxying LinksIndexer submit: {len(urls)} URLs for {campaign_name}")

        # LinksIndexer dùng form-urlencoded, URL phân cách bằng pipe
        response = http_requests.post(
            'https://linksindexer.com/api/campaign/create',
            data={
                'api_token': apikey,
                'urls': '|'.join(urls),
                'campaign_name': campaign_name,
                'dripfeed': dripfeed,
            },
            timeout=30
        )

        logger.info(f"LinksIndexer submit response: {response.status_code}")
        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Request timeout"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        logger.error(f"Unexpected error in LinksIndexer proxy: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/linksindexer/credits', methods=['GET'])
def linksindexer_credits():
    """Proxy endpoint for LinksIndexer credits check"""
    try:
        apikey = request.headers.get('X-ApiKey') or request.args.get('apikey')
        if not apikey:
            return jsonify({"success": False, "message": "Missing API key"}), 400

        response = http_requests.post(
            'https://linksindexer.com/api/credits',
            data={'api_token': apikey},
            timeout=15
        )
        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Request timeout"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/speedyindex/submit', methods=['POST'])
def speedyindex_submit():
    """Proxy endpoint for SpeedyIndex to avoid CORS"""
    try:
        data = request.get_json()
        apikey = data.get('apikey')
        urls = data.get('urls', [])

        if not apikey:
            return jsonify({"success": False, "message": "Missing API key"}), 400
        if not urls:
            return jsonify({"success": False, "message": "Missing URLs"}), 400

        logger.info(f"Proxying SpeedyIndex submit: {len(urls)} URLs")

        # Google indexer hiện chỉ chấp nhận pay_per_indexed: true
        response = http_requests.post(
            'https://api.speedyindex.com/v2/task/google/indexer/create',
            headers={'Authorization': apikey, 'Content-Type': 'application/json'},
            json={'urls': urls, 'pay_per_indexed': True},
            timeout=30
        )

        logger.info(f"SpeedyIndex submit response: {response.status_code}")
        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Request timeout"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        logger.error(f"Unexpected error in SpeedyIndex proxy: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/speedyindex/balance', methods=['GET'])
def speedyindex_balance():
    """Proxy endpoint for SpeedyIndex balance check"""
    try:
        apikey = request.headers.get('X-ApiKey') or request.args.get('apikey')
        if not apikey:
            return jsonify({"success": False, "message": "Missing API key"}), 400

        response = http_requests.get(
            'https://api.speedyindex.com/v2/account',
            headers={'Authorization': apikey},
            timeout=15
        )
        return jsonify(response.json()), response.status_code

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "message": "Request timeout"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/gp-content/crawl-stream')
def gp_content_crawl_stream():
    """
    GP Content Crawler with SSE streaming.

    Crawls sitemap first (internal), then crawls each URL for content.
    Returns: URL + Title + Keywords in real-time via SSE.

    Query params:
        domains: Comma-separated list of domains (e.g., ?domains=example.com,google.com)
    """
    from queue import Queue
    from threading import Thread

    def stream_content_results(domains):
        """Stream content crawl results in real-time"""
        result_queue = Queue()

        def url_callback(result, completed, total):
            """Callback for each URL crawled"""
            # Put individual URL result in queue
            result_queue.put({
                'type': 'url_result',
                'data': result,  # {url, title, keywords, status, duration}
                'progress': {
                    'completed': completed,
                    'total': total,
                    'percentage': round((completed / total) * 100, 1) if total > 0 else 0
                }
            })

        def domain_callback(domain_result, completed_domains, total_domains):
            """Callback for each domain completed"""
            result_queue.put({
                'type': 'domain_complete',
                'data': domain_result,
                'progress': {
                    'completed_domains': completed_domains,
                    'total_domains': total_domains
                }
            })

        def crawl_worker():
            """Run content crawler in background thread"""
            try:
                logger.info(f"🚀 [GP Content] Starting crawl for {len(domains)} domains")

                for i, domain in enumerate(domains):
                    domain = domain.strip()
                    if not domain:
                        continue

                    # Send domain start notification
                    result_queue.put({
                        'type': 'domain_start',
                        'domain': domain,
                        'current': i + 1,
                        'total': len(domains)
                    })

                    # Crawl this domain
                    domain_result = content_crawler_service.discover_and_crawl_domain(
                        domain,
                        callback=url_callback
                    )

                    # Send domain completion
                    domain_callback(domain_result, i + 1, len(domains))

                # All done
                result_queue.put({'type': 'done'})

            except Exception as e:
                logger.error(f"❌ [GP Content] Crawler error: {e}")
                result_queue.put({'type': 'error', 'message': str(e)})

        # Start crawler in background
        Thread(target=crawl_worker, daemon=True).start()

        # Send initial message
        yield f"data: {json.dumps({'status': 'starting', 'message': 'Khởi động GP Content Crawler...', 'total_domains': len(domains)})}\n\n"

        # Stream results as they arrive
        while True:
            item = result_queue.get()

            if item['type'] == 'domain_start':
                # Starting a new domain
                yield f"data: {json.dumps({'status': 'domain_start', 'domain': item['domain'], 'current': item['current'], 'total': item['total']})}\n\n"
                logger.info(f"📤 [GP Content] Starting domain {item['domain']} ({item['current']}/{item['total']})")

            elif item['type'] == 'url_result':
                # Individual URL result
                yield f"data: {json.dumps(item['data'])}\n\n"
                url = item['data'].get('original_url') or item['data'].get('url', 'unknown')
                logger.info(f"📤 [GP Content] Streamed URL result: {url} ({item['progress']['completed']}/{item['progress']['total']})")

            elif item['type'] == 'domain_complete':
                # Domain completed
                result = item['data']
                response_data = {
                    'status': 'domain_complete',
                    'domain': result['domain'],
                    'crawled_urls': result['crawled_urls'],
                    'total_urls': result['total_urls'],
                    'original_domain': result.get('original_domain', result['domain']),
                    'target_domain': result.get('target_domain', result['domain']),
                    'has_redirect': result.get('has_redirect', False)
                }
                yield f"data: {json.dumps(response_data)}\n\n"
                logger.info(f"✅ [GP Content] Domain complete: {result['domain']} ({result['crawled_urls']}/{result['total_urls']} URLs)")

            elif item['type'] == 'done':
                # All done
                yield f"data: {json.dumps({'status': 'completed', 'message': 'Tất cả domains đã crawl xong'})}\n\n"
                logger.info("✅ [GP Content] Stream completed")
                break

            elif item['type'] == 'error':
                # Error occurred
                yield f"data: {json.dumps({'status': 'error', 'message': item['message']})}\n\n"
                logger.error(f"❌ [GP Content] Stream error: {item['message']}")
                break

    # Parse domains from query params
    domains_param = request.args.get("domains", "")
    domain_list = [d.strip() for d in domains_param.split(",") if d.strip()]

    if not domain_list:
        return jsonify({
            "error": "Không có domain để crawl",
            "message": "Vui lòng nhập ít nhất một domain",
            "suggestion": "Format: ?domains=example.com,google.com"
        }), 400

    logger.info(f"🚀 [GP Content] Starting SSE stream for {len(domain_list)} domains")

    response = Response(stream_content_results(domain_list), content_type='text/event-stream')
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['X-Accel-Buffering'] = 'no'
    return response

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    logger.info(f"Starting Flask app on {Config.HOST}:{Config.PORT}")
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )