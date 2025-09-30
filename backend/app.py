from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import csv
from io import StringIO
import sys
import os
import requests as http_requests

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import config, Config
from utils.logger import logger
from services.crawler_service import CrawlerService
from services.history_service import HistoryService
from models.database import DatabaseManager

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load configuration
app_config = config.get(os.getenv('FLASK_ENV', 'default'))
app.config.from_object(app_config)

# Initialize services
db_manager = DatabaseManager()
crawler_service = CrawlerService(db_manager)
history_service = HistoryService(db_manager)

logger.info("Application initialized successfully")

# Routes
@app.route('/')
def index():
    """Health check endpoint"""
    return jsonify({
        "status": "running",
        "service": "Sitemap Crawler API",
        "version": "3.0"
    })

@app.route('/api/crawl', methods=['POST'])
def crawl():
    """Synchronous crawl endpoint"""
    try:
        data = request.get_json()
        domains = data.get("domains", [])
        
        if not domains:
            return jsonify({"error": "Thiếu domain"}), 400
        
        logger.info(f"Received crawl request for {len(domains)} domains")
        results = crawler_service.process_domains(domains)
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in /api/crawl: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/crawl-stream')
def crawl_stream():
    """Streaming crawl endpoint with Server-Sent Events"""
    def stream(domains):
        try:
            from concurrent.futures import ThreadPoolExecutor, as_completed
            
            with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as executor:
                futures = {executor.submit(crawler_service.process_domain, d): d for d in domains}
                
                for future in as_completed(futures):
                    domain = futures[future]
                    try:
                        result = future.result()
                        yield f"data: {json.dumps(result)}\n\n"
                    except Exception as e:
                        logger.error(f"Error processing domain {domain}: {e}")
                        yield f"data: {json.dumps({'domain': domain, 'status': 'failed', 'error': str(e)})}\n\n"
                        
        except Exception as e:
            logger.error(f"Error in stream generator: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    domains_param = request.args.get("domains", "")
    domain_list = [d.strip() for d in domains_param.split(",") if d.strip()]
    
    if not domain_list:
        return jsonify({"error": "Thiếu domain"}), 400
    
    logger.info(f"Starting stream crawl for {len(domain_list)} domains")
    return Response(stream(domain_list), content_type='text/event-stream')

@app.route('/api/history')
def get_history():
    """Get crawl history with filters"""
    try:
        limit = min(int(request.args.get("limit", Config.DEFAULT_HISTORY_LIMIT)), Config.MAX_HISTORY_LIMIT)
        offset = max(int(request.args.get("offset", 0)), 0)
        domain_filter = request.args.get("domain")
        status_filter = request.args.get("status")
        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")
        
        result = history_service.get_history(
            limit=limit,
            offset=offset,
            domain_filter=domain_filter,
            status_filter=status_filter,
            date_from=date_from,
            date_to=date_to
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in /api/history: {e}")
        return jsonify({"error": f"Lỗi đọc lịch sử: {str(e)}"}), 500

@app.route('/api/history/statistics')
def get_statistics():
    """Get crawl statistics"""
    try:
        days = min(int(request.args.get("days", 30)), 365)
        stats = history_service.get_statistics(days=days)
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"Error in /api/history/statistics: {e}")
        return jsonify({"error": f"Lỗi tạo thống kê: {str(e)}"}), 500

@app.route('/api/history/compare/<domain>')
def compare_domain(domain):
    """Compare recent crawls for a domain"""
    try:
        limit = min(int(request.args.get("limit", 5)), 20)
        comparison = history_service.compare_domain(domain, limit)
        return jsonify(comparison)
        
    except Exception as e:
        logger.error(f"Error in /api/history/compare: {e}")
        return jsonify({"error": f"Lỗi so sánh: {str(e)}"}), 500

@app.route('/api/history/export')
def export_history():
    """Export crawl history to CSV"""
    try:
        export_format = request.args.get("format", "csv")
        days = min(int(request.args.get("days", 30)), 365)
        
        if export_format == "json":
            history_data = history_service.get_history(limit=1000, offset=0)
            return jsonify(history_data)
        
        # CSV export
        csv_data = history_service.export_to_csv(days=days)
        
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=crawl_history.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error in /api/history/export: {e}")
        return jsonify({"error": f"Lỗi export: {str(e)}"}), 500

@app.route('/api/export', methods=['POST'])
def export_urls():
    """Export URLs to CSV"""
    try:
        data = request.get_json()
        urls = data.get("urls", [])
        export_type = data.get("type", "csv")
        
        if export_type == "txt":
            return Response(
                "\n".join(urls),
                mimetype="text/plain",
                headers={"Content-Disposition": "attachment; filename=urls.txt"}
            )
        
        # CSV export
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["URL"])
        for url in urls:
            writer.writerow([url])
        
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=urls.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error in /api/export: {e}")
        return jsonify({"error": str(e)}), 500

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