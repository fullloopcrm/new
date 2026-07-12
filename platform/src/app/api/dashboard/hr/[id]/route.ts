// Single-employee HR read + profile update. `id` is the team_member_id.
// GET  → team_member basics + HR profile + documents + notes + the tenant's
//        document-requirement template (so the UI can show what's still missing).
// PATCH → upsert the HR profile (create it if the member has none yet).
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import type { EmploymentType, HrStatus, CompType, PayPeriod } from '@/lib/hr'

const EMPLOYMENT_TYPES: EmploymentType[] = ['contractor_1099', 'employee_w2']
const HR_STATUSES: HrStatus[] = ['active', 'on_leave', 'terminated']
const COMP_TYPES: CompType[] = ['per_job', 'hourly', 'salary']
const PAY_PERIODS: PayPeriod[] = ['per_job', 'weekly', 'biweekly', 'semimonthly', 'monthly']

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { tenant, error: permErr } = await requirePermission('team.view')
  if (permErr) return permErr
  try {
    const { tenantId } = tenant
    const db = tenantDb(tenantId)
    const { id } = await ctx.params

    const { data: member, error: memberErr } = await db
      .from('team_members')
      .select('id, name, email, phone, role, active, address, photo_url, stripe_account_id, stripe_ready_at')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle()
    if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })
    if (!member) return NextResponse.json({ error: 'employee not found' }, { status: 404 })

    const [profileRes, docsRes, notesRes, reqsRes] = await Promise.all([
      db.from('hr_employee_profiles').select('*').eq('tenant_id', tenantId).eq('team_member_id', id).maybeSingle(),
      db.from('hr_documents').select('*').eq('tenant_id', tenantId).eq('team_member_id', id).order('created_at', { ascending: true }),
      db.from('hr_notes').select('*').eq('tenant_id', tenantId).eq('team_member_id', id).order('created_at', { ascending: false }).limit(100),
      db.from('hr_document_requirements').select('*').eq('tenant_id', tenantId).order('sort_order', { ascending: true }),
    ])

    return NextResponse.json({
      member,
      profile: profileRes.data ?? null,
      documents: docsRes.data ?? [],
      notes: notesRes.data ?? [],
      requirements: reqsRes.data ?? [],
      stripe_connected: !!(member.stripe_account_id && member.stripe_ready_at),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface ProfilePatch {
  employment_type?: EmploymentType
  hr_status?: HrStatus
  comp_type?: CompType
  pay_period?: PayPeriod
  pay_rate_cents?: number | null
  hire_date?: string | null
  termination_date?: string | null
  title?: string | null
  department?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  date_of_birth?: string | null
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { tenant, error: permErr } = await requirePermission('team.edit')
  if (permErr) return permErr
  try {
    const { tenantId } = tenant
    const db = tenantDb(tenantId)
    const { id } = await ctx.params

    // Confirm the member belongs to this tenant before writing anything.
    const { data: member } = await db
      .from('team_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'employee not found' }, { status: 404 })

    let body: ProfilePatch
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    // Validate enum fields; reject unknown values rather than silently coercing.
    if (body.employment_type && !EMPLOYMENT_TYPES.includes(body.employment_type))
      return NextResponse.json({ error: 'invalid employment_type' }, { status: 400 })
    if (body.hr_status && !HR_STATUSES.includes(body.hr_status))
      return NextResponse.json({ error: 'invalid hr_status' }, { status: 400 })
    if (body.comp_type && !COMP_TYPES.includes(body.comp_type))
      return NextResponse.json({ error: 'invalid comp_type' }, { status: 400 })
    if (body.pay_period && !PAY_PERIODS.includes(body.pay_period))
      return NextResponse.json({ error: 'invalid pay_period' }, { status: 400 })
    if (body.pay_rate_cents != null && (!Number.isInteger(body.pay_rate_cents) || body.pay_rate_cents < 0))
      return NextResponse.json({ error: 'invalid pay_rate_cents' }, { status: 400 })

    // Only assign keys the caller actually sent, so a partial PATCH never wipes
    // unrelated fields.
    const allowed: (keyof ProfilePatch)[] = [
      'employment_type', 'hr_status', 'comp_type', 'pay_period', 'pay_rate_cents',
      'hire_date', 'termination_date', 'title', 'department',
      'emergency_contact_name', 'emergency_contact_phone', 'date_of_birth',
    ]
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }

    const upsertRow = {
      tenant_id: tenantId,
      team_member_id: id,
      ...patch,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await db
      .from('hr_employee_profiles')  // tenant-scope-ok: insert payload carries tenant_id (built above)
      .upsert(upsertRow, { onConflict: 'team_member_id' })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, profile: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
