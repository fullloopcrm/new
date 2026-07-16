import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/quotes/[id]/convert — permission gate.
 *
 * BUG (fixed here): converting an accepted quote into a booking only called
 * getTenantForRequest() with zero permission check. rbac.ts grants
 * 'sales.edit' to owner/admin/manager only — before this fix a 'staff'
 * session could convert any accepted quote into a live booking directly via
 * the API.
 *
 * FIX: requirePermission('sales.edit'), matching the rest of quotes/*.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
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
      role: roleHolder.role,
    })),
  }
})

import { POST } from './route'

function seed() {
  return {
    quotes: [
      {
        id: 'quote-1', tenant_id: A, status: 'accepted', client_id: 'client-1',
        converted_booking_id: null, converted_at: null,
        quote_number: 'Q-202607-0001', total_cents: 10000, notes: null,
        contact_email: null, service_address: null,
      },
    ],
    clients: [{ id: 'client-1', tenant_id: A, email: 'client@example.com' }],
    bookings: [],
    quote_activity: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

const params = () => ({ params: Promise.resolve({ id: 'quote-1' }) })
function req() {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({ start_time: '2026-08-01T09:00:00.000Z' }) })
}

describe('POST /api/quotes/[id]/convert — permission probe', () => {
  it('owner (has sales.edit) can convert an accepted quote', async () => {
    const res = await POST(req(), params())
    expect(res.status).toBe(200)
    expect(h.capture.inserts.some((i) => i.table === 'bookings')).toBe(true)
    expect(h.capture.updates.some((u) => u.table === 'quotes')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and nothing is converted", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req(), params())
    expect(res.status).toBe(403)
    expect(h.capture.inserts.some((i) => i.table === 'bookings')).toBe(false)
    expect(h.capture.updates.some((u) => u.table === 'quotes')).toBe(false)
  })
})
