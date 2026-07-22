import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/bookings/closeout (converted to tenantDb).
 *
 * GET-only close-out surface. Two list reads over the tenant-scoped `bookings`
 * table (jobs needing close-out + recently closed). Both now route through
 * tenantDb, so the injected `.eq('tenant_id')` is what filters — a booking
 * seeded for another tenant never appears in either list, even when it would
 * otherwise satisfy the status/payment filters.
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
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

import { GET } from './route'

const recentClose = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // within 7d

function seed() {
  return {
    bookings: [
      // needs-closeout candidates (status in set, not fully paid)
      { id: 'bk-a-open', tenant_id: A, status: 'completed', payment_status: 'unpaid', team_member_paid: false },
      { id: 'bk-b-open', tenant_id: B, status: 'completed', payment_status: 'unpaid', team_member_paid: false },
      // recently-closed candidates (paid + team_member_paid + recent checkout)
      { id: 'bk-a-closed', tenant_id: A, status: 'paid', payment_status: 'paid', team_member_paid: true, check_out_time: recentClose },
      { id: 'bk-b-closed', tenant_id: B, status: 'paid', payment_status: 'paid', team_member_paid: true, check_out_time: recentClose },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('bookings/closeout — tenant isolation', () => {
  it('needsCloseout excludes a foreign tenant booking', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.needsCloseout as Array<{ id: string }>).map((b) => b.id)
    expect(ids).toContain('bk-a-open')
    expect(ids).not.toContain('bk-b-open')
  })

  it('recentlyClosed excludes a foreign tenant booking', async () => {
    const res = await GET()
    const body = await res.json()
    const ids = (body.recentlyClosed as Array<{ id: string }>).map((b) => b.id)
    expect(ids).toContain('bk-a-closed')
    expect(ids).not.toContain('bk-b-closed')
  })
})
