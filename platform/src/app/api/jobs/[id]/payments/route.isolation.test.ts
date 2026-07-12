import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/jobs/[id]/payments (PATCH, converted to tenantDb).
 *
 * The payment update is scoped by tenantDb (in addition to job_id + payment_id),
 * so a payment id belonging to a FOREIGN tenant's job is never updated, even if
 * an attacker guesses the payment_id and pairs it with their own job_id.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { PATCH } from './route'

function seed() {
  return {
    job_payments: [
      { id: 'pay-a1', tenant_id: A, job_id: 'job-a1', label: 'Deposit', amount_cents: 5000, status: 'pending' },
      { id: 'pay-b1', tenant_id: B, job_id: 'job-b1', label: 'Deposit', amount_cents: 9000, status: 'pending' },
    ],
    job_events: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function req(payment_id: string, status: string) {
  return new Request('http://t', { method: 'PATCH', body: JSON.stringify({ payment_id, status }) })
}

describe('jobs/[id]/payments — tenant isolation', () => {
  it("PATCH marks the acting tenant's own payment paid", async () => {
    const res = await PATCH(req('pay-a1', 'paid'), params('job-a1'))
    expect(res.status).toBe(200)
    const own = h.seed.job_payments.find((p) => p.id === 'pay-a1')!
    expect(own.status).toBe('paid')
  })

  it("WRONG-TENANT PROBE: PATCH against a foreign tenant's job_id + payment_id returns 404, unchanged", async () => {
    const res = await PATCH(req('pay-b1', 'paid'), params('job-b1'))
    expect(res.status).toBe(404)
    const foreign = h.seed.job_payments.find((p) => p.id === 'pay-b1')!
    expect(foreign.status).toBe('pending')
  })

  it("WRONG-TENANT PROBE: a foreign payment_id paired with the acting tenant's own job_id still 404s", async () => {
    const res = await PATCH(req('pay-b1', 'paid'), params('job-a1'))
    expect(res.status).toBe(404)
    const foreign = h.seed.job_payments.find((p) => p.id === 'pay-b1')!
    expect(foreign.status).toBe('pending')
  })
})
