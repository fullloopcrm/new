import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/deals/[id]/stage stored `body.lost_reason` raw into
 * `deals.lost_reason` with no length cap when closing a deal as lost, same
 * class as accounting_periods.notes/reopened_reason (capString,
 * src/lib/validate.ts).
 *
 * FIXED: capString(body.lost_reason, 2000) truncates rather than rejects.
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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: 'owner',
    })),
  }
})

import { POST } from './route'

function seed() {
  return {
    deals: [
      { id: 'deal-1', tenant_id: A, stage: 'qualifying', title: 'Existing deal', value_cents: 0, probability: 40 },
    ],
    deal_activities: [],
    quotes: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}
const params = () => ({ params: Promise.resolve({ id: 'deal-1' }) })

describe('POST /api/deals/[id]/stage — lost_reason cap', () => {
  it('LOCK: an oversized lost_reason is truncated to 2000 chars before the write', async () => {
    const oversized = 'z'.repeat(3000)
    const res = await POST(req({ stage: 'lost', lost_reason: oversized }), params())
    expect(res.status).toBe(200)
    const row = (h.seed.deals as Array<{ id: string; lost_reason: string | null }>).find(d => d.id === 'deal-1')
    expect(row?.lost_reason).toHaveLength(2000)
    expect(row?.lost_reason).toBe(oversized.slice(0, 2000))
  })

  it('CONTROL: a normal-length lost_reason passes through untouched', async () => {
    const res = await POST(req({ stage: 'lost', lost_reason: 'Went with a competitor' }), params())
    expect(res.status).toBe(200)
    const row = (h.seed.deals as Array<{ id: string; lost_reason: string | null }>).find(d => d.id === 'deal-1')
    expect(row?.lost_reason).toBe('Went with a competitor')
  })

  it('CONTROL: re-opening a lost deal (moving off lost) clears the reason', async () => {
    await POST(req({ stage: 'lost', lost_reason: 'Bad timing' }), params())
    const res = await POST(req({ stage: 'qualifying' }), params())
    expect(res.status).toBe(200)
    const row = (h.seed.deals as Array<{ id: string; lost_reason: string | null }>).find(d => d.id === 'deal-1')
    expect(row?.lost_reason).toBeNull()
  })
})
