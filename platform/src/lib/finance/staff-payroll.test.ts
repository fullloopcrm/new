/**
 * Weekly staff payroll — claim-before-transfer idempotency, the sanity-cap
 * hold, and failure handling. Mirrors cleaner-payout-idempotency.test.ts's
 * hand-rolled fake (the shared fake-supabase.ts helper only enforces
 * single-column unique constraints; this table's real guard is a composite
 * partial unique index on (tenant_id, team_member_id, pay_period_start)
 * WHERE rail='payroll').
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const store: Record<string, any[]> = {}
  let seq = 0
  const nextId = (p: string) => `${p}_${++seq}`
  const table = (n: string) => (store[n] ||= [])
  // Composite key, only enforced for payroll rows (mirrors the migration's
  // partial index — a booking-linked cleaner payout has rail !== 'payroll'
  // and is never checked against this key).
  const PAYROLL_UNIQUE = ['tenant_id', 'team_member_id', 'pay_period_start']

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function builder(name: string): any {
    const preds: Array<(r: any) => boolean> = []
    let inserted: any[] | null = null
    let insertError: any = null
    let patch: any = null
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
    const match = () => table(name).filter((r) => preds.every((p) => p(r)))
    const api: any = {
      select: () => api,
      order: () => api,
      range: () => api,
      limit: () => api,
      eq: (c: string, v: unknown) => (preds.push((r) => r[c] === v), api),
      in: (c: string, vs: unknown[]) => (preds.push((r) => vs.includes(r[c])), api),
      not: (c: string, _op: string, v: unknown) => (preds.push((r) => r[c] !== v), api),
      insert: (rows: any) => {
        mode = 'insert'
        const arr = Array.isArray(rows) ? rows : [rows]
        for (const r of arr) {
          if (name === 'team_member_payouts' && r.rail === 'payroll' && PAYROLL_UNIQUE.every((k) => r[k] != null)) {
            const clash = table(name).some((x) => x.rail === 'payroll' && PAYROLL_UNIQUE.every((k) => x[k] === r[k]))
            if (clash) {
              insertError = { code: '23505', message: 'duplicate key value violates unique constraint uq_payouts_payroll_period' }
              inserted = null
              return api
            }
          }
        }
        inserted = arr.map((r) => ({ id: r.id ?? nextId('row'), ...r }))
        for (const r of inserted) table(name).push(r)
        return api
      },
      update: (p: any) => ((patch = p), (mode = 'update'), api),
      delete: () => ((mode = 'delete'), api),
      maybeSingle: () => Promise.resolve({ data: insertError ? null : (inserted ? inserted[0] : match()[0]) ?? null, error: insertError }),
      single: () => Promise.resolve({ data: insertError ? null : (inserted ? inserted[0] : match()[0]) ?? null, error: insertError }),
      then: (onF: any, onR: any) => {
        if (mode === 'update') {
          const rows = match()
          for (const r of rows) Object.assign(r, patch)
          return Promise.resolve({ data: rows, error: null }).then(onF, onR)
        }
        if (mode === 'delete') {
          const keep = table(name).filter((r) => !preds.every((p) => p(r)))
          store[name] = keep
          return Promise.resolve({ data: null, error: null }).then(onF, onR)
        }
        if (mode === 'insert') return Promise.resolve({ data: inserted, error: insertError }).then(onF, onR)
        return Promise.resolve({ data: match(), error: null, count: match().length }).then(onF, onR)
      },
    }
    return api
  }

  const transfersCreate = vi.fn(async () => ({ id: 'tr_1' }))
  const admin = { from: (n: string) => builder(n) }
  const reset = () => {
    for (const k of Object.keys(store)) delete store[k]
    seq = 0
  }
  return { store, admin, reset, transfersCreate }
})

vi.mock('../supabase', () => ({ supabaseAdmin: h.admin }))
vi.mock('stripe', () => ({
  default: class {
    transfers = { create: h.transfersCreate }
  },
}))
vi.mock('../sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('../admin-contacts', () => ({ getAdminContacts: vi.fn(async () => []) }))
vi.mock('../secret-crypto', () => ({ decryptSecret: (x: string) => x }))

import { runWeeklyStaffPayroll, WEEKLY_PAY_SANITY_CAP_CENTS } from './staff-payroll'

const TENANT = 'tenant-a'
const MEMBER = 'member-1'

function seedTenant() {
  h.store.tenants = [{ id: TENANT, name: 'NYC Maid', stripe_api_key: 'sk_test', telnyx_api_key: null, telnyx_phone: null }]
}

function seedEligibleMember(overrides: Record<string, unknown> = {}) {
  h.store.team_members = [
    { id: MEMBER, tenant_id: TENANT, name: 'Admin Person', stripe_account_id: 'acct_1', stripe_ready_at: '2026-08-01T00:00:00Z' },
  ]
  h.store.hr_employee_profiles = [
    { tenant_id: TENANT, team_member_id: MEMBER, comp_type: 'salary', pay_period: 'weekly', hr_status: 'active', pay_rate_cents: 100000, ...overrides },
  ]
}

beforeEach(() => {
  h.reset()
  vi.clearAllMocks()
})

describe('runWeeklyStaffPayroll', () => {
  it('pays an eligible salaried weekly team member exactly once per run', async () => {
    seedTenant()
    seedEligibleMember()

    const results = await runWeeklyStaffPayroll()

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ status: 'paid', teamMemberId: MEMBER, amountCents: 100000 })
    expect(h.transfersCreate).toHaveBeenCalledTimes(1)
    expect(h.transfersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100000, destination: 'acct_1' }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining(`staff-payroll:${TENANT}:${MEMBER}:`) }),
    )
    const rows = (h.store.team_member_payouts || []).filter((p: any) => p.team_member_id === MEMBER)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('transferred')
    expect(rows[0].rail).toBe('payroll')
  })

  it('never double-pays the same person for the same week (claim-before-transfer)', async () => {
    seedTenant()
    seedEligibleMember()

    const first = await runWeeklyStaffPayroll()
    const second = await runWeeklyStaffPayroll()

    expect(first[0].status).toBe('paid')
    expect(second[0].status).toBe('skipped_already_paid')
    expect(h.transfersCreate).toHaveBeenCalledTimes(1)
    const rows = (h.store.team_member_payouts || []).filter((p: any) => p.team_member_id === MEMBER)
    expect(rows).toHaveLength(1)
  })

  it('TRUE CONCURRENCY: two simultaneous runs still transfer exactly once', async () => {
    seedTenant()
    seedEligibleMember()

    const [a, b] = await Promise.all([runWeeklyStaffPayroll(), runWeeklyStaffPayroll()])

    const statuses = [a[0].status, b[0].status].sort()
    expect(statuses).toEqual(['paid', 'skipped_already_paid'])
    expect(h.transfersCreate).toHaveBeenCalledTimes(1)
  })

  it('holds instead of paying when the weekly rate exceeds the sanity cap, and never inserts a payout row', async () => {
    seedTenant()
    seedEligibleMember({ pay_rate_cents: WEEKLY_PAY_SANITY_CAP_CENTS + 1 })

    const results = await runWeeklyStaffPayroll()

    expect(results[0].status).toBe('held_over_cap')
    expect(h.transfersCreate).not.toHaveBeenCalled()
    expect((h.store.team_member_payouts || []).filter((p: any) => p.team_member_id === MEMBER)).toHaveLength(0)
  })

  it('marks the row failed and does not throw when the Stripe transfer errors', async () => {
    seedTenant()
    seedEligibleMember()
    h.transfersCreate.mockRejectedValueOnce(new Error('Your card was declined'))

    const results = await runWeeklyStaffPayroll()

    expect(results[0].status).toBe('failed')
    expect(results[0].error).toBe('Your card was declined')
    const rows = (h.store.team_member_payouts || []).filter((p: any) => p.team_member_id === MEMBER)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('failed')
  })

  it('skips a team member with no Stripe account connected', async () => {
    seedTenant()
    seedEligibleMember()
    h.store.team_members[0].stripe_account_id = null

    const results = await runWeeklyStaffPayroll()

    expect(results).toHaveLength(0)
    expect(h.transfersCreate).not.toHaveBeenCalled()
  })

  it('skips a per-job / hourly team member (not salaried weekly)', async () => {
    seedTenant()
    seedEligibleMember({ comp_type: 'per_job', pay_period: 'per_job' })

    const results = await runWeeklyStaffPayroll()

    expect(results).toHaveLength(0)
    expect(h.transfersCreate).not.toHaveBeenCalled()
  })
})
