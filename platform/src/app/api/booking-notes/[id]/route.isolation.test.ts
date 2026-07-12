import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — DELETE /api/booking-notes/[id] (converted to tenantDb).
 *
 * The route looks the note up AND deletes it through tenantDb, so both the
 * SELECT and the DELETE carry `.eq('tenant_id', ctx)`. Deleting another tenant's
 * note id must be indistinguishable from deleting a non-existent one: 404, and
 * the foreign row must remain in the table untouched. This is the wrong-tenant
 * probe — a route that forgot the tenant filter would 200 and destroy a
 * cross-tenant row.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
// storage is unreferenced here: both cases seed empty `images`, so the remove()
// loop never runs. Only `from` (the harness) is needed.
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
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { DELETE } from './route'

function seed() {
  return {
    booking_notes: [
      { id: 'note-a', tenant_id: CTX_TENANT, images: [] },
      { id: 'note-b', tenant_id: OTHER_TENANT, images: [] },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('booking-notes/[id] DELETE — tenant isolation', () => {
  it('positive control: tenant A deletes its OWN note', async () => {
    const res = await DELETE(new Request('http://t/api/booking-notes/note-a', { method: 'DELETE' }), ctx('note-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(h.seed.booking_notes.some((n) => n.id === 'note-a')).toBe(false)
  })

  it("wrong-tenant probe: deleting tenant B's note returns 404 and leaves the row intact", async () => {
    const res = await DELETE(new Request('http://t/api/booking-notes/note-b', { method: 'DELETE' }), ctx('note-b'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
    // The foreign row was NOT deleted.
    expect(h.seed.booking_notes.some((n) => n.id === 'note-b')).toBe(true)
    expect(h.capture.deletes).toHaveLength(0)
  })
})
