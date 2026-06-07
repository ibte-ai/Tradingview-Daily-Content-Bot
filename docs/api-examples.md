# API Examples

## Authentication

All API requests require authentication via `X-API-Key` header or `Bearer` token.

```bash
# Using X-API-Key header
curl -H "X-API-Key: your-api-secret-key" http://localhost:4000/api/posts

# Using Bearer token
curl -H "Authorization: Bearer your-api-secret-key" http://localhost:4000/api/posts
```

> In development mode, authentication is optional (requests are logged as warnings).

---

## Health Check

```bash
# Basic health
curl http://localhost:4000/api/health

# Response:
{
  "status": "healthy",
  "checks": {
    "api": "ok",
    "redis": "ok",
    "database": "ok",
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}

# Platform connections
curl http://localhost:4000/api/health/platforms
```

---

## Create a Post (Triggers Full Pipeline)

```bash
curl -X POST http://localhost:4000/api/posts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "symbol": "BTCUSD",
    "autoAnalyze": true
  }'

# Response:
{
  "post": {
    "id": "a1b2c3d4-...",
    "symbol": "BTCUSD",
    "status": "draft"
  },
  "message": "Post created. Screenshot capture has been queued."
}
```

## List Posts

```bash
# All posts
curl http://localhost:4000/api/posts

# Filter by status
curl "http://localhost:4000/api/posts?status=pending_review"

# Filter by symbol
curl "http://localhost:4000/api/posts?symbol=BTCUSD&limit=10"
```

## Get Post Detail with Audit Trail

```bash
curl http://localhost:4000/api/posts/a1b2c3d4-...

# Response includes full audit trail
```

## Edit Caption

```bash
curl -X PATCH http://localhost:4000/api/posts/a1b2c3d4-... \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "Updated caption text here",
    "hashtags": ["#trading", "#bitcoin", "#crypto"]
  }'
```

## Approve Post

```bash
curl -X POST http://localhost:4000/api/posts/a1b2c3d4-.../approve
```

## Publish to Platforms

```bash
# Publish to all platforms
curl -X POST http://localhost:4000/api/posts/a1b2c3d4-.../publish \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["facebook", "instagram", "whatsapp"],
    "whatsappRecipient": "+1234567890"
  }'

# Publish to specific platform
curl -X POST http://localhost:4000/api/posts/a1b2c3d4-.../publish \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["facebook"]
  }'
```

## Retry Failed Post

```bash
curl -X POST http://localhost:4000/api/posts/a1b2c3d4-.../retry
```

## Query Audit Logs

```bash
# All logs
curl http://localhost:4000/api/logs

# Filter by action
curl "http://localhost:4000/api/logs?action=published_facebook"

# Filter by status
curl "http://localhost:4000/api/logs?status=failure"
```

## Update Settings

```bash
curl -X PATCH http://localhost:4000/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "ai_model": "gemini",
    "max_hashtags": 10,
    "auto_approve": false
  }'
```

## Manual Screenshot Capture

```bash
curl -X POST http://localhost:4000/api/screenshots/capture \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "ETHUSD"
  }'
```
