import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/pipeline — job-number enrichment for 'sold' deals.
 *
 * A sold deal's job number comes from its converted quote's booking (job_seq +
 * the client's customer_number), formatted the same way the Bookings view
 * does. Open-stage deals (no converted quote) must never get a job_number.
 */

const A = 'tid-a'

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
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A, slug: 'nycmaid' }, role: 'owner' })),
  }
})

import { GET } from './route'

function seed() {
  return {
    deals: [
      { id: 'd-sold', tenant_id: A, status: 'active', stage: 'sold', value_cents: 20000, probability: 100, expected_close_date: null, clients: { id: 'cl-a', name: 'Client A' } },
      { id: 'd-open', tenant_id: A, status: 'active', stage: 'new', value_cents: 10000, probability: 25, expected_close_date: null, clients: { id: 'cl-b', name: 'Client B' } },
    ],
    quotes: [
      { id: 'q1', tenant_id: A, deal_id: 'd-sold', converted_booking_id: 'b1', created_at: '2026-07-20T00:00:00Z' },
    ],
    bookings: [
      { id: 'b1', tenant_id: A, job_seq: 2, clients: { customer_number: 7 } },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('pipeline — job numbers on sold deals', () => {
  it('attaches a job_number to a sold deal with a converted quote/booking', async () => {
    const res = await GET(new Request('http://t/api/pipeline'))
    expect(res.status).toBe(200)
    const body = await res.json()

    const sold = (body.byStage.sold as Array<{ id: string; job_number?: string }>).find((d) => d.id === 'd-sold')
    expect(sold?.job_number).toBe('NYCMAID-007-02')
  })

  it('does not attach a job_number to an open-stage deal', async () => {
    const res = await GET(new Request('http://t/api/pipeline'))
    const body = await res.json()

    const open = (body.byStage.new as Array<{ id: string; job_number?: string }>).find((d) => d.id === 'd-open')
    expect(open?.job_number).toBeUndefined()
  })
})
