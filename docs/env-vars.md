# Environment Variables

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_SECRET_KEY` | API authentication key (min 16 chars) | `my-super-secret-key-123` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

## Optional but Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (`development`, `staging`, `production`) | `development` |
| `PORT` | API server port | `4000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |

## AI Models (at least one required)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `AI_PRIMARY_MODEL` | Primary model: `gemini` or `openai` (default: `gemini`) |

## TradingView

| Variable | Description |
|----------|-------------|
| `TV_SESSION_ID` | TradingView sessionid cookie |
| `TV_SESSION_ID_SIGN` | TradingView sessionid_sign cookie |

## Cloudinary

| Variable | Description |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

## Meta (Facebook + Instagram)

| Variable | Description |
|----------|-------------|
| `META_APP_ID` | Meta App ID |
| `META_APP_SECRET` | Meta App Secret |
| `META_PAGE_ACCESS_TOKEN` | Long-lived Page Access Token |
| `META_PAGE_ID` | Facebook Page ID |
| `META_IG_USER_ID` | Instagram Business Account ID |

## WhatsApp Business

| Variable | Description |
|----------|-------------|
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp access token |
| `WHATSAPP_TEMPLATE_NAME` | Message template name (default: `chart_update`) |

## Supabase (if using managed Supabase)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
