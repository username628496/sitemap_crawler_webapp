import csv
from io import StringIO
from typing import Dict, List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import DatabaseManager
from utils.logger import logger

class HistoryService:
    def __init__(self, db_manager: DatabaseManager = None):
        self.db = db_manager or DatabaseManager()
    
    def get_history(self, limit: int = 20, offset: int = 0, 
                   domain_filter: str = None, status_filter: str = None,
                   date_from: str = None, date_to: str = None) -> Dict:
        """Get crawl history with filters"""
        return self.db.get_history(
            limit=limit,
            offset=offset,
            domain_filter=domain_filter,
            status_filter=status_filter,
            date_from=date_from,
            date_to=date_to
        )
    
    def get_statistics(self, days: int = 30) -> Dict:
        """Get crawl statistics"""
        return self.db.get_statistics(days=days)
    
    def compare_domain(self, domain: str, limit: int = 5) -> Dict:
        """Compare recent crawls for a domain"""
        return self.db.compare_crawls(domain=domain, limit=limit)
    
    def export_to_csv(self, days: int = 30) -> str:
        """Export history to CSV format"""
        try:
            history_data = self.db.get_history(limit=1000, offset=0)
            
            output = StringIO()
            writer = csv.writer(output)
            
            # Headers
            writer.writerow([
                "Domain", "Timestamp", "Status", "Total URLs", 
                "Duration (s)", "Sitemaps Found", "Error Message"
            ])
            
            # Data
            for record in history_data["results"]:
                writer.writerow([
                    record["domain"],
                    record["timestamp"],
                    record["status"],
                    record["total_urls"],
                    record["duration_sec"],
                    record["sitemaps_found"],
                    record["error_message"] or ""
                ])
            
            logger.info(f"Exported {len(history_data['results'])} records to CSV")
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Error exporting to CSV: {e}")
            raise