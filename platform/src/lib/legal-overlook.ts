// Shared Legal Overlook matching logic -- trade+state scoped tips matched
// against a tenant's own structured data (never comms/free text; see
// src/app/api/cron/legal-overlook-check/route.ts for why). Used by the daily
// cron (all active tenants) AND by tenant activation (just the one tenant,
// so a brand-new tenant doesn't wait up to 24h for the first daily run).
import { supabaseAdmin } from './supabase'
import { mapIndustry } from './industry-presets'

type Compliance = {
  license_number?: string | null
  license_state?: string | null
  license_expiry?: string | null
  insurance_carrier?: string | null
  insurance_coverage?: string | null
}

type Tip = { id: string; trade_key: string | null; state_code: string | null }
type Trigger = { id: string; tip_id: string; trigger_type: 'license_expiring' | 'license_missing' | 'insurance_expiring' | 'insurance_missing' | 'always'; days_before: number | null }

const EXPIRY_WINDOW_DAYS = 30

function daysUntil(dateStr: string): number {
  const ms = new Date(`${dateStr}T00:00:00Z`).getTime() - Date.now()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

function tipApplies(tip: Tip, tradeKey: string, stateCode: string | null): boolean {
  if (tip.trade_key && tip.trade_key !== tradeKey) return false
  if (tip.state_code && tip.state_code !== stateCode) return false
  return true
}

function triggerFires(trigger: Trigger, compliance: Compliance): boolean {
  switch (trigger.trigger_type) {
    case 'always':
      return true
    case 'license_missing':
      return !compliance.license_number
    case 'insurance_missing':
      return !compliance.insurance_carrier
    case 'license_expiring': {
      if (!compliance.license_expiry) return false
      const days = daysUntil(compliance.license_expiry)
      return days >= 0 && days <= (trigger.days_before ?? EXPIRY_WINDOW_DAYS)
    }
    case 'insurance_expiring': {
      if (!compliance.insurance_coverage) return false
      const days = daysUntil(compliance.insurance_coverage)
      return days >= 0 && days <= (trigger.days_before ?? EXPIRY_WINDOW_DAYS)
    }
    default:
      return false
  }
}

// tenantIds omitted → every active tenant (daily cron). Passed → just those
// tenants (activation trigger), regardless of their status column, since the
// caller already knows the tenant just went active.
export async function runLegalOverlookCheck(tenantIds?: string[]): Promise<{ surfaced: number }> {
  const tenantsQuery = supabaseAdmin.from('tenants').select('id, industry, compliance')
  const { data: tenants } = tenantIds?.length
    ? await tenantsQuery.in('id', tenantIds)
    : await tenantsQuery.eq('status', 'active')

  const [{ data: tips }, { data: triggers }] = await Promise.all([
    supabaseAdmin.from('legal_tips').select('id, trade_key, state_code').eq('is_active', true),
    supabaseAdmin.from('legal_tip_triggers').select('id, tip_id, trigger_type, days_before'),
  ])

  if (!tips?.length || !triggers?.length || !tenants?.length) {
    return { surfaced: 0 }
  }

  const { data: entities } = await supabaseAdmin
    .from('entities')
    .select('tenant_id, state')
    .in('tenant_id', tenants.map((t) => t.id))
    .eq('is_default', true)
  const entityStateByTenant = new Map((entities || []).map((e) => [e.tenant_id as string, e.state as string | null]))

  const triggersByTip = new Map<string, Trigger[]>()
  for (const t of triggers as Trigger[]) {
    const list = triggersByTip.get(t.tip_id) || []
    list.push(t)
    triggersByTip.set(t.tip_id, list)
  }

  const rows: { tenant_id: string; tip_id: string; trigger_type: string }[] = []

  for (const tenant of tenants) {
    const tradeKey = mapIndustry(tenant.industry as string | null)
    const compliance = (tenant.compliance as Compliance) || {}
    const stateCode = entityStateByTenant.get(tenant.id) || compliance.license_state || null

    for (const tip of tips as Tip[]) {
      if (!tipApplies(tip, tradeKey, stateCode)) continue
      const tipTriggers = triggersByTip.get(tip.id) || []
      const matched = tipTriggers.find((trig) => triggerFires(trig, compliance))
      if (matched) {
        rows.push({ tenant_id: tenant.id, tip_id: tip.id, trigger_type: matched.trigger_type })
      }
    }
  }

  if (!rows.length) return { surfaced: 0 }

  await supabaseAdmin
    .from('legal_tip_notifications')
    .upsert(rows, { onConflict: 'tenant_id,tip_id', ignoreDuplicates: true })

  return { surfaced: rows.length }
}
