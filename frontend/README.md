<div align="center">

<img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
<img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white"/>
<img src="https://img.shields.io/badge/Gemini-2.0%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white"/>
<img src="https://img.shields.io/badge/Playwright-Browser%20Automation-2EAD33?style=for-the-badge&logo=playwright&logoColor=white"/>
<img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white"/>
<img src="https://img.shields.io/badge/Redis-BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white"/>
<img src="https://img.shields.io/badge/Docker-Containerised-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
<img src="https://img.shields.io/badge/Meta%20Graph%20API-v21.0-0082FB?style=for-the-badge&logo=meta&logoColor=white"/>

<br/><br/>

# 📈 TradingView AI Social Media Automation
### *Capture · Analyse · Generate · Publish · Track*

**A production-ready, fully automated pipeline that captures TradingView chart screenshots, sends them to a vision AI for market analysis, generates platform-optimised social media posts, and publishes to Facebook, Instagram, and WhatsApp — with a full review and approval dashboard, audit trail, job queue, and Docker-based deployment.**

</div>

---

## ⚠️ Critical Notices — Read Before Setup

> These are architectural constraints that directly affect your configuration and expectations. Read every notice carefully before proceeding.

### 🔴 WhatsApp Channels — NOT Supported via Official API

WhatsApp Channels have **no official programmatic publishing endpoint** in the Meta API. The system uses the **WhatsApp Business Cloud API** to send template-based messages (image + caption) to opted-in contacts or groups. This is the only safe, officially supported alternative. The dashboard clearly labels this limitation. A manual approval fallback with a shareable `wa.me` deep link is also generated for cases where template messaging is insufficient.

### 🟡 TradingView Anti-Bot Measures — Cookie Injection Required

TradingView uses active anti-bot detection that makes automated login unreliable. This system uses **cookie-based session injection** (`sessionid` + `sessionid_sign`) rather than automated credential login. These cookies are valid for approximately 30 days. The Settings page in the dashboard provides a UI to update cookies without redeployment. The admin must manually re-export cookies from a logged-in browser session when they expire.

### 🟡 Meta App Review Required for Production

Publishing to Facebook Pages and Instagram Business accounts requires a Meta App with approved permissions:
- `pages_manage_posts`
- `pages_read_engagement`
- `instagram_business_content_publish`

For **development and staging**, a Meta Developer test app with up to 25 test users can be used without review. For **production** with real pages and real audiences, Meta App Review is mandatory. The setup guide covers both paths.

### 🟢 AI Model Configuration

The system uses **Google Gemini 2.0 Flash** as the primary vision AI (fast, cost-effective, free tier available). **OpenAI GPT-4o** is pre-configured as the automatic fallback. You must have at least one API key available. Both keys can be set in `.env` — the system falls back gracefully.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Database Initialisation](#-database-initialisation)
- [Running the Application](#-running-the-application)
- [Module Documentation](#-module-documentation)
- [API Reference](#-api-reference)
- [Frontend Dashboard](#-frontend-dashboard)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Rollback Plan](#-rollback-plan)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🔍 Overview

This system automates the complete pipeline from raw TradingView charts to published social media content:

```
TradingView Chart
      ↓
Playwright Screenshot Capture (cookie-based session)
      ↓
Cloudinary Upload (optimised public URL)
      ↓
Gemini 2.0 Flash Vision Analysis (structured JSON output)
      ↓
Platform-Specific Caption Generation
      ↓
Review & Approval Dashboard (Next.js)
      ↓  ↓  ↓
Facebook  Instagram  WhatsApp
(Graph API)  (Container publish)  (Business Cloud API)
      ↓
Audit Log + Status Tracking (PostgreSQL)
```

Every step is persisted to the database, every failure is retried with exponential backoff, and every action has an audit trail visible in the dashboard. The system is designed for **daily unattended operation** with a lightweight manual review step before publishing.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Frontend — Next.js 14 (App Router)                │
│  Dashboard · Post Queue · Post Editor · Logs · Settings · Capture   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST API (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Backend — Node.js + Express                       │
│  Auth Middleware · Rate Limiter · Error Handler · Request Validator │
│                                                                     │
│  Routes: /posts · /screenshots · /analysis · /publish              │
│          /settings · /health · /logs                               │
└──────────┬───────────────────┬──────────────────────────────────────┘
           │                   │
    Job Queue (BullMQ)    Supabase Client
           │                   │
           ▼                   ▼
┌──────────────────┐  ┌───────────────────────────────────────────────┐
│  Redis Queue     │  │              Supabase Cloud                   │
│  ─────────────   │  │  PostgreSQL · Realtime · Storage · Auth       │
│  screenshot jobs │  └───────────────────────────────────────────────┘
│  analysis jobs   │
│  publish jobs    │
└──────────┬───────┘
           │
    ┌──────┴───────────┐
    ▼                  ▼                  ▼
Screenshot          Analysis          Publish
Worker              Worker            Worker
──────────          ──────────        ──────────
Playwright          Gemini API        FB Graph API
TradingView         GPT-4o            IG Container
Cloudinary          Caption Gen       WhatsApp API
Upload              Zod Validate
```

### Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Routing | Hash-based / App Router | Works on any static host without server config |
| Auth | API key + JWT middleware | Simple and secure for single-tenant use |
| Session management | Cookie injection | TradingView anti-bot measures prevent login automation |
| Attendance storage | JSONB | Reduces join complexity for common queries |
| Image hosting | Cloudinary | Public URLs required by Instagram Container API |
| Queue | BullMQ + Redis | Production-grade, supports retries, delays, priorities |
| DB | Supabase | Managed PostgreSQL + real-time + storage in one |

---

## 🧰 Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Next.js](https://nextjs.org/) | 14 (App Router) | SSR dashboard — post queue, editor, analytics |
| TypeScript | 5.x | End-to-end type safety |
| Vanilla CSS (dark theme) | — | Glassmorphism UI with deep navy + electric accents |
| Inter font | Google Fonts | UI typography |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Node.js](https://nodejs.org/) + Express | 20 LTS | REST API server + middleware stack |
| TypeScript | 5.x | Type-safe services, models, and routes |
| [BullMQ](https://bullmq.io/) | Latest | Production job queue with retries and delays |
| [Redis](https://redis.io/) | 7.x | Queue broker and session cache |
| [Zod](https://zod.dev/) | 3.x | Runtime validation — env vars, AI responses, requests |
| [Winston](https://github.com/winstonjs/winston) | 3.x | Structured JSON logging with file + console transports |
| [node-cron](https://github.com/node-cron/node-cron) | Latest | Cron-based job scheduling |

### Automation & AI

| Technology | Purpose |
|-----------|---------|
| [Playwright](https://playwright.dev/) + playwright-extra stealth | Headless Chromium — TradingView chart capture |
| [Google Gemini 2.0 Flash](https://ai.google.dev/) | Primary vision AI — structured market analysis |
| [OpenAI GPT-4o](https://platform.openai.com/) | Fallback vision AI |
| [Cloudinary](https://cloudinary.com/) | Image upload, optimisation, CDN, public URL generation |

### Data & Infrastructure

| Technology | Purpose |
|-----------|---------|
| [Supabase](https://supabase.com/) (PostgreSQL) | Primary database + real-time subscriptions |
| [Meta Graph API v21.0](https://developers.facebook.com/) | Facebook Page + Instagram publishing |
| [WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp) | Template-based WhatsApp delivery |
| Docker + Docker Compose | Containerised dev, staging, and production environments |

### Testing

| Tool | Purpose |
|------|---------|
| Jest | Unit tests and integration tests |
| Playwright Test | E2E browser testing |
| Supertest | HTTP API endpoint testing |

---

## ✨ Features

### 🖥️ Screenshot Capture
- Cookie-injected Playwright session — no login automation, no CAPTCHA risk
- Configurable viewport (default 1920×1080) with full chart canvas render wait
- `playwright-extra` stealth plugin minimises bot detection risk
- Automatic Cloudinary upload with optimised public URL generation
- Local backup path maintained alongside cloud URL

### 🤖 AI Analysis (Gemini 2.0 Flash)
- Vision-capable prompt sends chart image for full market analysis
- Structured JSON output validated with Zod schema before saving:
  - `market_trend` — bullish / bearish / neutral
  - `support_levels` — array of price levels
  - `resistance_levels` — array of price levels
  - `explanation` — short market analysis paragraph
  - `risk_note` — risk disclaimer
  - `caption_draft` — social-media-ready text
  - `hashtags` — array of relevant hashtags
- Automatic retry with modified prompt if schema validation fails
- GPT-4o fallback if Gemini returns an error or times out

### ✍️ Platform-Specific Caption Generation
- **Facebook** — longer format with link preview optimisation
- **Instagram** — emoji-rich, up to 30 hashtags, line-break formatting
- **WhatsApp** — concise with key price levels highlighted
- Configurable risk disclaimer appended to all captions
- All platform captions editable in the dashboard before publishing

### 📊 Review & Approval Dashboard
- Post queue with status filters: draft · analyzing · pending_review · approved · publishing · published · failed
- Full post detail view: screenshot, AI analysis, editable caption, platform status
- One-click approve → publish workflow
- Bulk actions on the queue
- Audit timeline per post showing every action taken

### 📤 Publishing
- **Facebook** — `/{page-id}/photos` endpoint with caption
- **Instagram** — Two-step container-based publish: create container → poll status → publish
- **WhatsApp** — Template message with image media attachment; fallback `wa.me` deep link generated
- Independent per-platform error handling — one platform failure doesn't block others
- Platform publish status stored as JSONB with post ID, URL, and timestamp per platform

### 🔄 Job Queue & Retry
- BullMQ queues for screenshot, analysis, and publish jobs
- 3 retry attempts per job with exponential backoff
- Failed jobs surfaced in dashboard with error details
- Manual retry button per failed post

### 📅 Scheduling
- Configurable cron expressions per symbol (e.g., `0 9 * * 1-5` for weekdays at 9am)
- Active/inactive toggle per scheduled job
- Last run and next run timestamps visible in Settings

### 🔐 Security
- API key authentication on all backend routes
- Zod-enforced env validation — server fails fast on missing credentials
- No secrets in source code (automated test verifies this)
- Cloudinary signed URLs for private asset access
- Rate limiting on all public endpoints

---

## 📂 Project Structure

```
PROJECT-1/
│
├── README.md                          # This file
├── docker-compose.yml                 # Dev environment (Redis, PostgreSQL, backend, frontend)
├── docker-compose.prod.yml            # Production override
├── .env.example                       # All env vars documented — copy to .env
├── .gitignore                         # Excludes: node_modules, .env, dist, screenshots/
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.ts
│   ├── src/
│   │   ├── index.ts                   # Express app entry — mounts middleware + routes
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts                 # Zod-validated env — fails fast on missing vars
│   │   │   ├── database.ts            # Supabase client singleton
│   │   │   ├── redis.ts               # Redis + BullMQ connection
│   │   │   └── logger.ts              # Winston JSON logger (file + console)
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts                # API key / JWT authentication
│   │   │   ├── errorHandler.ts        # Global Express error handler
│   │   │   ├── rateLimiter.ts         # Per-IP rate limiting
│   │   │   └── validator.ts           # Zod request body validation
│   │   │
│   │   ├── routes/
│   │   │   ├── posts.ts               # CRUD + approve + publish + retry
│   │   │   ├── screenshots.ts         # Manual capture trigger
│   │   │   ├── analysis.ts            # AI analysis endpoints
│   │   │   ├── publish.ts             # Publishing endpoints
│   │   │   ├── settings.ts            # Admin settings management
│   │   │   ├── health.ts              # /health + /health/ready
│   │   │   └── logs.ts                # Audit log query endpoints
│   │   │
│   │   ├── services/
│   │   │   ├── screenshot.service.ts  # Playwright capture + Cloudinary upload
│   │   │   ├── ai.service.ts          # Gemini/OpenAI vision + Zod validation
│   │   │   ├── caption.service.ts     # Platform-specific caption formatting
│   │   │   ├── facebook.service.ts    # Meta Graph API — FB Page photo post
│   │   │   ├── instagram.service.ts   # Meta Graph API — IG container publish
│   │   │   ├── whatsapp.service.ts    # WhatsApp Business Cloud API + wa.me fallback
│   │   │   ├── cloudinary.service.ts  # Upload, optimize, signed URL, delete
│   │   │   └── scheduler.service.ts   # node-cron + scheduled_jobs table
│   │   │
│   │   ├── workers/
│   │   │   ├── screenshot.worker.ts   # BullMQ processor: capture + upload
│   │   │   ├── analysis.worker.ts     # BullMQ processor: AI analysis + caption
│   │   │   └── publish.worker.ts      # BullMQ processor: per-platform publish
│   │   │
│   │   ├── models/
│   │   │   ├── post.model.ts          # Post TypeScript interface + status enum
│   │   │   ├── analysis.model.ts      # AI analysis output type + Zod schema
│   │   │   └── audit.model.ts         # Audit log entry type
│   │   │
│   │   ├── utils/
│   │   │   ├── retry.ts               # Exponential backoff retry wrapper
│   │   │   ├── secrets.ts             # Secret validation + sanitisation
│   │   │   └── sanitize.ts            # Input sanitisation
│   │   │
│   │   └── db/
│   │       ├── migrations/
│   │       │   └── 001_initial.sql    # Creates all tables, enums, indexes
│   │       └── seed.ts                # Dev seed data for local testing
│   │
│   └── tests/
│       ├── unit/
│       │   ├── ai.service.test.ts     # AI response parsing, schema validation
│       │   ├── caption.service.test.ts# Caption formatting, char limits
│       │   ├── retry.test.ts          # Backoff logic, max attempts
│       │   └── secrets.test.ts        # Secret detection, env validation
│       ├── integration/
│       │   ├── screenshot.test.ts     # Live Playwright capture test
│       │   ├── ai-analysis.test.ts    # Real Gemini API call
│       │   ├── facebook.test.ts       # Meta Graph API (test page)
│       │   ├── instagram.test.ts      # IG container publish (test account)
│       │   └── whatsapp.test.ts       # WhatsApp template send (test number)
│       ├── e2e/
│       │   └── full-workflow.test.ts  # End-to-end: capture → analyse → approve → publish
│       ├── error-paths/
│       │   ├── failed-login.test.ts   # Invalid TradingView cookies
│       │   ├── missing-screenshot.test.ts # Publish without screenshot
│       │   ├── api-failure.test.ts    # AI API timeout + fallback
│       │   └── rate-limit.test.ts     # Rate limit hit handling
│       └── security/
│           └── no-secrets-exposed.test.ts # No keys in source, no keys in API responses
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout + providers + sidebar
│   │   │   ├── page.tsx               # Dashboard home — stats + activity feed
│   │   │   ├── globals.css            # Dark theme, glassmorphism, animations
│   │   │   ├── posts/
│   │   │   │   ├── page.tsx           # Post queue with filters + bulk actions
│   │   │   │   └── [id]/page.tsx      # Post detail — edit, approve, publish
│   │   │   ├── capture/
│   │   │   │   └── page.tsx           # Symbol input + capture trigger
│   │   │   ├── logs/
│   │   │   │   └── page.tsx           # Searchable audit log
│   │   │   └── settings/
│   │   │       └── page.tsx           # TradingView cookies, API tokens, schedules
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx        # Navigation + platform connection status
│   │   │   │   ├── Header.tsx         # Page title + user actions
│   │   │   │   └── StatusBadge.tsx    # Semantic color status indicators
│   │   │   ├── posts/
│   │   │   │   ├── PostCard.tsx       # Queue list item
│   │   │   │   ├── PostEditor.tsx     # Caption + hashtag inline editor
│   │   │   │   ├── PostTimeline.tsx   # Audit trail per post
│   │   │   │   └── ApprovalActions.tsx# Approve + platform selector + publish
│   │   │   ├── capture/
│   │   │   │   ├── SymbolInput.tsx    # TradingView symbol + chart URL input
│   │   │   │   └── CapturePreview.tsx # Live screenshot preview
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Toast.tsx
│   │   │       └── Loading.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                 # Typed API client (fetch wrapper)
│   │   │   └── utils.ts               # Date formatting, truncation, platform helpers
│   │   └── hooks/
│   │       ├── usePosts.ts            # Posts fetch + polling
│   │       └── useToast.ts            # Toast notification state
│   └── public/
│       └── favicon.ico
│
├── docs/
│   ├── api-examples.md                # Full Postman-style API examples
│   ├── setup.md                       # Detailed setup walkthrough
│   ├── testing.md                     # Test categories + commands + expectations
│   ├── deployment.md                  # Docker + VPS deployment guide
│   └── env-vars.md                    # Every env var with description and example
│
└── scripts/
    ├── setup.sh                       # One-command dev environment setup
    ├── run-tests.sh                   # Run all test categories sequentially
    ├── migrate.sh                     # Run database migrations
    └── smoke-test.sh                  # Production smoke test script
```

---

## 🗄️ Database Schema

### `posts` — Central Post Lifecycle Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid PK` | Auto-generated unique identifier |
| `symbol` | `varchar(20)` | Trading symbol — e.g. `BTCUSD`, `AAPL` |
| `status` | `enum` | `draft` → `analyzing` → `pending_review` → `approved` → `publishing` → `published` / `failed` |
| `screenshot_url` | `text` | Cloudinary CDN URL (publicly accessible for IG API) |
| `screenshot_local_path` | `text` | Local filesystem backup path |
| `ai_analysis` | `jsonb` | Full structured AI output object |
| `caption` | `text` | Final approved caption text |
| `hashtags` | `text[]` | Array of hashtag strings |
| `risk_note` | `text` | Risk disclaimer appended to post |
| `published_platforms` | `jsonb` | `{ facebook: { id, url, timestamp }, instagram: {...}, whatsapp: {...} }` |
| `error_log` | `jsonb` | Error details for any failed step |
| `created_by` | `uuid FK` | User who initiated the capture |
| `created_at` | `timestamptz` | Record creation — auto set |
| `updated_at` | `timestamptz` | Last modification — auto updated |
| `approved_at` | `timestamptz` | Timestamp of approval action |
| `published_at` | `timestamptz` | Timestamp of first successful publish |

### `audit_logs` — Full Action Trail

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid PK` | Log entry identifier |
| `post_id` | `uuid FK` | Parent post reference |
| `action` | `varchar(50)` | `screenshot_captured`, `ai_analyzed`, `caption_edited`, `approved`, `published_facebook`, `published_instagram`, `whatsapp_sent`, `failed`, `retried` |
| `details` | `jsonb` | Action-specific metadata (API response, model used, duration) |
| `status` | `varchar(20)` | `success`, `failure`, `retry` |
| `error_message` | `text` | Error string if status is `failure` |
| `created_at` | `timestamptz` | When the action occurred |

### `settings` — Admin Configuration

| Column | Type | Description |
|--------|------|-------------|
| `key` | `varchar(100) PK` | Setting identifier (e.g., `tv_session_id`) |
| `value` | `jsonb` | Setting value — encrypted at rest for secrets |
| `updated_at` | `timestamptz` | Last update timestamp |

### `scheduled_jobs` — Cron Scheduling

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid PK` | Job identifier |
| `symbol` | `varchar(20)` | Symbol to capture on schedule |
| `cron_expression` | `varchar(50)` | Standard cron — e.g. `0 9 * * 1-5` (weekdays 9am) |
| `is_active` | `boolean` | Enabled/disabled toggle |
| `last_run` | `timestamptz` | Last successful execution |
| `next_run` | `timestamptz` | Next scheduled execution |
| `created_at` | `timestamptz` | Record creation |

---

## 📋 Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 20 LTS | Backend and frontend runtime |
| npm | 9+ | Package management |
| Docker + Docker Compose | Latest | Containerised services |
| Supabase account | — | Managed PostgreSQL + storage |
| Cloudinary account | — | Image hosting (free tier sufficient for MVP) |
| Google AI API key | — | Gemini 2.0 Flash (primary AI) |
| OpenAI API key | Optional | GPT-4o fallback |
| Meta Developer App | — | Facebook + Instagram publishing |
| WhatsApp Business account | — | WhatsApp Business Cloud API |
| Redis | 7.x | Provided via Docker Compose |

---

## 🚀 Installation & Setup

### Step 1 — Clone & Install

```bash
git clone https://github.com/ibtesaamaslam/tradingview-ai-social-automation.git
cd tradingview-ai-social-automation

# Run the one-command setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or manually:
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### Step 2 — Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your credentials — see Environment Variables section below
```

### Step 3 — Start the Docker Services

```bash
# Start all services (Redis, PostgreSQL dev, backend, frontend)
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Step 4 — Export TradingView Session Cookies

1. Open [TradingView](https://www.tradingview.com/) in Chrome and log in
2. Open DevTools → Application → Cookies → `https://www.tradingview.com`
3. Copy the values of `sessionid` and `sessionid_sign`
4. Add them to `.env` as `TV_SESSION_ID` and `TV_SESSION_ID_SIGN`
5. Or update them via the Settings page in the dashboard (no restart needed)

### Step 5 — Configure Meta App Permissions

**For development (no App Review needed):**
1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App
2. Add test users (up to 25) via App Roles → Test Users
3. Generate a Page Access Token with `pages_manage_posts` and `pages_read_engagement`
4. Add `instagram_business_content_publish` for Instagram

**For production:**
1. Complete Meta App Review before going live with real audiences
2. Use long-lived Page Access Tokens (60 days — refresh automatically via the API)

---

## 🔑 Environment Variables

Create `.env` from `.env.example`:

```env
# ── Application ─────────────────────────────────────────────────────────
NODE_ENV=development
PORT=4000
API_SECRET_KEY=<random-32-char-string>          # Used to authenticate frontend → backend
FRONTEND_URL=http://localhost:3000

# ── Database (Supabase) ──────────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
DATABASE_URL=postgresql://postgres:password@localhost:5432/chartpost

# ── Redis ────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── TradingView Session (export from browser — valid ~30 days) ───────────
TV_SESSION_ID=<tradingview-sessionid-cookie-value>
TV_SESSION_ID_SIGN=<tradingview-sessionid_sign-cookie-value>

# ── AI Models ────────────────────────────────────────────────────────────
GEMINI_API_KEY=<google-ai-studio-api-key>
OPENAI_API_KEY=<openai-api-key>               # Optional fallback
AI_PRIMARY_MODEL=gemini                        # gemini | openai

# ── Cloudinary ───────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

# ── Meta (Facebook + Instagram) ──────────────────────────────────────────
META_APP_ID=<meta-app-id>
META_APP_SECRET=<meta-app-secret>
META_PAGE_ACCESS_TOKEN=<long-lived-page-access-token>
META_PAGE_ID=<facebook-page-id>
META_IG_USER_ID=<instagram-business-user-id>

# ── WhatsApp Business Cloud API ──────────────────────────────────────────
WHATSAPP_PHONE_NUMBER_ID=<phone-number-id>
WHATSAPP_ACCESS_TOKEN=<whatsapp-access-token>
WHATSAPP_TEMPLATE_NAME=chart_update            # Pre-approved template name

# ── Optional: Rate limiting ──────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000                    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

> ⚠️ **Never commit `.env` to version control.** The `no-secrets-exposed.test.ts` test automatically verifies no secrets appear in source code or API responses.

---

## 🗃️ Database Initialisation

### Method A — Supabase SQL Editor (Recommended)

```bash
# 1. Open your Supabase project
# 2. Navigate to SQL Editor → New Query
# 3. Copy and paste: backend/src/db/migrations/001_initial.sql
# 4. Click Run

# Or run via script:
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

### Method B — Direct PostgreSQL (dev only)

```bash
psql -U postgres -d chartpost -f backend/src/db/migrations/001_initial.sql
```

### Seed Development Data

```bash
cd backend
npx ts-node src/db/seed.ts
```

This creates sample posts in each status state for dashboard testing.

---

## ▶️ Running the Application

### Development Mode

```bash
# All services via Docker Compose
docker compose up -d

# Or run individually:
cd backend && npm run dev       # → http://localhost:4000
cd frontend && npm run dev      # → http://localhost:3000

# View queue dashboard (BullBoard)
# → http://localhost:4000/admin/queues
```

### Production Mode

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Start production stack
docker compose -f docker-compose.prod.yml up -d
```

### Available npm Scripts

```bash
# Backend
npm run dev          # Start with hot-reload (tsx watch)
npm run build        # Compile TypeScript → dist/
npm run start        # Start compiled production build
npm run lint         # ESLint check
npm run test         # Run all test suites
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests (requires API keys)
npm run test:api     # Supertest API tests
npm run test:e2e     # End-to-end workflow tests
npm run test:security     # Secret exposure check

# Frontend
npm run dev          # Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Next.js lint
```

---

## 📦 Module Documentation

### 1. Screenshot Capture Module
**File:** `backend/src/services/screenshot.service.ts`

```typescript
// Trigger a manual capture
POST /api/screenshots/capture
Body: { symbol: "BTCUSD", chartUrl?: "https://www.tradingview.com/chart/..." }

// Response
{ postId: "uuid", status: "queued", message: "Screenshot job added to queue" }
```

**How it works:**
- Launches headless Chromium via Playwright with stealth plugin active
- Injects `sessionid` and `sessionid_sign` cookies from env/settings
- Navigates to the chart URL (auto-constructed from symbol if not provided)
- Waits for `networkidle` + explicit canvas element presence before capture
- Takes full-viewport screenshot at 1920×1080
- Saves locally to `screenshots/` then uploads to Cloudinary
- Returns both local path and Cloudinary URL to the worker

**Cookie expiry handling:** A warning banner appears in the dashboard if `TV_SESSION_ID` was last updated more than 25 days ago. Update via Settings → TradingView Credentials.

---

### 2. AI Analysis Module
**File:** `backend/src/services/ai.service.ts`

The AI receives the Cloudinary image URL alongside a structured prompt requesting JSON output in this exact schema:

```json
{
  "market_trend": "bullish",
  "support_levels": ["$42,000", "$40,500"],
  "resistance_levels": ["$45,200", "$47,000"],
  "explanation": "BTC is forming a bullish flag pattern after consolidating above the 200 EMA...",
  "risk_note": "⚠️ Not financial advice. Trading involves risk of capital loss.",
  "caption_draft": "📊 BTC/USD Analysis | Bullish momentum building...",
  "hashtags": ["#Bitcoin", "#BTC", "#CryptoAnalysis", "#TradingView"]
}
```

**Fallback chain:**
1. Gemini 2.0 Flash (primary)
2. If Gemini fails → OpenAI GPT-4o
3. If response doesn't match Zod schema → retry with simplified prompt (2 attempts)
4. If all attempts fail → post marked `failed`, error logged to `error_log`

---

### 3. Caption Generation Module
**File:** `backend/src/services/caption.service.ts`

Generates three platform-specific captions from the AI analysis:

| Platform | Format | Max Length | Hashtags |
|----------|--------|------------|---------|
| Facebook | Long-form with line breaks | 63,206 chars | Inline (5-10) |
| Instagram | Emoji-rich, visual breaks | 2,200 chars | End block (up to 30) |
| WhatsApp | Concise, key levels bolded | 1,024 chars (template) | None |

All captions include a configurable risk disclaimer from `settings.risk_disclaimer`.

---

### 4. Facebook Publisher
**File:** `backend/src/services/facebook.service.ts`

```
POST https://graph.facebook.com/v21.0/{page-id}/photos
  ?access_token={PAGE_ACCESS_TOKEN}
  &url={cloudinary-image-url}
  &message={caption}
```

Returns: `{ id: "fb-post-id", permalink_url: "https://facebook.com/..." }`

**Token refresh:** Long-lived Page Access Tokens last 60 days. The settings page includes a "Refresh Token" button that calls the token extension endpoint automatically.

---

### 5. Instagram Publisher
**File:** `backend/src/services/instagram.service.ts`

Instagram uses a two-step container-based publishing flow:

```
Step 1: Create media container
POST https://graph.facebook.com/v21.0/{ig-user-id}/media
  { image_url: cloudinary-url, caption: "..." }
  → Returns: { id: "container-id" }

Step 2: Poll container status (async processing)
GET https://graph.facebook.com/v21.0/{container-id}?fields=status_code
  → Wait for: status_code === "FINISHED"

Step 3: Publish container
POST https://graph.facebook.com/v21.0/{ig-user-id}/media_publish
  { creation_id: "container-id" }
  → Returns: { id: "ig-media-id" }
```

**Image requirements:** Must be a publicly accessible HTTPS URL (Cloudinary provides this automatically). Aspect ratio must be between 4:5 and 1.91:1.

---

### 6. WhatsApp Delivery Module
**File:** `backend/src/services/whatsapp.service.ts`

> ⚠️ WhatsApp Channels are NOT supported via the official Meta API. This module uses the WhatsApp Business Cloud API to send pre-approved template messages.

```
POST https://graph.facebook.com/v21.0/{phone-number-id}/messages
{
  "messaging_product": "whatsapp",
  "to": "{recipient-number}",
  "type": "template",
  "template": {
    "name": "chart_update",
    "language": { "code": "en_US" },
    "components": [
      { "type": "header", "parameters": [{ "type": "image", "image": { "link": "{cloudinary-url}" } }] },
      { "type": "body", "parameters": [{ "type": "text", "text": "{caption}" }] }
    ]
  }
}
```

**Fallback:** If template sending is not configured, the module generates a `wa.me` deep link:
```
https://wa.me/?text={encoded-caption-with-image-url}
```
This link is stored in `published_platforms.whatsapp` and surfaced in the dashboard for manual sharing.

---

### 7. Job Queue Architecture
**Files:** `backend/src/workers/`

Three BullMQ queues with independent workers:

| Queue | Jobs | Retries | On Success |
|-------|------|---------|-----------|
| `screenshot-queue` | Playwright capture + Cloudinary upload | 3 × exponential backoff | Triggers `analysis-queue` |
| `analysis-queue` | Gemini analysis + caption generation | 3 × exponential backoff | Sets status `pending_review` |
| `publish-queue` | Per-platform publish | 3 × exponential backoff | Updates `published_platforms` |

**BullBoard** (queue monitoring UI) is available at `/admin/queues` in development.

---

### 8. Scheduler
**File:** `backend/src/services/scheduler.service.ts`

```typescript
// Example: Schedule BTCUSD every weekday at 9am
POST /api/settings/schedules
{
  "symbol": "BTCUSD",
  "cronExpression": "0 9 * * 1-5",
  "isActive": true
}
```

Schedules are stored in `scheduled_jobs` and loaded on server start. Active schedules trigger screenshot jobs via the BullMQ queue.

---

### 9. Logging & Audit Trail
**File:** `backend/src/config/logger.ts`

Winston logger with:
- JSON structured format (machine-readable)
- Request ID propagated across the full pipeline
- Separate error transport (file: `logs/error.log`, console)
- Combined transport (file: `logs/combined.log`)

All significant events also write an `audit_logs` row:
- Screenshot captured / failed
- AI analysis completed / failed
- Caption edited (with before/after diff)
- Post approved
- Published to Facebook / failed
- Published to Instagram / failed
- WhatsApp sent / fallback used
- Retry attempted

---

### 10. Admin Settings Module
**Endpoint:** `GET|PATCH /api/settings`

| Setting Key | Description |
|-------------|-------------|
| `tv_session_id` | TradingView cookie (encrypted at rest) |
| `tv_session_id_sign` | TradingView session sign cookie |
| `ai_primary_model` | `gemini` or `openai` |
| `risk_disclaimer` | Custom risk disclaimer text |
| `whatsapp_recipients` | JSON array of recipient phone numbers |
| `fb_page_access_token` | Current Page Access Token |
| `instagram_caption_template` | Caption template with `{{symbol}}`, `{{trend}}` placeholders |

---

## 🔌 API Reference

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/posts` | List posts — filters: `status`, `symbol`, `dateFrom`, `dateTo` |
| `GET` | `/api/posts/:id` | Get post with full AI analysis and audit trail |
| `POST` | `/api/posts` | Create post + trigger screenshot → analysis pipeline |
| `PATCH` | `/api/posts/:id` | Edit caption / hashtags / risk note |
| `POST` | `/api/posts/:id/approve` | Approve post for publishing |
| `POST` | `/api/posts/:id/publish` | Publish to selected platforms |
| `POST` | `/api/posts/:id/retry` | Retry failed publish |
| `DELETE` | `/api/posts/:id` | Soft-delete post |

### Screenshots

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/screenshots/capture` | Manually trigger a capture for a symbol |
| `GET` | `/api/screenshots/:id` | Get screenshot metadata + image URL |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | All non-secret settings |
| `PATCH` | `/api/settings` | Update one or more settings |
| `POST` | `/api/settings/test-connection` | Test a platform connection |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Service health — DB, Redis, external APIs |
| `GET` | `/api/health/ready` | Kubernetes readiness probe |
| `GET` | `/api/logs` | Query audit logs with pagination |
| `GET` | `/admin/queues` | BullBoard queue monitoring (dev only) |

**Full request/response examples:** See `docs/api-examples.md`

---

## 🖥️ Frontend Dashboard

### Design System

```
Color palette:
  Background:  #0a0e27 (deep navy)
  Surface:     #111827 (dark card)
  Primary:     #6366f1 (electric indigo)
  Accent:      #22d3ee (cyan)
  Success:     #10b981 (emerald)
  Warning:     #f59e0b (amber)
  Error:       #ef4444 (red)
  Text:        #f9fafb (near-white)
  Muted:       #6b7280 (slate)

Effects:
  Cards:       backdrop-blur glassmorphism with 1px border
  Numbers:     JetBrains Mono / monospace for financial data
  Animations:  CSS transitions on hover, status badge pulse
  Font:        Inter (Google Fonts)
```

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard Home | Stats cards (total, pending, published today, failed) + activity feed |
| `/posts` | Post Queue | Filterable list + bulk approve/publish/delete |
| `/posts/[id]` | Post Detail | Screenshot preview, AI output, caption editor, platform toggles, audit timeline |
| `/capture` | Capture | Symbol input, optional chart URL, trigger button, preview |
| `/logs` | Audit Logs | Full searchable audit log with status filter |
| `/settings` | Settings | TradingView cookies, API tokens, schedules, WhatsApp recipients, risk disclaimer |

---

## 🧪 Testing

### Test Categories

```bash
# Run all tests
npm run test

# Individual categories
npm run test:unit          # Business logic — no external calls
npm run test:integration   # Real API calls — requires valid env vars
npm run test:api           # HTTP endpoint tests via Supertest
npm run test:e2e           # Full pipeline — mocked external APIs
npm run test:security      # Secret exposure verification

# Coverage report
npm run test:coverage

# Smoke test (production build)
npm run test:smoke
```

### Test Coverage Map

| Test File | What It Verifies |
|-----------|-----------------|
| `unit/ai.service.test.ts` | JSON parsing, Zod schema validation, fallback trigger |
| `unit/caption.service.test.ts` | Character limits, platform formatting, hashtag count |
| `unit/retry.test.ts` | Backoff timing, max attempt count, error propagation |
| `unit/secrets.test.ts` | No hardcoded secrets, env validation failure modes |
| `integration/screenshot.test.ts` | Live Playwright capture — real TradingView page |
| `integration/ai-analysis.test.ts` | Real Gemini API call — valid structured response |
| `integration/facebook.test.ts` | Post to Meta test page — returns post ID |
| `integration/instagram.test.ts` | Container create → poll → publish on test account |
| `integration/whatsapp.test.ts` | Template message to test number |
| `e2e/full-workflow.test.ts` | Capture → analyse → approve → publish (mocked APIs) |
| `error-paths/failed-login.test.ts` | Invalid cookies — graceful error, post marked failed |
| `error-paths/missing-screenshot.test.ts` | Publish without screenshot — blocked with message |
| `error-paths/api-failure.test.ts` | AI timeout → fallback → failure |
| `error-paths/rate-limit.test.ts` | Rate limit hit — retry after backoff |
| `security/no-secrets-exposed.test.ts` | Source code scan + API response scan |

### Deployment Gate

The deployment gate in `scripts/run-tests.sh` blocks deployment if any of the following fail:

```
✅ All unit tests pass
✅ All integration tests pass
✅ npm run build succeeds (backend + frontend)
✅ npm run lint passes (no errors)
✅ Environment variables configured + validated
✅ Database migrations run without errors
✅ Sample post flow verified in staging
✅ No secrets exposed (automated scan)
✅ Docker images build successfully
✅ GET /api/health returns { status: "ok" }
✅ Rollback plan documented
```

---

## 🚢 Deployment

### Docker Compose Services

```yaml
services:
  backend:    # Node.js API + BullMQ workers (port 4000)
  frontend:   # Next.js standalone build (port 3000)
  redis:      # BullMQ job queue (port 6379)
  postgres:   # Development only — production uses Supabase hosted
```

### Deploy to a VPS (DigitalOcean / AWS / GCP)

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Clone the repository
git clone https://github.com/ibtesaamaslam/tradingview-ai-social-automation.git
cd tradingview-ai-social-automation

# 3. Configure production environment
cp .env.example .env.production
nano .env.production   # Add all production credentials

# 4. Run the deployment gate checks
chmod +x scripts/run-tests.sh
./scripts/run-tests.sh

# 5. Build and start production stack
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 6. Run migrations
./scripts/migrate.sh

# 7. Run smoke test
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh
```

### Reverse Proxy (Nginx recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

---

## ↩️ Rollback Plan

Every Docker image is tagged with the Git commit SHA at build time:

```bash
# Tag format
registry/chartpost-backend:abc1234
registry/chartpost-frontend:abc1234

# Rollback to previous version
docker compose -f docker-compose.prod.yml pull backend:PREVIOUS_SHA
docker compose -f docker-compose.prod.yml up -d --no-deps backend

# Or rollback everything
git checkout PREVIOUS_SHA
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

**Database:** Migrations are forward-only and backward-compatible. No destructive schema changes are made in patch versions. Major version schema changes include a `down` migration script.

---

## 🔧 Troubleshooting

### TradingView cookies expired
**Symptom:** Screenshot capture fails with `net::ERR_ABORTED` or login redirect  
**Fix:** Re-export `sessionid` and `sessionid_sign` from a fresh browser session. Update in Settings → TradingView Credentials. No server restart required.

### Instagram publish fails with `(#100) Invalid image URL`
**Symptom:** IG container creation returns error 100  
**Fix:** Ensure Cloudinary URL is publicly accessible (HTTPS, no auth). Check image dimensions — must be between 4:5 and 1.91:1 aspect ratio.

### Gemini returns malformed JSON
**Symptom:** `ZodError` in analysis worker logs  
**Fix:** The service retries twice with a more constrained prompt. If it fails 3 times, check `GEMINI_API_KEY` is valid and Gemini 2.0 Flash is available in your region. OpenAI fallback activates automatically.

### WhatsApp template rejected
**Symptom:** WhatsApp API returns `#132000` template error  
**Fix:** Template must be pre-approved in Meta Business Manager. Check `WHATSAPP_TEMPLATE_NAME` matches exactly. Dashboard will show `wa.me` fallback link while template approval is pending.

### BullMQ jobs stuck in `waiting`
**Symptom:** Jobs are queued but not processing  
**Fix:** Check Redis connection — `docker compose ps redis`. Verify `REDIS_URL` in `.env`. Restart workers: `docker compose restart backend`.

---

## 🗺️ Roadmap

### v1.1

- [ ] Multi-symbol batch scheduling — capture multiple symbols in one scheduled run
- [ ] Telegram channel publishing — additional platform via Bot API
- [ ] TradingView cookie auto-refresh via Playwright scheduled task

### v1.2

- [ ] AI A/B caption testing — generate two caption variants, track engagement per variant
- [ ] Automatic token refresh for Meta Page Access Tokens before expiry
- [ ] Webhook support — receive Meta publish status updates via webhook

### v2.0

- [ ] Multi-user support — team roles (admin, reviewer, viewer)
- [ ] Custom AI prompt templates per symbol or asset class
- [ ] Analytics dashboard — engagement metrics pulled from Meta Insights API
- [ ] LinkedIn publishing via LinkedIn Marketing API
- [ ] Twitter/X publishing via X API v2

---

## 📜 License

This project is licensed under the **MIT License**.

```
MIT License — Copyright (c) 2026 Ibtesaam Aslam
```

---

## 🙏 Acknowledgements

- **[Playwright](https://playwright.dev/)** — for the best-in-class browser automation that makes TradingView chart capture reliable
- **[Google Gemini](https://ai.google.dev/)** — for the vision-capable AI that powers market analysis
- **[BullMQ](https://bullmq.io/)** — for the production-grade job queue that makes the pipeline resilient
- **[Supabase](https://supabase.com/)** — for the managed PostgreSQL + real-time + storage combination
- **[Meta Graph API](https://developers.facebook.com/)** — for the official publishing endpoints

---

<div align="center">

*Built for daily reliability. Designed for minimal manual work. Maintained with production quality.*

</div>