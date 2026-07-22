-- Per-tenant secret for the customer-facing xAI voice-agent MCP endpoint
-- (src/app/api/voice/customer-mcp/[secret]/[transport]/route.ts) and its
-- companion call-lifecycle webhook. Global column, NULL for every tenant
-- except the ones actually wired up in xAI's console — that's what scopes
-- this feature to specific tenants without forking any code.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_agent_mcp_secret text;
