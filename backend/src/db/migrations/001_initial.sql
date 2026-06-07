-- ============================================================
-- TradingView AI Social Media Automation — Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Posts Table ───
CREATE TABLE IF NOT EXISTS posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol          VARCHAR(20) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft'
                    CHECK (status IN (
                        'draft', 'capturing', 'analyzing', 'pending_review',
                        'approved', 'publishing', 'published',
                        'partially_published', 'failed'
                    )),
    screenshot_url  TEXT,
    screenshot_local_path TEXT,
    ai_analysis     JSONB,
    caption         TEXT,
    hashtags        TEXT[],
    risk_note       TEXT,
    published_platforms JSONB DEFAULT '{}',
    error_log       JSONB,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at     TIMESTAMPTZ,
    published_at    TIMESTAMPTZ
);

-- ─── Audit Logs Table ───
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID REFERENCES posts(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,
    details         JSONB DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'success'
                    CHECK (status IN ('success', 'failure', 'retry')),
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Settings Table ───
CREATE TABLE IF NOT EXISTS settings (
    key             VARCHAR(100) PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Scheduled Jobs Table ───
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol          VARCHAR(20) NOT NULL,
    cron_expression VARCHAR(50) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_run        TIMESTAMPTZ,
    next_run        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_symbol ON posts(symbol);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_post_id ON audit_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_active ON scheduled_jobs(is_active) WHERE is_active = true;

-- ─── Updated_at Trigger ───
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Default Settings ───
INSERT INTO settings (key, value) VALUES
    ('ai_model', '"gemini"'),
    ('default_risk_note', '"⚠️ This is not financial advice. Trading involves risk. Always do your own research."'),
    ('auto_approve', 'false'),
    ('max_hashtags', '15'),
    ('caption_max_length', '2200')
ON CONFLICT (key) DO NOTHING;
