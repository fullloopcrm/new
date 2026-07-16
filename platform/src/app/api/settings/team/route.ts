import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { clearSettingsCache, getSettings } from '@/lib/settings'

export type TeamConfig = {
  roles: string[]
  pay_rates: { label: string; amount: number }[]
  default_working_days: number[]
}

const DEFAULT_ROLES = ['worker', 'lead', 'manager']

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const settings = await getSettings(tenantId)

    const config: TeamConfig = {
      roles: settings.team_roles?.length ? settings.team_roles : DEFAULT_ROLES,
      pay_rates: settings.team_pay_rates || [],
      default_working_days: settings.default_working_days || [1, 2, 3, 4, 5],
    }

    return NextResponse.json({ config })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    const config: TeamConfig = {
      roles: Array.isArray(body.roles) ? body.roles.filter((r: unknown) => typeof r === 'string' && r.trim()) : DEFAULT_ROLES,
      pay_rates: Array.isArray(body.pay_rates)
        ? body.pay_rates.filter((r: { label?: string; amount?: number }) => r.label && typeof r.amount === 'number' && r.amount >= 0)
        : [],
      default_working_days: Array.isArray(body.default_working_days)
        ? body.default_working_days.filter((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6)
        : [1, 2, 3, 4, 5],
    }

    // Ensure built-in roles always present
    for (const dr of DEFAULT_ROLES) {
      if (!config.roles.includes(dr)) {
        config.roles.unshift(dr)
      }
    }

    // Merge into selena_config (canonical store), preserve other keys. Atomic
    // Postgres-side merge (migrations/2026_07_16_tenant_jsonb_merge_atomic.sql)
    // instead of a JS read-merge-write -- a team-config save racing a
    // persona/service-area save via admin/businesses PUT (or another tab's
    // team save) would otherwise both read the same stale selena_config blob,
    // and whichever write landed second would silently revert the other's
    // change with no error to either side.
    const { error } = await supabaseAdmin.rpc('merge_tenant_selena_config', {
      p_tenant_id: tenantId,
      p_patch: {
        team_roles: config.roles,
        team_pay_rates: config.pay_rates,
        default_working_days: config.default_working_days,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    clearSettingsCache(tenantId)

    return NextResponse.json({ config })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
