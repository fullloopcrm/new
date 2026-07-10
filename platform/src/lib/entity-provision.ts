/**
 * Default-entity provisioning.
 *
 * Every tenant must own exactly one default `entities` row — it's the legal /
 * accounting unit finance rows hang off (entity_id) and where legal_name / EIN /
 * fiscal-year live. The Stage-0 audit found 0/21 live tenants had one: migration
 * 034 was a one-time backfill, and no creation path seeds it, so finance and
 * identity data had nowhere to land. This helper closes that gap and is called
 * from activation (the funnel every creation door should pass through).
 *
 * Idempotent: no-ops when a default entity already exists.
 */
import { supabaseAdmin } from './supabase'

/** Ensure the tenant has a default entities row. Returns true if it created one. */
export async function ensureDefaultEntity(tenantId: string, name: string): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from('entities')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_default', true)
    .maybeSingle()
  if (existing) return false

  const { error } = await supabaseAdmin
    .from('entities')
    .insert({ tenant_id: tenantId, name: name?.trim() || 'Main', is_default: true, active: true })
  if (error) throw error
  return true
}
