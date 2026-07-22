/**
 * Resolves a tenant's xAI API key (for the prospect-qualification voice agent
 * and any future xAI usage). Same per-tenant encrypted-column pattern as
 * comhub-voice-config.ts's Telnyx resolver — plain TEXT column, encrypted at
 * rest via encryptSecret()/decryptSecret() in application code, not the DB layer.
 */
import { supabaseAdmin } from './supabase'
import { decryptSecret } from './secret-crypto'

export async function resolveTenantXaiKey(tenantId: string | null | undefined): Promise<string> {
  if (!tenantId) return ''
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('xai_api_key')
    .eq('id', tenantId)
    .single()
  if (!data?.xai_api_key) return ''
  return decryptSecret(data.xai_api_key)
}
