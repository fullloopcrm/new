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

    // Merge into selena_config (canonical store), preserve other keys.
    const { data: current } = await supabaseAdmin
      .from('tenants')
      .select('selena_config')
      .eq('id', tenantId)
      .single()

    const next = {
      ...((current?.selena_config || {}) as Record<string, unknown>),
      team_roles: config.roles,
      team_pay_rates: config.pay_rates,
      default_working_days: config.default_working_days,
    }

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ selena_config: next })
      .eq('id', tenantId)

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
