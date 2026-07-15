import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — booking-notes/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') actually excludes a foreign
 * tenant's note on a booking_id that only filters by booking_id in the
 * request (GET), and that POST inserts are stamped with the AUTHENTICATED
 * tenant regardless of anything in the request body.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let insertedRow: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    insert: (row: Row) => {
      insertedRow = { id: `new-${(store[table] || []).length + 1}`, ...row }
      return chain
    },
    single: async () => {
      store[table] = [...(store[table] || []), insertedRow as Row]
      return { data: insertedRow, error: null }
    },
    maybeSingle: async () => {
      const found = (store[table] || []).find((r) => matches(r, eqs))
      return { data: found ?? null, error: null }
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (store[table] || []).filter((r) => matches(r, eqs)), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenant: string

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    bookings: [
      { id: 'shared-booking', tenant_id: 'tenant-A' },
    ],
    booking_notes: [
      { id: 'note-a', tenant_id: 'tenant-A', booking_id: 'shared-booking', author_type: 'admin', author_name: 'Admin A', content: 'Note from A' },
      { id: 'note-b', tenant_id: 'tenant-B', booking_id: 'shared-booking', author_type: 'admin', author_name: 'Admin B', content: 'Note from B' },
    ],
  }
  currentTenant = 'tenant-A'
})

function reqFor(bookingId: string): Request {
  return new Request(`http://x/api/booking-notes?booking_id=${bookingId}`)
}

describe('booking-notes GET — tenantDb isolation', () => {
  it("never returns another tenant's note, even when both tenants have a note on the SAME booking_id", async () => {
    const res = await GET(reqFor('shared-booking'))
    const body = await res.json()
    const ids = body.map((r: Row) => r.id)
    expect(ids).toContain('note-a')
    expect(ids).not.toContain('note-b')
  })
})

describe('booking-notes POST — tenantDb stamping', () => {
  it('stamps the new row with the authenticated tenant, not a forged body tenant_id', async () => {
    const req = new Request('http://x/api/booking-notes', {
      method: 'POST',
      body: JSON.stringify({ booking_id: 'shared-booking', content: 'New note', tenant_id: 'tenant-B' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(body.tenant_id).toBe('tenant-A')

    currentTenant = 'tenant-B'
    const resB = await GET(reqFor('shared-booking'))
    const bodyB = await resB.json()
    expect(bodyB.map((r: Row) => r.id)).not.toContain(body.id)
  })
})
