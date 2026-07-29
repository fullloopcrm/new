-- Adopted from legacy hand-run migration: 2026_07_15_prospects_voice_agent_fields.sql
-- Original commit date (git first-add): 2026-07-20T20:20:40-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Voice/chat prospect-qualification agent (xAI Grok voice + MCP tool server).
-- Distinguishes agent-originated leads from the /qualify form and gives the
-- agent a place to append free-text notes gathered mid-conversation.
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'form',
  ADD COLUMN IF NOT EXISTS agent_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_prospects_source ON prospects(source);
