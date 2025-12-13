import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
import pytz
import json
from typing import Dict, List, Optional, Tuple
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.logger import logger
from config import Config

class DatabaseManager:
    def __init__(self, db_path=None):
        self.db_path = db_path or Config.DATABASE_PATH
        self.init_database()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    def init_database(self):
        """Initialize database tables"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Main crawl sessions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS crawl_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domain TEXT NOT NULL,
                    original_domain TEXT,
                    timestamp DATETIME NOT NULL,
                    status TEXT NOT NULL,
                    total_urls INTEGER DEFAULT 0,
                    duration_sec REAL DEFAULT 0,
                    sitemaps_found INTEGER DEFAULT 0,
                    error_message TEXT,
                    user_agent TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Add original_domain column if it doesn't exist (migration)
            try:
                cursor.execute('ALTER TABLE crawl_sessions ADD COLUMN original_domain TEXT')
            except:
                pass  # Column already exists
            
            # Detailed sitemap results table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sitemap_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    sitemap_url TEXT NOT NULL,
                    urls_found INTEGER DEFAULT 0,
                    processing_time REAL DEFAULT 0,
                    status TEXT DEFAULT 'success',
                    error_message TEXT,
                    FOREIGN KEY (session_id) REFERENCES crawl_sessions (id)
                )
            ''')
            
            # Sample URLs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sample_urls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    url TEXT NOT NULL,
                    url_type TEXT DEFAULT 'page',
                    FOREIGN KEY (session_id) REFERENCES crawl_sessions (id)
                )
            ''')
            
            # Performance metrics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    metric_unit TEXT DEFAULT '',
                    FOREIGN KEY (session_id) REFERENCES crawl_sessions (id)
                )
            ''')

            # SpeedyIndex tasks table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS speedyindex_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT UNIQUE,
                    task_name TEXT NOT NULL,
                    domain TEXT,
                    task_type TEXT DEFAULT 'indexer',
                    search_engine TEXT DEFAULT 'google',
                    total_urls INTEGER DEFAULT 0,
                    submitted_urls INTEGER DEFAULT 0,
                    processed_count INTEGER DEFAULT 0,
                    indexed_count INTEGER DEFAULT 0,
                    credits_used INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'pending',
                    is_completed BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    completed_at DATETIME
                )
            ''')

            # SpeedyIndex task URLs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS speedyindex_urls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT NOT NULL,
                    url TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    is_indexed BOOLEAN DEFAULT 0,
                    error_message TEXT,
                    checked_at DATETIME,
                    FOREIGN KEY (task_id) REFERENCES speedyindex_tasks (task_id)
                )
            ''')

            # Redirect chains table (NEW)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS redirect_chains (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    initial_url TEXT NOT NULL,
                    final_url TEXT NOT NULL,
                    total_redirects INTEGER DEFAULT 0,
                    total_duration REAL DEFAULT 0,
                    has_loop BOOLEAN DEFAULT 0,
                    loop_at INTEGER,
                    redirect_hops TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES crawl_sessions (id)
                )
            ''')

            # Create indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_domain ON crawl_sessions(domain)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON crawl_sessions(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_status ON crawl_sessions(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_redirect_session ON redirect_chains(session_id)')

            logger.info("Database initialized successfully")
    
    def save_crawl_session(self, domain: str, status: str,
                          total_urls: int = 0, duration: float = 0,
                          sitemaps_data: List[Dict] = None,
                          error_message: str = None,
                          sample_urls: List[str] = None,
                          redirect_chains: List = None,
                          original_domain: str = None,
                          timestamp_override: str = None) -> Optional[int]:
        """Save crawl session to database"""

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                tz = pytz.timezone(Config.TIMEZONE)
                if timestamp_override:
                    timestamp = timestamp_override
                else:
                    timestamp = datetime.now(tz).strftime('%Y-%m-%d %H:%M:%S')

                # Insert main session
                cursor.execute('''
                    INSERT INTO crawl_sessions
                    (domain, original_domain, timestamp, status, total_urls, duration_sec,
                     sitemaps_found, error_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    domain, original_domain, timestamp, status, total_urls, duration,
                    len(sitemaps_data) if sitemaps_data else 0, error_message
                ))
                
                session_id = cursor.lastrowid
                
                # Insert sitemap details
                if sitemaps_data:
                    for sitemap in sitemaps_data:
                        cursor.execute('''
                            INSERT INTO sitemap_results 
                            (session_id, sitemap_url, urls_found, processing_time, status, error_message)
                            VALUES (?, ?, ?, ?, ?, ?)
                        ''', (
                            session_id,
                            sitemap.get('sitemap', ''),
                            sitemap.get('count', 0),
                            sitemap.get('duration', 0),
                            'success' if 'error' not in sitemap else 'failed',
                            sitemap.get('error', None)
                        ))
                
                # Store sample URLs
                if sample_urls:
                    sample_urls_limited = sample_urls[:Config.MAX_SAMPLE_URLS]
                    for url in sample_urls_limited:
                        url_type = self._detect_url_type(url)
                        cursor.execute('''
                            INSERT INTO sample_urls (session_id, url, url_type)
                            VALUES (?, ?, ?)
                        ''', (session_id, url, url_type))
                
                # Store performance metrics
                if duration > 0 and total_urls > 0:
                    urls_per_second = total_urls / duration
                    cursor.execute('''
                        INSERT INTO performance_metrics
                        (session_id, metric_name, metric_value, metric_unit)
                        VALUES (?, ?, ?, ?)
                    ''', (session_id, 'urls_per_second', urls_per_second, 'urls/sec'))

                # Store redirect chains (NEW)
                if redirect_chains:
                    for chain in redirect_chains:
                        # Convert hops to JSON string
                        hops_json = json.dumps([
                            {
                                'url': hop.url,
                                'status_code': hop.status_code,
                                'location': hop.location,
                                'duration': hop.duration
                            }
                            for hop in chain.hops
                        ])

                        cursor.execute('''
                            INSERT INTO redirect_chains
                            (session_id, initial_url, final_url, total_redirects,
                             total_duration, has_loop, loop_at, redirect_hops)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            session_id,
                            chain.initial_url,
                            chain.final_url,
                            chain.total_redirects,
                            chain.total_duration,
                            1 if chain.has_loop else 0,
                            chain.loop_at,
                            hops_json
                        ))

                    logger.info(f"Saved {len(redirect_chains)} redirect chains for session {session_id}")

                logger.info(f"Saved crawl session {session_id} for domain {domain}")
                return session_id
                
        except Exception as e:
            logger.error(f"Error saving crawl session: {e}")
            return None
    
    def _detect_url_type(self, url: str) -> str:
        """Detect URL type for categorization"""
        url_lower = url.lower()
        
        if any(ext in url_lower for ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx']):
            return 'document'
        elif any(ext in url_lower for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
            return 'image'  
        elif any(ext in url_lower for ext in ['.mp4', '.avi', '.mov', '.wmv']):
            return 'video'
        elif '/blog/' in url_lower or '/news/' in url_lower or '/article/' in url_lower:
            return 'blog'
        elif '/product/' in url_lower or '/shop/' in url_lower or '/store/' in url_lower:
            return 'product'
        else:
            return 'page'
    
    def get_history(self, limit: int = 20, offset: int = 0, 
                   domain_filter: str = None, status_filter: str = None,
                   date_from: str = None, date_to: str = None) -> Dict:
        """Get crawl history with filtering"""
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                where_conditions = []
                params = []
                
                if domain_filter:
                    where_conditions.append("domain LIKE ?")
                    params.append(f"%{domain_filter}%")
                
                if status_filter:
                    where_conditions.append("status = ?")
                    params.append(status_filter)
                
                if date_from:
                    where_conditions.append("DATE(timestamp) >= ?")
                    params.append(date_from)
                
                if date_to:
                    where_conditions.append("DATE(timestamp) <= ?")
                    params.append(date_to)
                
                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
                
                # Get total count
                count_query = f"SELECT COUNT(*) FROM crawl_sessions {where_clause}"
                cursor.execute(count_query, params)
                total_count = cursor.fetchone()[0]
                
                # Get paginated results
                main_query = f'''
                    SELECT id, domain, timestamp, status, total_urls, duration_sec, 
                           sitemaps_found, error_message
                    FROM crawl_sessions 
                    {where_clause}
                    ORDER BY timestamp DESC 
                    LIMIT ? OFFSET ?
                '''
                
                cursor.execute(main_query, params + [limit, offset])
                sessions = cursor.fetchall()

                # Early return if no sessions
                if not sessions:
                    return {
                        "results": [],
                        "total": total_count,
                        "limit": limit,
                        "offset": offset,
                        "filters_applied": {
                            "domain": domain_filter,
                            "status": status_filter,
                            "date_from": date_from,
                            "date_to": date_to
                        }
                    }

                # Get all session IDs for batch queries
                session_ids = [dict(s)['id'] for s in sessions]
                session_ids_str = ','.join('?' * len(session_ids))

                # Batch fetch sitemaps for all sessions
                cursor.execute(f'''
                    SELECT session_id, sitemap_url, urls_found, processing_time, status, error_message
                    FROM sitemap_results
                    WHERE session_id IN ({session_ids_str})
                ''', session_ids)
                all_sitemaps = cursor.fetchall()

                # Batch fetch sample URLs for all sessions
                cursor.execute(f'''
                    SELECT session_id, url, url_type
                    FROM (
                        SELECT session_id, url, url_type,
                               ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY id) as rn
                        FROM sample_urls
                        WHERE session_id IN ({session_ids_str})
                    ) WHERE rn <= 10
                ''', session_ids)
                all_sample_urls = cursor.fetchall()

                # Batch fetch redirect chains for all sessions
                cursor.execute(f'''
                    SELECT session_id, initial_url, final_url, total_redirects, total_duration,
                           has_loop, loop_at, redirect_hops
                    FROM redirect_chains
                    WHERE session_id IN ({session_ids_str})
                ''', session_ids)
                all_redirect_chains = cursor.fetchall()

                # Group data by session_id
                sitemaps_by_session = {}
                for sm in all_sitemaps:
                    sid = sm['session_id']
                    if sid not in sitemaps_by_session:
                        sitemaps_by_session[sid] = []
                    sitemaps_by_session[sid].append(sm)

                urls_by_session = {}
                for url in all_sample_urls:
                    sid = url['session_id']
                    if sid not in urls_by_session:
                        urls_by_session[sid] = []
                    urls_by_session[sid].append(url)

                chains_by_session = {}
                for rc in all_redirect_chains:
                    sid = rc['session_id']
                    if sid not in chains_by_session:
                        chains_by_session[sid] = []
                    chains_by_session[sid].append(rc)

                # Build results
                results = []
                for session in sessions:
                    session_dict = dict(session)
                    session_id = session_dict['id']

                    # Get sitemaps for this session
                    sitemaps = sitemaps_by_session.get(session_id, [])
                    session_dict['sitemaps'] = [
                        {
                            "url": sm['sitemap_url'],
                            "urls_found": sm['urls_found'],
                            "processing_time": sm['processing_time'],
                            "status": sm['status'],
                            "error": sm['error_message']
                        } for sm in sitemaps
                    ]

                    # Get sample URLs for this session
                    sample_urls = urls_by_session.get(session_id, [])
                    session_dict['sample_urls'] = [
                        {"url": url['url'], "type": url['url_type']} for url in sample_urls
                    ]

                    # Get redirect chains for this session
                    redirect_chains = chains_by_session.get(session_id, [])
                    if redirect_chains:
                        session_dict['redirect_chains'] = [
                            {
                                "initial_url": rc['initial_url'],
                                "final_url": rc['final_url'],
                                "total_redirects": rc['total_redirects'],
                                "total_duration": rc['total_duration'],
                                "has_loop": bool(rc['has_loop']),
                                "loop_at": rc['loop_at'],
                                "hops": json.loads(rc['redirect_hops']) if rc['redirect_hops'] else []
                            }
                            for rc in redirect_chains
                        ]
                        session_dict['redirect_summary'] = {
                            "total_chains": len(redirect_chains),
                            "total_hops": sum(rc['total_redirects'] for rc in redirect_chains),
                        }

                    results.append(session_dict)
                
                return {
                    "results": results,
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "filters_applied": {
                        "domain": domain_filter,
                        "status": status_filter,
                        "date_from": date_from,
                        "date_to": date_to
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting history: {e}")
            return {"results": [], "total": 0, "limit": limit, "offset": offset}
    
    def get_statistics(self, days: int = 30) -> Dict:
        """Get comprehensive statistics"""
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                date_limit = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
                
                stats = {}
                
                # Basic counts
                cursor.execute('''
                    SELECT 
                        COUNT(*) as total_crawls,
                        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_crawls,
                        SUM(total_urls) as total_urls_found,
                        AVG(duration_sec) as avg_duration,
                        AVG(total_urls) as avg_urls_per_crawl
                    FROM crawl_sessions 
                    WHERE DATE(timestamp) >= ?
                ''', (date_limit,))
                
                basic_stats = cursor.fetchone()
                stats['basic'] = {
                    "total_crawls": basic_stats['total_crawls'] or 0,
                    "successful_crawls": basic_stats['successful_crawls'] or 0,
                    "success_rate": round((basic_stats['successful_crawls'] / basic_stats['total_crawls'] * 100) if basic_stats['total_crawls'] and basic_stats['total_crawls'] > 0 else 0, 1),
                    "total_urls_found": basic_stats['total_urls_found'] or 0,
                    "avg_duration": round(basic_stats['avg_duration'] or 0, 2),
                    "avg_urls_per_crawl": round(basic_stats['avg_urls_per_crawl'] or 0, 1)
                }
                
                # Top domains
                cursor.execute('''
                    SELECT domain, COUNT(*) as crawl_count, SUM(total_urls) as total_urls
                    FROM crawl_sessions 
                    WHERE DATE(timestamp) >= ?
                    GROUP BY domain 
                    ORDER BY crawl_count DESC 
                    LIMIT 10
                ''', (date_limit,))
                
                stats['top_domains'] = [
                    {"domain": row['domain'], "crawl_count": row['crawl_count'], "total_urls": row['total_urls'] or 0}
                    for row in cursor.fetchall()
                ]
                
                # Daily activity
                cursor.execute('''
                    SELECT DATE(timestamp) as date, 
                           COUNT(*) as crawls,
                           SUM(total_urls) as urls_found
                    FROM crawl_sessions 
                    WHERE DATE(timestamp) >= ?
                    GROUP BY DATE(timestamp)
                    ORDER BY date DESC
                    LIMIT 30
                ''', (date_limit,))
                
                stats['daily_activity'] = [
                    {"date": row['date'], "crawls": row['crawls'], "urls_found": row['urls_found'] or 0}
                    for row in cursor.fetchall()
                ]
                
                # Error analysis
                cursor.execute('''
                    SELECT error_message, COUNT(*) as count
                    FROM crawl_sessions 
                    WHERE status = 'failed' AND DATE(timestamp) >= ? AND error_message IS NOT NULL
                    GROUP BY error_message
                    ORDER BY count DESC
                    LIMIT 10
                ''', (date_limit,))
                
                stats['common_errors'] = [
                    {"error": row['error_message'], "count": row['count']}
                    for row in cursor.fetchall()
                ]
                
                return stats
                
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    def compare_crawls(self, domain: str, limit: int = 5) -> Dict:
        """Compare recent crawls for a domain"""
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT timestamp, total_urls, duration_sec, status
                    FROM crawl_sessions 
                    WHERE domain = ? 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                ''', (domain, limit))
                
                crawls = cursor.fetchall()
                
                if len(crawls) < 2:
                    return {"message": "Cần ít nhất 2 lần crawl để so sánh"}
                
                comparison = {
                    "domain": domain,
                    "crawls": [],
                    "trends": {}
                }
                
                for crawl in crawls:
                    comparison["crawls"].append({
                        "timestamp": crawl['timestamp'],
                        "total_urls": crawl['total_urls'] or 0,
                        "duration": crawl['duration_sec'] or 0,
                        "status": crawl['status']
                    })
                
                # Calculate trends
                if len(crawls) >= 2:
                    latest = crawls[0]
                    previous = crawls[1]
                    
                    url_change = (latest['total_urls'] or 0) - (previous['total_urls'] or 0)
                    duration_change = (latest['duration_sec'] or 0) - (previous['duration_sec'] or 0)
                    
                    comparison["trends"] = {
                        "url_change": url_change,
                        "url_change_percent": round((url_change / previous['total_urls'] * 100) if previous['total_urls'] and previous['total_urls'] > 0 else 0, 1),
                        "duration_change": round(duration_change, 2),
                        "duration_change_percent": round((duration_change / previous['duration_sec'] * 100) if previous['duration_sec'] and previous['duration_sec'] > 0 else 0, 1)
                    }
                
                return comparison
                
        except Exception as e:
            logger.error(f"Error comparing crawls: {e}")
            return {"error": str(e)}