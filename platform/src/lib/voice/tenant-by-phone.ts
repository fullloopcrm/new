// Resolve the tenant that owns an inbound Telnyx voice call from the
// dialed (`to`) number. Same telnyx_phone||sms_number precedence, same
// limit(2)-not-.single()-so-an-ambiguous-match-doesn't-hard-error, and same
// explicit-error-check (not silently dropped) as the inbound SMS webhook's
// resolver (src/app/api/webhooks/telnyx/route.ts) — extracted here so the
// new voice-agent surface (MCP server, call-lifecycle webhook, SIP-routing
// branch) can share one tenant-by-phone lookup instead of re-deriving it.
import { supabaseAdmin } from '@/lib/supabase'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { tenantServesSite } from '@/lib/tenant-status'

export interface VoiceTenant {
  id: string
  name: string
  status: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  sms_number: string | null
}

export async function resolveTenantByToNumber(to: string): Promise<VoiceTenant | null> {
  const safeTo = sanitizePostgrestValue(to)
  if (!safeTo) return null

  const { data: matches, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, status, telnyx_api_key, telnyx_phone, sms_number')
    .or(`telnyx_phone.eq.${safeTo},sms_number.eq.${safeTo}`)
    .order('id', { ascending: true })
    .limit(2)

  if (error) {
    throw new Error(`VOICE_AGENT_TENANT_LOOKUP_ERROR to=${to} error=${error.message}`)
  }

  if (matches && matches.length > 1) {
    console.error(`[voice] telnyx number ${to} matches ${matches.length} tenants — routing to ${matches[0].name}`)
  }

  const tenant = matches?.[0] || null
  if (!tenant || !tenantServesSite(tenant.status)) return null
  return tenant
}
