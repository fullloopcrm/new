-- Voice/chat prospect-qualification agent (xAI Grok voice + MCP tool server).
-- Distinguishes agent-originated leads from the /qualify form and gives the
-- agent a place to append free-text notes gathered mid-conversation.
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'form',
  ADD COLUMN IF NOT EXISTS agent_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_prospects_source ON prospects(source);
