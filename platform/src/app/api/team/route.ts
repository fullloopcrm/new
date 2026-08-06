import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission, overridesFor } from '@/lib/require-permission'
import { hasPermission } from '@/lib/rbac'
import { tenantDb } from '@/lib/tenant-db'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { getSettings } from '@/lib/settings'
import { seedHrDefaults } from '@/lib/hr'
import { getTenantRatingTrends } from '@/lib/team-rating-trend'

const COMPENSATION_FIELDS = ['pay_rate', 'hourly_rate', 'employment_type'] as const

export async function GET() {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant

    const { data, error } = await tenantDb(tenantId)
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const canSeeCompensation = hasPermission(tenant.role, 'team.compensation', overridesFor(tenant))

    // Smart-scheduling upgrade spec, Part 4 item 3 — same rating-trend signal
    // as the individual profile page, here for every card in one query
    // (getTenantRatingTrends) instead of looping the single-member lookup,
    // which would be an N+1 across the whole roster.
    const trends = await getTenantRatingTrends(tenantId)
    const team = (data || []).map((m) => {
      const trend = trends.get(m.id as string)
      const row: Record<string, unknown> = {
        ...m,
        trend_rating_count: trend?.trend_rating_count ?? 0,
        trend_avg_rating: trend?.trend_avg_rating ?? null,
      }
      if (!canSeeCompensation) {
        for (const f of COMPENSATION_FIELDS) delete row[f]
      }
      return row
    })

    return NextResponse.json({ team })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('team.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      email: { type: 'email' },
      phone: { type: 'phone' },
      role: { type: 'string', max: 100 },
      hourly_rate: { type: 'number', min: 0 },
      pay_rate: { type: 'number', min: 0 },
      working_days: { type: 'array' },
      avatar_url: { type: 'string', max: 1000 },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })

    // Apply tenant defaults when caller didn't provide values explicitly.
    const settings = await getSettings(tenantId)
    const fieldsWithDefaults = { ...fields! } as Record<string, unknown>
    if (fieldsWithDefaults.pay_rate == null && settings.default_pay_rate > 0) {
      fieldsWithDefaults.pay_rate = settings.default_pay_rate
    }
    if (fieldsWithDefaults.hourly_rate == null && settings.default_pay_rate > 0) {
      fieldsWithDefaults.hourly_rate = settings.default_pay_rate
    }
    if (!Array.isArray(fieldsWithDefaults.working_days) && settings.default_working_days?.length) {
      fieldsWithDefaults.working_days = settings.default_working_days
    }

    // Auto-generate 4-digit PIN (cryptographically random).
    // The DB enforces uniqueness via idx_team_members_tenant_pin_unique (migration 014);
    // a collision returns a 500 and the caller retries.
    const crypto = await import('node:crypto')
    const pin = String(1000 + crypto.randomInt(0, 9000))

    const { data, error } = await tenantDb(tenantId)
      .from('team_members')
      .insert({ ...fieldsWithDefaults, pin })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.created', entityType: 'team_member', entityId: data.id, details: { name: fields!.name } })

    // Best-effort: give the new hire an HR profile (and backfill any other
    // un-profiled members on this tenant while we're at it — seedHrDefaults
    // is idempotent/tenant-wide, not scoped to just this one member). Never
    // block team-member creation on HR bookkeeping.
    try {
      await seedHrDefaults(tenantId)
    } catch (hrError) {
      console.error('seedHrDefaults after team.created', hrError)
    }

    return NextResponse.json({ member: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
