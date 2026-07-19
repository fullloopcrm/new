// Per-tenant xAI Grok voice-agent configuration — the multi-tenant
// equivalent of nycmaid's single hardcoded VOICE_AGENT_ENABLED /
// VOICE_AGENT_NUMBERS / XAI_SIP_USERNAME / XAI_SIP_PASSWORD env vars
// (commit 25c162bf). Each tenant opts in independently via
// tenants.voice_agent_enabled + its own xai_sip_username/xai_sip_password,
// added in migrations/2026_07_18_voice_agent.sql.
import { supabaseAdmin } from '@/lib/supabase'
import { decryptSecret } from '@/lib/secret-crypto'
import { tenantServesSite } from '@/lib/tenant-status'

export interface XaiVoiceAgentConfig {
  enabled: boolean
  sipUsername: string
  sipPassword: string
}

export async function resolveXaiVoiceAgentConfig(
  tenantId: string | null | undefined,
): Promise<XaiVoiceAgentConfig> {
  if (!tenantId) return { enabled: false, sipUsername: '', sipPassword: '' }

  const { data } = await supabaseAdmin
    .from('tenants')
    .select('voice_agent_enabled, xai_sip_username, xai_sip_password')
    .eq('id', tenantId)
    .single()

  if (!data) return { enabled: false, sipUsername: '', sipPassword: '' }

  return {
    enabled: !!data.voice_agent_enabled,
    sipUsername: (data.xai_sip_username as string) || '',
    sipPassword: data.xai_sip_password ? decryptSecret(data.xai_sip_password as string) : '',
  }
}

// Resolves the tenant that owns a voice_mcp_token secret. Used by the MCP
// server route (URL-path secret, xAI's connector can't send a static Bearer
// header — same reasoning as nycmaid's b9a87f1b) and the call-lifecycle
// Telnyx webhook. Same tenantServesSite gate as resolveTenantByToNumber, so
// a suspended tenant's stale MCP connector 404s instead of continuing to
// run live tool calls against their data.
export async function resolveTenantByVoiceMcpToken(
  secret: string,
): Promise<{ id: string } | null> {
  if (!secret) return null
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, status')
    .eq('voice_mcp_token', secret)
    .maybeSingle()
  if (!data || !tenantServesSite(data.status)) return null
  return { id: data.id }
}
