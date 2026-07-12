import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/team-portal/checkout (converted to tenantDb).
 *
 * 💰 A cleaner checks out of a booking: this WRITES the final price + flips status
 * to `completed`. The route previously updated by booking id without a tenant
 * filter (flagged LOW). Now tenantDb scopes both the read and the update to the
 * tenant HMAC-bound in the portal token. Checking out ANOTHER tenant's booking id
 * must 404 (tenant-scoped read) before any price/status write.
 */

const A = 'tid-a'
const B = 'tid-b'
const TM = 'tm-1'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

// Portal token verifies to tenant A + this team member.
vi.mock('../auth/token', () => ({ verifyToken: () => ({ tid: A, id: TM }) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/payment-processor', () => ({ processPayment: vi.fn(async () => {}) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: A, team_member_id: TM, check_in_time: null, price: 12000, referrer_id: null, status: 'in_progress', client_id: 'c-a' },
      { id: 'bk-b', tenant_id: B, team_member_id: TM, check_in_time: null, price: 9000, referrer_id: null, status: 'in_progress', client_id: 'c-b' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(body: unknown) {
  return POST(
    new Request('http://t/api/team-portal/checkout', {
      method: 'POST',
      headers: { authorization: 'Bearer tok' },
      body: JSON.stringify(body),
    }),
  )
}

describe('team-portal/checkout POST — tenant isolation', () => {
  it("positive control: cleaner checks out its OWN tenant's booking → completed", async () => {
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(200)
    expect(h.seed.bookings.find((b) => b.id === 'bk-a')!.status).toBe('completed')
  })

  it("wrong-tenant probe: checkout of tenant B's booking 404s — no price/status write", async () => {
    const res = await post({ booking_id: 'bk-b' })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Not found')
    expect(h.seed.bookings.find((b) => b.id === 'bk-b')!.status).toBe('in_progress')
    expect(h.capture.updates).toHaveLength(0)
  })
})
