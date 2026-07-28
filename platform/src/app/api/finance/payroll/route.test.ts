/**
 * Characterization tests for finance/payroll GET+POST — real payroll money
 * logic. Coverage before this file: 42.86% statements.
 *
 * Uses @/test/fake-supabase (not the simpler tenant-isolation-harness)
 * because its `.not(col, 'is', val)` is a real filter, not a no-op — required
 * to prove the `team_member_paid` exclusion the GET handler's own comment
 * documents as a real, previously-shipped bug (nycmaid showed $47,820 owed
 * when 609/610 completed bookings were already paid via bulk closeout).
 * postPayrollToLedger is mocked — its own posting logic is covered by
 * post-labor.test.ts; this file only proves the route calls it correctly.
 *
 * Pins:
 *   - GET: pending_hours/pending_pay computed only from completed bookings
 *     with both check-in AND check-out, EXCLUDING team_member_paid=true
 *     (the regression above); pay rate is booking.pay_rate ?? member.pay_rate
 *     ?? 0; only active team members are returned
 *   - POST: team_member_id required (400); unknown/wrong-tenant member (404);
 *     a duplicate submission for the same (member, period_start, period_end)
 *     returns the EXISTING row with duplicate:true and inserts nothing new;
 *     a full-or-over payment marks that member's completed bookings 'paid',
 *     a partial payment does NOT (still recorded + still posted to the
 *     ledger — partial payments are real money); postPayrollToLedger is
 *     fired with the new row's id
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(async () => ({ tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' }, error: null })),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

const postPayrollToLedgerMock = vi.hoisted(() => vi.fn(async () => ({ posted: true, entryId: 'je-1' })))
vi.mock('@/lib/finance/post-labor', () => ({ postPayrollToLedger: postPayrollToLedgerMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

function f(): FakeSupabase {
  return supabaseAdmin as unknown as FakeSupabase
}

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  f()._store.clear()
  vi.clearAllMocks()
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  }))
  postPayrollToLedgerMock.mockResolvedValue({ posted: true, entryId: 'je-1' })
})

describe('GET /api/finance/payroll', () => {
  it('sums pending hours/pay only from completed, checked-in-and-out, unpaid bookings', async () => {
    f()._seed('team_members', [{ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Ana', pay_rate: 20, status: 'active' }])
    f()._seed('bookings', [
      { id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T11:00:00Z', pay_rate: null },
    ])
    const res = await GET()
    const body = await res.json()
    expect(body.payroll).toHaveLength(1)
    expect(body.payroll[0]).toMatchObject({ pending_hours: 2, pending_pay: 40, jobs: 1 })
  })

  it('excludes a booking already flagged team_member_paid=true (the $47,820 regression)', async () => {
    f()._seed('team_members', [{ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Ana', pay_rate: 20, status: 'active' }])
    f()._seed('bookings', [
      { id: 'bk-paid', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', team_member_paid: true, check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T11:00:00Z' },
      { id: 'bk-unpaid', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T10:00:00Z' },
    ])
    const res = await GET()
    const body = await res.json()
    expect(body.payroll[0]).toMatchObject({ pending_hours: 1, pending_pay: 20, jobs: 1 })
  })

  it('booking.pay_rate overrides member.pay_rate when set', async () => {
    f()._seed('team_members', [{ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Ana', pay_rate: 20, status: 'active' }])
    f()._seed('bookings', [
      { id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T10:00:00Z', pay_rate: 35 },
    ])
    const res = await GET()
    const body = await res.json()
    expect(body.payroll[0].pending_pay).toBe(35)
  })

  it('a booking missing check-in or check-out contributes 0 pay but is still counted as a job', async () => {
    f()._seed('team_members', [{ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Ana', pay_rate: 20, status: 'active' }])
    f()._seed('bookings', [
      { id: 'bk-nocheckin', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', check_in_time: null, check_out_time: null },
    ])
    const res = await GET()
    const body = await res.json()
    expect(body.payroll[0]).toMatchObject({ pending_hours: 0, pending_pay: 0, jobs: 1 })
  })

  it('only returns active team members', async () => {
    f()._seed('team_members', [
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Ana', pay_rate: 20, status: 'active' },
      { id: 'tm-inactive', tenant_id: CTX_TENANT, name: 'Bo', pay_rate: 20, status: 'inactive' },
    ])
    const res = await GET()
    const body = await res.json()
    expect(body.payroll.map((p: Row) => p.id)).toEqual(['tm-active'])
  })
})

describe('POST /api/finance/payroll', () => {
  it('400s when team_member_id is missing', async () => {
    const res = await POST(postReq({ amount: 100 }))
    expect(res.status).toBe(400)
  })

  it('404s for a team member that does not exist in the caller\'s tenant', async () => {
    f()._seed('team_members', [{ id: 'tm-other', tenant_id: OTHER_TENANT, pay_rate: 20 }])
    const res = await POST(postReq({ team_member_id: 'tm-other', amount: 100 }))
    expect(res.status).toBe(404)
  })

  it('a duplicate submission for the same member+period returns the existing row, inserts nothing new', async () => {
    f()._seed('team_members', [{ id: 'tm-1', tenant_id: CTX_TENANT, pay_rate: 20 }])
    f()._seed('payroll_payments', [
      { id: 'pp-existing', tenant_id: CTX_TENANT, team_member_id: 'tm-1', amount: 5000, period_start: '2026-07-01', period_end: '2026-07-07' },
    ])
    const res = await POST(postReq({ team_member_id: 'tm-1', amount: 999, period_start: '2026-07-01', period_end: '2026-07-07' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.duplicate).toBe(true)
    expect(body.payment.id).toBe('pp-existing')
    expect(f()._all('payroll_payments')).toHaveLength(1)
    expect(postPayrollToLedgerMock).not.toHaveBeenCalled()
  })

  it('a payment that fully covers what is owed marks the member\'s completed bookings paid and posts to the ledger', async () => {
    f()._seed('team_members', [{ id: 'tm-1', tenant_id: CTX_TENANT, pay_rate: 20 }])
    f()._seed('bookings', [
      { id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T11:00:00Z' }, // 2h * $20 = $40 owed
    ])
    const res = await POST(postReq({ team_member_id: 'tm-1', amount: 40 }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.bookings_marked_paid).toBe(true)
    const bk = f()._all('bookings').find((b) => b.id === 'bk-1')!
    expect(bk.status).toBe('paid')
    expect(postPayrollToLedgerMock).toHaveBeenCalledWith({ tenantId: CTX_TENANT, payrollPaymentId: body.payment.id })
  })

  it('a PARTIAL payment does not mark bookings paid, but is still recorded and posted to the ledger', async () => {
    f()._seed('team_members', [{ id: 'tm-1', tenant_id: CTX_TENANT, pay_rate: 20 }])
    f()._seed('bookings', [
      { id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T11:00:00Z' }, // $40 owed
    ])
    const res = await POST(postReq({ team_member_id: 'tm-1', amount: 10 })) // way under
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.bookings_marked_paid).toBe(false)
    const bk = f()._all('bookings').find((b) => b.id === 'bk-1')!
    expect(bk.status).toBe('completed') // untouched, stays visibly pending
    expect(postPayrollToLedgerMock).toHaveBeenCalled() // partial payment is still real money, still posted
    expect(f()._all('payroll_payments')).toHaveLength(1)
    expect(f()._all('payroll_payments')[0].amount).toBe(1000) // dollars -> cents
  })

  it('never marks another tenant\'s bookings paid', async () => {
    f()._seed('team_members', [{ id: 'tm-1', tenant_id: CTX_TENANT, pay_rate: 20 }])
    f()._seed('bookings', [
      { id: 'bk-mine', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T10:00:00Z' },
      { id: 'bk-other', tenant_id: OTHER_TENANT, team_member_id: 'tm-1', status: 'completed', check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T10:00:00Z' },
    ])
    await POST(postReq({ team_member_id: 'tm-1', amount: 100 }))
    const other = f()._all('bookings').find((b) => b.id === 'bk-other')!
    expect(other.status).toBe('completed')
  })
})
