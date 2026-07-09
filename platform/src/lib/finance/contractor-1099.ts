/**
 * 1099-NEC data layer for the year-end package.
 *
 * Computes what each CONTRACTOR (HR employment_type = contractor_1099) was
 * actually paid during a calendar year. The IRS threshold for a 1099-NEC is
 * $600 in nonemployee compensation.
 *
 * Source of truth: bookings.team_member_pay for jobs marked team_member_paid,
 * with team_member_paid_at in the year. That is the real "what we paid this
 * person" signal in Full Loop today (the payroll_payments POST path is not yet
 * wired to a UI). W-2 employees are intentionally excluded — Full Loop does not
 * hold wage/withholding data, so their W-2s come from the tenant's payroll
 * provider (the package says so rather than inventing numbers).
 *
 * Global per the platform rule: every query is tenant-scoped.
 */
import { supabaseAdmin } from '../supabase'

/** IRS 1099-NEC reporting threshold. */
export const NEC_THRESHOLD_CENTS = 60000

export interface Contractor1099Row {
  team_member_id: string
  name: string
  email: string | null
  paid_cents: number
  jobs: number
  meets_threshold: boolean
}

export interface Contractor1099Summary {
  year: number
  rows: Contractor1099Row[]
  reportable: Contractor1099Row[]
  total_paid_cents: number
  reportable_count: number
}

interface PaidBookingRow {
  team_member_id: string | null
  team_member_pay: number | null
  team_members: { name: string | null; email: string | null } | null
  hr_employment_type?: string | null
}

/**
 * Per-contractor pay for [year], from paid jobs (team_member_paid_at in year).
 * Only 1099 contractors are included; W-2 employees are filtered out via their
 * HR profile. Contractors with no HR profile default to 1099 (the common case).
 */
export async function computeContractor1099(
  tenantId: string,
  year: number,
): Promise<Contractor1099Summary> {
  const from = `${year}-01-01T00:00:00Z`
  const to = `${year}-12-31T23:59:59Z`

  // W-2 team members to exclude (HR profile says employee_w2).
  const { data: w2Profiles } = await supabaseAdmin
    .from('hr_employee_profiles')
    .select('team_member_id, employment_type')
    .eq('tenant_id', tenantId)
    .eq('employment_type', 'employee_w2')
  const w2Ids = new Set((w2Profiles || []).map((p) => p.team_member_id as string))

  const byMember = new Map<string, Contractor1099Row>()
  const PAGE = 1000
  let offset = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('team_member_id, team_member_pay, team_members!bookings_team_member_id_fkey(name, email)')
      .eq('tenant_id', tenantId)
      .eq('team_member_paid', true)
      .gte('team_member_paid_at', from)
      .lte('team_member_paid_at', to)
      .not('team_member_id', 'is', null)
      .not('team_member_pay', 'is', null)
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    const rows = (data || []) as unknown as PaidBookingRow[]

    for (const b of rows) {
      const id = b.team_member_id
      if (!id || w2Ids.has(id)) continue
      const pay = Math.max(0, Math.round(Number(b.team_member_pay) || 0))
      if (pay <= 0) continue
      const tm = b.team_members
      const cur = byMember.get(id) || {
        team_member_id: id,
        name: tm?.name || 'Unnamed contractor',
        email: tm?.email || null,
        paid_cents: 0,
        jobs: 0,
        meets_threshold: false,
      }
      cur.paid_cents += pay
      cur.jobs += 1
      byMember.set(id, cur)
    }

    if (rows.length < PAGE) break
    offset += PAGE
  }

  const all = Array.from(byMember.values())
    .map((r) => ({ ...r, meets_threshold: r.paid_cents >= NEC_THRESHOLD_CENTS }))
    .sort((a, b) => b.paid_cents - a.paid_cents)
  const reportable = all.filter((r) => r.meets_threshold)

  return {
    year,
    rows: all,
    reportable,
    total_paid_cents: all.reduce((s, r) => s + r.paid_cents, 0),
    reportable_count: reportable.length,
  }
}
