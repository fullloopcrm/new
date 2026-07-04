/**
 * Per-tenant Anthropic client resolution.
 *
 * Single source of truth for "which Anthropic key does this call use?".
 * Mirrors how resend/telnyx keys resolve elsewhere (e.g. notify.ts): the
 * tenant's own key if they've set one, otherwise the platform-billed key
 * from ANTHROPIC_API_KEY.
 *
 * The stored key may be encrypted (v1: envelope) or legacy plaintext —
 * decryptSecret() tolerates both, returning plaintext unchanged.
 *
 * Platform-internal callers that are NOT tenant-scoped (Jefe, the
 * anthropic-health cron) intentionally do NOT use this — they construct
 * `new Anthropic()` directly against the platform key.
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase'
import { decryptSecret } from './secret-crypto'

/**
 * Turn a raw stored key value (encrypted or plaintext, possibly null) into an
 * Anthropic client. Use this at call sites that ALREADY fetched the tenant row
 * so we don't do a second DB round-trip.
 *
 * @param storedKey the tenants.anthropic_api_key column value, as read from DB
 */
export function anthropicFromStoredKey(storedKey: string | null | undefined): Anthropic {
  const apiKey = storedKey ? decryptSecret(storedKey) : null
  return apiKey ? new Anthropic({ apiKey }) : new Anthropic()
}

/**
 * Fetch the tenant's stored Anthropic key and return it decrypted, or null if
 * the tenant hasn't set one (caller falls back to platform key).
 */
export async function resolveAnthropicKey(tenantId: string): Promise<string | null> {
  if (!tenantId) return null
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('anthropic_api_key')
    .eq('id', tenantId)
    .single()
  const stored = data?.anthropic_api_key as string | null | undefined
  return stored ? decryptSecret(stored) : null
}

/**
 * Resolve an Anthropic client for a tenant: their key if set, platform key
 * otherwise. Does one DB read; prefer anthropicFromStoredKey() when the tenant
 * row is already in hand.
 */
export async function resolveAnthropic(tenantId: string): Promise<Anthropic> {
  const apiKey = await resolveAnthropicKey(tenantId)
  return apiKey ? new Anthropic({ apiKey }) : new Anthropic()
}
