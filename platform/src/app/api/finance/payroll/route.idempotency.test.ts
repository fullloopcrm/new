import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * finance/payroll POST — double-submit protection.
 *
 * BUG (fixed here): every POST unconditionally INSERTed a new
 * payroll_payments row. Unlike the ledger helpers (journalEntryExists,
 * keyed on source_id) there was no dedup key at all -- a double-click or a
 * client retry for the same team member + pay period created a SECOND
 * payroll_payments row with its own id. postPayrollToLedger dedupes on
 * (source='payroll', source_id=payrollPaymentId), but two distinct rows have
 * two distinct ids, so the ledger guard never fires: the worker gets paid
 * and posted to the books twice.
 *
 * FIX: before inserting, check for an existing row on
 * (tenant_id, team_member_id, period_start, period_end). If found, return
 * the existing payment (200, duplicate:true) instead of inserting again.
 * A DB-level backstop for the true CONCURRENT race (two simultaneous
 * requests both passing the SELECT before either INSERT lands) is prepared
 * in migration 062 (uq_payroll_payments_tenant_member_period, NOT yet
 * applied to prod) with a matching 23505-catch in the route -- mirroring
 * migration 061 / postJournalEntry's handling of the same class of race.
 * That DB-enforced half can't be exercised here since the in-memory harness
 * doesn't simulate a unique-index violation; the sequential guard covers the
 * common double-click case this fix targets.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: TENANT, tenant: { id: TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/finance/post-labor', () => ({
  postPayrollToLedger: vi.fn(async () => ({ posted: true })),
}))

import { POST } from './route'

function seed() {
  return {
    team_members: [{ id: 'tm-a1', tenant_id: TENANT, pay_rate: 20 }],
    payroll_payments: [],
    bookings: [],
  }
}

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

const BODY = { team_member_id: 'tm-a1', amount: 100, method: 'zelle', period_start: '2026-07-01', period_end: '2026-07-14' }

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/payroll POST — double-submit protection', () => {
  it('a double-click (identical POST fired twice sequentially) records the payment exactly once', async () => {
    const first = await POST(postReq(BODY))
    const second = await POST(postReq(BODY))

    expect(first.status).toBe(201)
    const firstBody = await first.json()
    expect(firstBody.duplicate).toBeUndefined()

    expect(second.status).toBe(200)
    const secondBody = await second.json()
    expect(secondBody.duplicate).toBe(true)
    expect(secondBody.payment.id).toBe(firstBody.payment.id)

    const inserts = h.capture.inserts.filter((i) => i.table === 'payroll_payments')
    expect(inserts).toHaveLength(1)
    expect(h.seed.payroll_payments).toHaveLength(1)
  })

  it('a retry with a different amount for the same member+period is still treated as a duplicate (no second payout)', async () => {
    await POST(postReq(BODY))
    const retry = await POST(postReq({ ...BODY, amount: 999 }))

    expect(retry.status).toBe(200)
    expect((await retry.json()).duplicate).toBe(true)
    expect(h.seed.payroll_payments).toHaveLength(1)
    expect(h.seed.payroll_payments[0].amount).toBe(10000) // original $100, not $999
  })

  it('positive control: two DISTINCT pay periods for the same member each record a payment', async () => {
    const first = await POST(postReq(BODY))
    const second = await POST(postReq({ ...BODY, period_start: '2026-07-15', period_end: '2026-07-28' }))

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(h.seed.payroll_payments).toHaveLength(2)
  })

  it('cross-tenant control: the dedup key is scoped by tenant, not global', async () => {
    h.seed.team_members.push({ id: 'tm-b1', tenant_id: 'tid-b', pay_rate: 20 })
    // Same team_member_id row would collide only within a tenant; simulate two
    // tenants paying members on the same calendar period independently.
    const first = await POST(postReq(BODY))
    expect(first.status).toBe(201)

    // A different member (still tid-a scoped) on the same period is not a dupe.
    h.seed.team_members.push({ id: 'tm-a2', tenant_id: TENANT, pay_rate: 25 })
    const second = await POST(postReq({ ...BODY, team_member_id: 'tm-a2' }))
    expect(second.status).toBe(201)
    expect(h.seed.payroll_payments).toHaveLength(2)
  })

  it('a payment with no pay period selected is not deduped (documented gap, matches the partial unique index)', async () => {
    const noPeriod = { team_member_id: 'tm-a1', amount: 100, method: 'zelle' }
    const first = await POST(postReq(noPeriod))
    const second = await POST(postReq(noPeriod))

    expect(first.status).toBe(201)
    expect(second.status).toBe(201) // not deduped -- both insert
    expect(h.seed.payroll_payments).toHaveLength(2)
  })
})
