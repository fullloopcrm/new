import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { getSettings } from '@/lib/settings'
import { seedHrDefaults } from '@/lib/hr'
import { getTenantRatingTrends } from '@/lib/team-rating-trend'

// Explicit column list, NOT select('*') -- excludes the tax_* columns
// (tax_classification/tax_address/tax_city/tax_state/tax_zip/tax_ssn_last4/
// tax_ssn_encrypted/tax_ein/tax_business_name). Those are real 1099/payroll
// PII that only finance/payroll-prep (gated on 'finance.view') needs; this
// roster endpoint is reachable by anyone with 'team.view', which every role
// including 'staff' has by default (rbac.ts) -- select('*') was shipping
// SSN-adjacent fields to the browser for every team-roster page load with no
// legitimate consumer (grepped src/app/dashboard for real usage: only
// finance/reports/page.tsx reads these fields, via the finance-gated
// payroll-prep endpoint, not this one). Found + fixed 2026-08-01 while
// building the pii-05 checkpoint; no prod data changed, response-shape only.
const TEAM_ROSTER_COLUMNS =
  'id, tenant_id, name, email, phone, pin, role, status, hourly_rate, pay_rate, notes, ' +
  'push_subscription, preferred_language, created_at, updated_at, service_zones, has_car, ' +
  'max_travel_minutes, home_latitude, home_longitude, home_by_time, stripe_account_id, ' +
  'sms_consent, labor_only, photo_url, address, calendar_color, priority, schedule, ' +
  'unavailable_dates, working_days, working_start, working_end, max_jobs_per_day, ' +
  'notification_preferences, avatar_url, lat, lng, stripe_ready_at, avg_rating, rating_count, ' +
  'active, welcome_email_sent_at, welcome_sms_sent_at, retention_rate, clients_served, ' +
  'clients_retained, retention_updated_at'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data, error } = await tenantDb(tenantId)
      .from('team_members')
      .select(TEAM_ROSTER_COLUMNS)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Smart-scheduling upgrade spec, Part 4 item 3 — same rating-trend signal
    // as the individual profile page, here for every card in one query
    // (getTenantRatingTrends) instead of looping the single-member lookup,
    // which would be an N+1 across the whole roster.
    const trends = await getTenantRatingTrends(tenantId)
    const team = (data || []).map((m) => {
      const trend = trends.get(m.id as string)
      return {
        ...m,
        trend_rating_count: trend?.trend_rating_count ?? 0,
        trend_avg_rating: trend?.trend_avg_rating ?? null,
      }
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
