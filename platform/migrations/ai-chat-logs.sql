-- AI chat logs: track all Selena conversations across tenants
CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  assistant_reply TEXT NOT NULL,
  tools_used TEXT[] DEFAULT '{}',
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_logs_tenant ON ai_chat_logs(tenant_id);
CREATE INDEX idx_ai_chat_logs_created ON ai_chat_logs(created_at DESC);

ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;
