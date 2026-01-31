# 🔍 Sitemap Crawler Improvement Checklist

## ⚠️ CRITICAL - Phải sửa ngay

_No critical issues at this time._

## 🔴 HIGH Priority - Sửa trong tuần này

- [ ] **Security: Add input validation to API endpoints**
  - Files: `backend/app.py` - all POST endpoints
  - Issue: Không validate domain format, không giới hạn số lượng
  - Action:
    - Add marshmallow/pydantic schemas
    - Limit max domains per request (100-500)
    - Validate domain format with regex
  ```python
  from marshmallow import Schema, fields, validate

  class CrawlRequestSchema(Schema):
      domains = fields.List(
          fields.Str(validate=validate.Regexp(r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')),
          validate=validate.Length(min=1, max=100)
      )
  ```

- [ ] **Security: Re-enable SSL verification in production**
  - File: `backend/services/sitemap_parser.py` line 249
  - Issue: `verify=False` khiến dễ bị MITM attack
  - Action: Chỉ disable trong dev
  ```python
  verify=not Config.DEBUG,  # Enable SSL verify in production
  ```

- [ ] **Testing: Add unit tests**
  - Issue: Zero test coverage
  - Action:
    - Create `backend/tests/` folder
    - Add pytest + fixtures
    - Target: 70%+ coverage
  ```bash
  mkdir backend/tests
  pip install pytest pytest-cov
  pytest --cov=backend tests/
  ```

- [ ] **Database: Implement backup strategy**
  - File: `backend/models/database.py`
  - Issue: SQLite không có backup tự động
  - Action:
    - Daily automated backup script
    - Backup rotation (keep last 7 days)
    - Test restore process

## 🟡 MEDIUM Priority - Sửa trong tháng này

- [ ] **Security: Add rate limiting**
  - File: `backend/app.py`
  - Action: Install Flask-Limiter
  ```python
  from flask_limiter import Limiter

  limiter = Limiter(app, key_func=get_remote_address)

  @app.route('/api/crawl', methods=['POST'])
  @limiter.limit("10 per hour")
  def crawl():
      pass
  ```

- [ ] **Security: Add request size limits**
  - File: `backend/app.py`
  - Action:
  ```python
  app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB
  ```

- [ ] **Security: Add CSRF protection**
  - Action: Install Flask-WTF
  ```python
  from flask_wtf.csrf import CSRFProtect
  csrf = CSRFProtect(app)
  ```

- [ ] **Performance: Optimize database queries**
  - File: `backend/models/database.py` lines 349-380
  - Issue: N+1 query problem
  - Action: Use JOINs instead of separate queries
  ```python
  # Instead of 4 separate queries, use 1 JOIN
  query = """
  SELECT s.*, sr.*, su.url
  FROM crawl_sessions s
  LEFT JOIN sitemap_results sr ON s.id = sr.session_id
  LEFT JOIN sample_urls su ON s.id = su.session_id
  WHERE ...
  """
  ```

- [ ] **Error Handling: Add Error Boundary to frontend**
  - Files: `frontend/src/App.jsx`
  - Action: Create ErrorBoundary component
  ```jsx
  class ErrorBoundary extends React.Component {
    state = { hasError: false }

    static getDerivedStateFromError(error) {
      return { hasError: true }
    }

    componentDidCatch(error, info) {
      console.error('Error caught:', error, info)
    }

    render() {
      if (this.state.hasError) {
        return <ErrorFallback />
      }
      return this.props.children
    }
  }
  ```

- [ ] **Deployment: Add logging rotation**
  - File: `backend/utils/logger.py`
  - Issue: Logs grow indefinitely
  - Action: Use RotatingFileHandler
  ```python
  from logging.handlers import RotatingFileHandler

  handler = RotatingFileHandler(
      log_filename,
      maxBytes=10*1024*1024,  # 10MB
      backupCount=5
  )
  ```

- [ ] **Deployment: Add health check endpoint**
  - File: `backend/app.py`
  - Action:
  ```python
  @app.route('/api/health')
  def health():
      try:
          # Check DB connection
          db_manager.get_statistics(days=1)
          return jsonify({
              'status': 'healthy',
              'database': 'ok',
              'timestamp': datetime.now().isoformat()
          })
      except Exception as e:
          return jsonify({
              'status': 'unhealthy',
              'error': str(e)
          }), 503
  ```

- [ ] **Code Quality: Fix bare exception handlers**
  - Files: Multiple files with `except:` or bare `Exception`
  - Action: Use specific exception types
  ```python
  # ❌ BAD
  try:
      # code
  except:
      pass

  # ✅ GOOD
  try:
      # code
  except ValueError as e:
      logger.error(f"Value error: {e}")
  except KeyError as e:
      logger.error(f"Key error: {e}")
  ```

- [ ] **Technical Debt: Remove or use async crawler**
  - File: `backend/services/async_sitemap_crawler.py`
  - Issue: 567 lines unused code
  - Action: Either integrate it or delete it

## 🟢 LOW Priority - Nice to have

- [ ] **Documentation: Add API documentation**
  - Action: Add Swagger/OpenAPI specs
  ```python
  from flask_restx import Api

  api = Api(app, version='1.0', title='Sitemap Crawler API')
  ```

- [ ] **Code Quality: Add type hints**
  - Files: All Python files
  - Action: Add type annotations
  ```python
  def discover_sitemaps(self, domain: str) -> Tuple[List[str], str]:
      pass
  ```

- [ ] **Frontend: Add loading skeletons**
  - Files: `frontend/src/components/HistoryTable.jsx`
  - Action: Show skeleton while loading
  ```jsx
  {isLoading ? (
    <SkeletonLoader count={5} />
  ) : (
    <HistoryTable data={data} />
  )}
  ```

- [ ] **UX: Improve error messages**
  - Files: Backend error responses
  - Action: User-friendly messages
  ```python
  # ❌ BAD
  return jsonify({"error": str(e)}), 500

  # ✅ GOOD
  return jsonify({
      "error": "Unable to crawl domain",
      "message": "The website may be down or blocking our crawler",
      "suggestion": "Please try again later or check the domain name"
  }), 500
  ```

- [ ] **Feature: Add request deduplication**
  - Issue: Same domain crawled multiple times creates duplicates
  - Action: Check recent history before crawling

- [ ] **Config: Use dataclass for Config**
  - File: `backend/config.py`
  - Action: Refactor to use @dataclass
  ```python
  from dataclasses import dataclass

  @dataclass
  class Config:
      DEBUG: bool = False
      MAX_WORKERS: int = 20
      # ...
  ```

---

## 📊 Priority Summary

| Priority | Count | Target Timeline |
|----------|-------|-----------------|
| 🔴 CRITICAL | 1 | Today |
| 🔴 HIGH | 4 | This week |
| 🟡 MEDIUM | 9 | This month |
| 🟢 LOW | 7 | When possible |
| **Total** | **21** | - |

---

## 🎯 Quick Wins (Do First)

1. ✅ Remove hardcoded credentials (5 min)
2. ✅ Add SSL verification in production (2 min)
3. ✅ Add request size limit (1 line)
4. ✅ Add health check endpoint (10 min)
5. ✅ Delete unused async crawler (1 min)

---

## 🧪 Testing Checklist

- [ ] Unit tests for database operations
- [ ] Unit tests for crawler service
- [ ] Unit tests for API endpoints
- [ ] Integration tests for end-to-end crawl
- [ ] Frontend component tests
- [ ] Frontend hook tests
- [ ] Performance tests (load testing)
- [ ] Security tests (input validation, SQL injection)

---

## 📚 Documentation Checklist

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Environment variables documentation (complete .env.example)
- [ ] Database schema documentation
- [ ] Deployment guide updates
- [ ] Troubleshooting guide
- [ ] Contributing guidelines
- [ ] Code comments for complex logic

---

## 🔐 Security Audit Checklist

- [x] ~~Hardcoded secrets~~ → Remove defaults
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React already handles)
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] SSL/TLS enforcement
- [ ] Security headers (CSP, HSTS, etc.)
- [ ] Audit logging
- [ ] Regular dependency updates

---

## 🚀 Performance Optimization Checklist

- [x] ~~Concurrent crawling with ThreadPool~~ → Already done
- [x] ~~Request delays optimized~~ → Already done (0.2-0.5s)
- [ ] Database query optimization (JOINs, indexes)
- [ ] Request caching/deduplication
- [ ] Frontend code splitting
- [ ] Lazy loading for heavy components
- [ ] Image optimization (if added)
- [ ] Bundle size optimization

---

## 🌐 Deployment Checklist

- [ ] Environment variables properly set
- [ ] Database backups configured
- [ ] Logging rotation enabled
- [ ] Health check endpoint working
- [ ] Monitoring/alerting setup
- [ ] SSL certificates configured
- [ ] Reverse proxy (nginx) configured for routing
- [ ] Firewall rules set
- [ ] Auto-restart on crash (systemd/supervisor)
- [ ] Resource limits set (memory, CPU)

---

## 💡 Next Steps

### Week 1: Critical Fixes
```bash
# Day 1: Security
1. Remove hardcoded credentials
2. Add input validation
3. Enable SSL verification

# Day 2-3: Testing
4. Setup pytest framework
5. Write critical path tests
6. Add CI/CD for tests

# Day 4-5: Database
7. Implement backup script
8. Test restore process
9. Add cron job for automated backups
```

### Week 2-4: Medium Priority
- Rate limiting
- Error boundaries
- Query optimization
- Logging rotation
- Health checks

### Month 2+: Low Priority & Features
- API documentation
- Type hints
- Loading skeletons
- New features

---

## 🎉 What's Already Great

✅ SSE real-time streaming working perfectly
✅ Concurrent crawling with ThreadPoolExecutor
✅ Redirect chain tracking
✅ Clean architecture (separation of concerns)
✅ Modern React with hooks
✅ Database schema well-designed
✅ Deployment guide comprehensive
✅ Performance optimized (3x faster!)

---

## 📞 Need Help?

- Security questions → Check OWASP Top 10
- Testing → pytest documentation
- Performance → Python profiling (cProfile)
- Deployment → DigitalOcean deployment guides
