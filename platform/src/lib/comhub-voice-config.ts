/**
 * Resolves the Telnyx voice/softphone configuration for a tenant.
 *
 * Per-tenant first (tenants.telnyx_* columns), falling back to the platform
 * env vars when a tenant hasn't configured its own voice account. This keeps
 * the ComHub softphone multi-tenant: each tenant dials through ITS OWN Telnyx
 * account once configured, but tenants without their own config keep using the
 * shared platform account (no behavior change until they fill the fields).
 */
import { supabaseAdmin } from './supabase'
import { decryptSecret } from './secret-crypto'

export interface TenantVoiceConfig {
  apiKey: string
  voiceConnectionId: string
  telephonyCredentialId: string
  credentialConnectionId: string
  fromNumber: string
}

const ENV = {
  apiKey: (process.env.TELNYX_API_KEY || '').trim(),
  voiceConnectionId: (process.env.TELNYX_VOICE_CONNECTION_ID || '').trim(),
  telephonyCredentialId: (process.env.TELNYX_TELEPHONY_CREDENTIAL_ID || '').trim(),
  credentialConnectionId: (process.env.TELNYX_CREDENTIAL_CONNECTION_ID || '').trim(),
  fromNumber: (process.env.TELNYX_FROM_NUMBER || '+18883164019').trim(),
}

export async function resolveTenantVoiceConfig(
  tenantId: string | null | undefined,
): Promise<TenantVoiceConfig> {
  if (!tenantId) return { ...ENV }

  const { data } = await supabaseAdmin
    .from('tenants')
    .select(
      'telnyx_api_key, telnyx_phone, telnyx_voice_connection_id, telnyx_telephony_credential_id, telnyx_credential_connection_id',
    )
    .eq('id', tenantId)
    .single()

  if (!data) return { ...ENV }

  const tenantApiKey = data.telnyx_api_key ? decryptSecret(data.telnyx_api_key) : ''

  return {
    apiKey: tenantApiKey || ENV.apiKey,
    voiceConnectionId: (data.telnyx_voice_connection_id as string) || ENV.voiceConnectionId,
    telephonyCredentialId:
      (data.telnyx_telephony_credential_id as string) || ENV.telephonyCredentialId,
    credentialConnectionId:
      (data.telnyx_credential_connection_id as string) || ENV.credentialConnectionId,
    fromNumber: (data.telnyx_phone as string) || ENV.fromNumber,
  }
}
