/**
 * Runs when a tenant saves a vendor key in Settings — verifies it live
 * against the vendor's own API instead of leaving verification as a manual
 * "Activate" step. On success, marks the matching onboarding_tasks row
 * 'completed' so activation readiness reflects a real, working integration
 * instead of the mere presence of a value.
 *
 * Stripe additionally self-derives stripe_account_id from the key itself
 * (stripe.accounts.retrieve() with no id returns the account owning the
 * key) — settings/route.ts blocks stripe_account_id from direct user input
 * for exactly this reason; this is the one legitimate server-side writer.
 */
import Stripe from 'stripe'
import { supabaseAdmin } from './supabase'
import { verifyTelnyxNumber } from './onboarding-verify'
import { decryptSecret } from './secret-crypto'

export interface AutoVerifyResult {
  warnings: string[]
}

async function markTaskCompleted(tenantId: string, taskType: string, detail: string): Promise<void> {
  const { error } = await supabaseAdmin.from('onboarding_tasks').upsert(
    { tenant_id: tenantId, task_type: taskType, status: 'completed', notes: detail },
    { onConflict: 'tenant_id,task_type' },
  )
  if (error) console.error(`[integration-auto-verify] failed to mark ${taskType} completed:`, error)
}

async function verifyAndActivateStripe(tenantId: string, stripeApiKey: string): Promise<string | null> {
  if (!stripeApiKey) return null
  try {
    const stripe = new Stripe(stripeApiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
    const account = await stripe.accounts.retrieve()
    // Server-side write only — bypasses the systemOnlyFields block in
    // settings/route.ts, which exists to stop a USER from spoofing an
    // arbitrary account id, not to stop the system deriving the real one.
    await supabaseAdmin.from('tenants').update({ stripe_account_id: account.id }).eq('id', tenantId)
    await markTaskCompleted(tenantId, 'create_stripe', `Verified live 2026-08-03: ${account.id}`)
    return null
  } catch (e) {
    return `Stripe key saved but couldn't verify: ${e instanceof Error ? e.message : 'unknown error'}`
  }
}

async function verifyAndActivateTelnyx(tenantId: string, telnyxApiKey: string, telnyxPhone: string): Promise<string | null> {
  if (!telnyxApiKey || !telnyxPhone) return null
  const result = await verifyTelnyxNumber(telnyxApiKey, telnyxPhone)
  if (!result.ok) return `Telnyx saved but couldn't verify: ${result.detail}`
  await markTaskCompleted(tenantId, 'create_telnyx', result.detail)
  return null
}

/**
 * changedFields: the raw (pre-encryption) values the caller just submitted
 * for any of stripe_api_key/telnyx_api_key/telnyx_phone. currentPhone/
 * currentKey: already-saved values to fall back on when only one half of a
 * pair (e.g. just the phone, key already on file) changed this save.
 */
export async function autoVerifyIntegrations(
  tenantId: string,
  changed: { stripe_api_key?: string; telnyx_api_key?: string; telnyx_phone?: string },
  current: { telnyx_api_key?: string | null; telnyx_phone?: string | null },
): Promise<AutoVerifyResult> {
  const warnings: string[] = []

  if (changed.stripe_api_key !== undefined && changed.stripe_api_key) {
    const w = await verifyAndActivateStripe(tenantId, changed.stripe_api_key)
    if (w) warnings.push(w)
  }

  if (changed.telnyx_api_key !== undefined || changed.telnyx_phone !== undefined) {
    // changed.* is raw plaintext just submitted this request; current.* came
    // from the DB and may be encrypted (v1: prefix) — decryptSecret() passes
    // already-plaintext values through unchanged, so this is safe either way.
    const key = changed.telnyx_api_key ?? (current.telnyx_api_key ? decryptSecret(current.telnyx_api_key) : '')
    const phone = changed.telnyx_phone ?? current.telnyx_phone ?? ''
    if (key && phone) {
      const w = await verifyAndActivateTelnyx(tenantId, key, phone)
      if (w) warnings.push(w)
    }
  }

  return { warnings }
}
