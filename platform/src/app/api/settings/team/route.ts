import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

export type TeamConfig = {
  roles: string[]
  pay_rates: { label: string; amount: number }[]
  default_working_days: number[]
}

const DEFAULT_TEAM_CONFIG: TeamConfig = {
  roles: ['worker', 'lead', 'manager'],
  pay_rates: [],
  default_working_days: [1, 2, 3, 4, 5],
}

const TEAM_CONFIG_KEY = '__team_config'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('setup_progress')
      .eq('id', tenantId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sp = (tenant?.setup_progress || {}) as Record<string, unknown>
    const stored = sp[TEAM_CONFIG_KEY] as Partial<TeamConfig> | undefined
    const config: TeamConfig = {
      roles: stored?.roles || DEFAULT_TEAM_CONFIG.roles,
      pay_rates: stored?.pay_rates || DEFAULT_TEAM_CONFIG.pay_rates,
      default_working_days: stored?.default_working_days || DEFAULT_TEAM_CONFIG.default_working_days,
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

    // Validate the incoming config
    const config: TeamConfig = {
      roles: Array.isArray(body.roles) ? body.roles.filter((r: unknown) => typeof r === 'string' && r.trim()) : DEFAULT_TEAM_CONFIG.roles,
      pay_rates: Array.isArray(body.pay_rates)
        ? body.pay_rates.filter((r: { label?: string; amount?: number }) => r.label && typeof r.amount === 'number' && r.amount >= 0)
        : DEFAULT_TEAM_CONFIG.pay_rates,
      default_working_days: Array.isArray(body.default_working_days)
        ? body.default_working_days.filter((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6)
        : DEFAULT_TEAM_CONFIG.default_working_days,
    }

    // Ensure default roles are always present
    const defaultRoles = ['worker', 'lead', 'manager']
    for (const dr of defaultRoles) {
      if (!config.roles.includes(dr)) {
        config.roles.unshift(dr)
      }
    }

    // Read current setup_progress, merge in team config
    const { data: current } = await supabaseAdmin
      .from('tenants')
      .select('setup_progress')
      .eq('id', tenantId)
      .single()

    const sp = (current?.setup_progress || {}) as Record<string, unknown>
    sp[TEAM_CONFIG_KEY] = config

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ setup_progress: sp })
      .eq('id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ config })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
