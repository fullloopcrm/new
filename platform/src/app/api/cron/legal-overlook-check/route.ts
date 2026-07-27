/**
 * Legal Overlook — daily check that surfaces attorney-approved static tips
 * on the dashboard when a tenant's own structured data matches a trigger
 * (license expiring/missing, insurance expiring/missing). Deliberately does
 * NOT read comms/messages/free text — that would require interpreting
 * content live, which is the exact liability this feature is built to avoid.
 * Tips are scoped to the tenant's actual trade (tenants.industry) AND actual
 * business-address state (entities.state) — a NY plumber only ever sees
 * NY + plumbing tips, never another trade's or another state's.
 * See src/app/dashboard/legal/page.tsx and migrations/2026_07_27_legal_overlook.sql.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { mapIndustry } from '@/lib/industry-presets'

export const maxDuration = 120

const EXPIRY_WINDOW_DAYS = 30

type Compliance = {
  license_number?: string | null
  license_state?: string | null
  license_expiry?: string | null
  insurance_carrier?: string | null
  insurance_coverage?: string | null
}

type Tip = {
  id: string
  trade_key: string | null
  state_code: string | null
}

type Trigger = {
  id: string
  tip_id: string
  trigger_type: 'license_expiring' | 'license_missing' | 'insurance_expiring' | 'insurance_missing' | 'always'
  days_before: number | null
}

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
      // insurance_coverage doubles as the expiry date field on the compliance blob.
      if (!compliance.insurance_coverage) return false
      const days = daysUntil(compliance.insurance_coverage)
      return days >= 0 && days <= (trigger.days_before ?? EXPIRY_WINDOW_DAYS)
    }
    default:
      return false
  }
}

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const [{ data: tips }, { data: triggers }, { data: tenants }] = await Promise.all([
    supabaseAdmin.from('legal_tips').select('id, trade_key, state_code').eq('is_active', true),
    supabaseAdmin.from('legal_tip_triggers').select('id, tip_id, trigger_type, days_before'),
    supabaseAdmin.from('tenants').select('id, industry, compliance').eq('status', 'active'),
  ])

  if (!tips?.length || !triggers?.length || !tenants?.length) {
    return NextResponse.json({ success: true, surfaced: 0 })
  }

  // Business address state (entities.state) is the reliable "which state is
  // this tenant in" signal — every tenant fills in an address, but licensing
  // is optional. compliance.license_state is only a fallback for tenants
  // whose default entity has no state on file yet.
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

  if (!rows.length) {
    return NextResponse.json({ success: true, surfaced: 0 })
  }

  // Unique (tenant_id, tip_id) means a tip only ever surfaces once per
  // tenant — re-running the cron daily never re-notifies or nags.
  const { error } = await supabaseAdmin
    .from('legal_tip_notifications')
    .upsert(rows, { onConflict: 'tenant_id,tip_id', ignoreDuplicates: true })

  if (error) {
    console.error('[legal-overlook-check] insert failed:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, surfaced: rows.length })
}
