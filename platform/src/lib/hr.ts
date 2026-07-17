/**
 * HR foundation helpers.
 *
 * HR is the connective people-layer over the existing team_members roster. This
 * module owns: the employee-profile augmentation, the per-tenant document
 * requirement template (where trades differ — as data, not code), and the
 * roster read that fuses team_members + hr_employee_profiles + Stripe Connect
 * status into one employee view for the dashboard.
 *
 * Global, per the platform rule: one codebase, every query tenant-scoped.
 */
import { supabaseAdmin } from './supabase'
import type { IndustryKey } from './industry-presets'

export type EmploymentType = 'contractor_1099' | 'employee_w2'
export type HrStatus = 'active' | 'on_leave' | 'terminated'
export type CompType = 'per_job' | 'hourly' | 'salary'
export type PayPeriod = 'per_job' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
export type DocAppliesTo = 'all' | EmploymentType

export interface HrDocumentRequirement {
  doc_type: string
  label: string
  applies_to: DocAppliesTo
  required: boolean
  has_expiry: boolean
  sort_order: number
}

/**
 * Baseline document requirements every tenant starts with. Trade-specific docs
 * (CDL, pesticide applicator license, etc.) are added per-tenant on top of this
 * as extra rows — never by forking code.
 *
 * W-9 → 1099 contractors. W-4 + I-9 → W-2 employees. The rest apply to all.
 */
export const DEFAULT_HR_DOC_REQUIREMENTS: HrDocumentRequirement[] = [
  { doc_type: 'w9', label: 'W-9 (Taxpayer ID)', applies_to: 'contractor_1099', required: true, has_expiry: false, sort_order: 10 },
  { doc_type: 'w4', label: 'W-4 (Withholding)', applies_to: 'employee_w2', required: true, has_expiry: false, sort_order: 20 },
  { doc_type: 'i9', label: 'I-9 (Work Authorization)', applies_to: 'employee_w2', required: true, has_expiry: false, sort_order: 30 },
  { doc_type: 'direct_deposit', label: 'Direct Deposit / Payout Setup', applies_to: 'all', required: true, has_expiry: false, sort_order: 40 },
  { doc_type: 'id', label: 'Government-Issued ID', applies_to: 'all', required: true, has_expiry: true, sort_order: 50 },
  { doc_type: 'signed_agreement', label: 'Signed Work Agreement', applies_to: 'all', required: true, has_expiry: false, sort_order: 60 },
]

/**
 * Ordered expiry-reminder milestones for the (future) auto-nudge engine. Each
 * is written to hr_document_reminders at most once per document (UNIQUE
 * constraint), so nudges never double-send. 'missing' covers a required doc that
 * was never submitted.
 */
export const HR_REMINDER_MILESTONES = ['expiry_30d', 'expiry_14d', 'expiry_7d', 'expiry_1d', 'missing'] as const
export type HrReminderMilestone = (typeof HR_REMINDER_MILESTONES)[number]

/**
 * Trade-specific compliance docs layered on top of DEFAULT_HR_DOC_REQUIREMENTS
 * for trades where a real license/certification is standard industry
 * practice (CDL for heavy-truck driving trades, pesticide applicator license
 * for pest control, etc.) — data, not code, per the module docstring above.
 * Deliberately not exhaustive: covers the trades with an unambiguous,
 * commonly-required credential. An operator can always add/edit/remove via
 * the hr/requirements API regardless of what's seeded here.
 */
export const TRADE_HR_DOC_REQUIREMENTS: Partial<Record<IndustryKey, HrDocumentRequirement[]>> = {
  dumpster: [{ doc_type: 'cdl', label: 'Commercial Driver License (CDL)', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  junk_removal: [{ doc_type: 'cdl', label: 'Commercial Driver License (CDL)', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  towing: [{ doc_type: 'cdl', label: 'Commercial Driver License (CDL)', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  moving: [{ doc_type: 'cdl', label: 'Commercial Driver License (CDL)', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  pest: [{ doc_type: 'pesticide_applicator_license', label: 'Pesticide Applicator License', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  hvac: [{ doc_type: 'hvac_license', label: 'HVAC Contractor License', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  plumbing: [{ doc_type: 'plumbing_license', label: 'Plumbing License', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  electrical: [{ doc_type: 'electrical_license', label: 'Electrical License', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  pool: [{ doc_type: 'cpo_certification', label: 'Certified Pool Operator (CPO)', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  locksmith: [{ doc_type: 'locksmith_license', label: 'Locksmith License', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  home_inspection: [{ doc_type: 'home_inspector_license', label: 'Home Inspector License', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
  septic: [{ doc_type: 'septic_installer_license', label: 'Septic Installer License', applies_to: 'all', required: true, has_expiry: true, sort_order: 70 }],
}

/**
 * Seed HR defaults for a tenant. Idempotent: each requirement doc_type is
 * only inserted if the tenant doesn't already have a row for it, and each
 * existing team_member gets an HR profile only if it lacks one. Safe to run
 * on every activation — including backfilling trade-specific docs onto a
 * tenant that was already seeded before this industry was wired in (e.g. a
 * re-activation after the operator later sets the tenant's trade).
 *
 * Returns a small summary of what it created.
 */
export async function seedHrDefaults(tenantId: string, industry?: IndustryKey): Promise<{
  requirementsSeeded: number
  profilesBackfilled: number
}> {
  let requirementsSeeded = 0

  // 1. Document-requirement template — generic baseline seeds only on a
  // tenant with zero requirement rows; trade-specific docs backfill onto
  // *any* tenant missing them, so this is idempotent AND self-healing on
  // repeat activation instead of a one-shot "if empty" gate.
  const { data: existingReqs } = await supabaseAdmin
    .from('hr_document_requirements')
    .select('doc_type')
    .eq('tenant_id', tenantId)
  const existingTypes = new Set((existingReqs || []).map((r) => r.doc_type as string))

  const wanted: HrDocumentRequirement[] = [
    ...(existingTypes.size === 0 ? DEFAULT_HR_DOC_REQUIREMENTS : []),
    ...(industry ? TRADE_HR_DOC_REQUIREMENTS[industry] || [] : []),
  ]
  const toInsert = wanted.filter((r) => !existingTypes.has(r.doc_type))

  if (toInsert.length > 0) {
    const rows = toInsert.map((r) => ({
      tenant_id: tenantId,
      doc_type: r.doc_type,
      label: r.label,
      applies_to: r.applies_to,
      required: r.required,
      has_expiry: r.has_expiry,
      sort_order: r.sort_order,
    }))
    const { error } = await supabaseAdmin.from('hr_document_requirements').insert(rows)
    if (error) throw error
    requirementsSeeded = rows.length
  }

  // 2. Back-fill an HR profile for every team_member that lacks one. Default to
  //    1099 (the common case); the operator flips individuals to W-2 as needed.
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('tenant_id', tenantId)

  let profilesBackfilled = 0
  if (members && members.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from('hr_employee_profiles')
      .select('team_member_id')
      .eq('tenant_id', tenantId)
    const have = new Set((existing || []).map((r) => r.team_member_id as string))
    const missing = members.filter((m) => !have.has(m.id as string))
    if (missing.length > 0) {
      const rows = missing.map((m) => ({
        tenant_id: tenantId,
        team_member_id: m.id as string,
        employment_type: 'contractor_1099' as EmploymentType,
      }))
      const { error } = await supabaseAdmin.from('hr_employee_profiles').insert(rows)  // tenant-scope-ok: insert rows carry tenant_id (built above)
      if (error) throw error
      profilesBackfilled = rows.length
    }
  }

  return { requirementsSeeded, profilesBackfilled }
}

export interface HrEmployee {
  team_member_id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  active: boolean
  // HR profile (nullable until backfilled)
  profile_id: string | null
  employment_type: EmploymentType
  hr_status: HrStatus
  hire_date: string | null
  title: string | null
  comp_type: CompType
  pay_rate_cents: number | null
  pay_period: PayPeriod
  // Stripe Connect payout status (from the existing team_members columns)
  stripe_connected: boolean
}

/** Row shape returned by the fused team_members ⨝ hr_employee_profiles read. */
interface RawMemberRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string | null
  status: string | null
  stripe_account_id: string | null
  stripe_ready_at: string | null
  hr_employee_profiles: Array<{
    id: string
    employment_type: EmploymentType
    hr_status: HrStatus
    hire_date: string | null
    title: string | null
    comp_type: CompType
    pay_rate_cents: number | null
    pay_period: PayPeriod
  }> | null
}

/**
 * List a tenant's employees, fusing the roster row, its HR profile, and Stripe
 * Connect status into one flat record for the People hub.
 */
export async function listEmployees(tenantId: string): Promise<HrEmployee[]> {
  // Use `status` ('active' | 'inactive' | 'suspended'), not `active`. Correction:
  // team_members.active does exist (added by 010_nycmaid_parity_columns_2.sql, a
  // one-time NYC Maid legacy-data import column) -- verified live against
  // production. But nothing in the app writes it, so it silently drifts from
  // reality (confirmed live: ~12% of rows disagree with `status`, including
  // status='inactive' rows still showing active=true). `status` is the field
  // the termination flow actually keeps current.
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select(`
      id, name, email, phone, role, status, stripe_account_id, stripe_ready_at,
      hr_employee_profiles ( id, employment_type, hr_status, hire_date, title, comp_type, pay_rate_cents, pay_period )
    `)
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) throw error

  const rows = (data || []) as unknown as RawMemberRow[]
  return rows.map((m): HrEmployee => {
    const p = m.hr_employee_profiles?.[0]
    return {
      team_member_id: m.id,
      name: m.name || 'Unnamed',
      email: m.email,
      phone: m.phone,
      role: m.role,
      active: m.status !== 'inactive',
      profile_id: p?.id ?? null,
      employment_type: p?.employment_type ?? 'contractor_1099',
      hr_status: p?.hr_status ?? 'active',
      hire_date: p?.hire_date ?? null,
      title: p?.title ?? null,
      comp_type: p?.comp_type ?? 'per_job',
      pay_rate_cents: p?.pay_rate_cents ?? null,
      pay_period: p?.pay_period ?? 'per_job',
      stripe_connected: !!(m.stripe_account_id && m.stripe_ready_at),
    }
  })
}
