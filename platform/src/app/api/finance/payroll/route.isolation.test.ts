import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * finance/payroll POST — tenant isolation.
 *
 * BUG (fixed here): team_member_id was accepted from the request body and
 * inserted into payroll_payments with zero ownership check — the same
 * caller-supplied-FK gap already fixed on the sibling cleaner-payout route.
 * A tenant admin with finance.payroll permission could pass another
 * tenant's team_member_id and plant a payroll_payments row (tenant_id: own,
 * team_member_id: foreign) that then gets posted to the ledger and
 * corrupts the payroll audit trail with a reference to an employee who
 * doesn't belong to this tenant.
 *
 * FIX: verify team_member_id belongs to the caller's tenant before insert
 * (404 if not), matching admin/bookings/[id]/cleaner-payout's pattern.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/finance/post-labor', () => ({
  postPayrollToLedger: vi.fn(async () => ({ posted: true })),
}))

import { POST } from './route'

function seed() {
  return {
    team_members: [
      { id: 'tm-a1', tenant_id: CTX_TENANT, pay_rate: 20 },
      { id: 'tm-b1', tenant_id: OTHER_TENANT, pay_rate: 20 },
    ],
    payroll_payments: [],
    bookings: [],
  }
}

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/payroll POST — tenant isolation', () => {
  it('positive control: same-tenant team_member_id records a payroll payment', async () => {
    const res = await POST(postReq({ team_member_id: 'tm-a1', amount: 100, method: 'zelle', period_start: '2026-07-01', period_end: '2026-07-14' }))
    expect(res.status).toBe(201)
    const insert = h.capture.inserts.find((i) => i.table === 'payroll_payments')
    expect(insert?.rows[0].tenant_id).toBe(CTX_TENANT)
    expect(insert?.rows[0].team_member_id).toBe('tm-a1')
  })

  it("wrong-tenant probe: a foreign team_member_id 404s, no payroll_payments row inserted", async () => {
    const res = await POST(postReq({ team_member_id: 'tm-b1', amount: 100, method: 'zelle', period_start: '2026-07-01', period_end: '2026-07-14' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'payroll_payments')).toBeUndefined()
  })

  it('rejects a missing team_member_id before touching the database', async () => {
    const res = await POST(postReq({ amount: 100, method: 'zelle' }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'payroll_payments')).toBeUndefined()
  })
})
