from flask import Blueprint, jsonify
from services.history_service import HistoryService

history_bp = Blueprint("history", __name__)
history_service = HistoryService()

@history_bp.route("/history/compare/<string:domain>", methods=["GET"])
def compare_domain(domain):
    """
    Compare the most recent crawls of a domain.
    Returns JSON in schema:
    {
      "domain": "example.com",
      "crawls": [
        {
          "timestamp": "...",
          "total_urls": 123,
          "duration": 1.23,
          "status": "success"
        },
        ...
      ],
      "trends": {
        "url_change": +10,
        "url_change_percent": 12.3,
        "duration_change": -0.5,
        "duration_change_percent": -20.0
      }
    }
    """
    try:
        result = history_service.compare_domain(domain)
        
        # Nếu thiếu crawls thì trả về schema tối thiểu
        if not result or "crawls" not in result:
            return jsonify({
                "domain": domain,
                "crawls": [],
                "trends": {}
            }), 200

        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "error": str(e),
            "domain": domain,
            "crawls": [],
            "trends": {}
        }), 500