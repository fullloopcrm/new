import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/POST
 * /api/booking-notes. Both the notes-by-booking-id read and the note insert
 * used to carry a manual .eq('tenant_id', ctx.tenantId) filter. Proves a
 * caller never reads a foreign tenant's notes for a booking_id shared across
 * tenants, and every inserted note is stamped with the caller's real tenant.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
let idSeq = 0

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => Promise.resolve({ data: matched(), error: null }),
    insert: (row: Row) => {
      const created = { id: `note-${++idSeq}`, ...row }
      rowsOf().push(created)
      return { select: () => ({ single: async () => ({ data: created, error: null }) }) }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'owner', tenant: {} }),
  AuthError: class AuthError extends Error {},
}))

import { NextRequest } from 'next/server'
import { GET, POST } from './route'

beforeEach(() => {
  DB.booking_notes = [
    { id: 'note-a', tenant_id: TENANT_A, booking_id: BOOKING_ID, content: 'A own note', author_type: 'admin', author_name: 'A Admin', created_at: '2020-01-01' },
    { id: 'note-b', tenant_id: TENANT_B, booking_id: BOOKING_ID, content: 'B foreign note', author_type: 'admin', author_name: 'B Admin', created_at: '2020-01-01' },
  ]
})

describe('GET /api/booking-notes — tenantDb scoping', () => {
  it('returns only the caller tenant\'s notes for a booking_id shared across tenants', async () => {
    const req = new NextRequest(`https://x/api/booking-notes?booking_id=${BOOKING_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].content).toBe('A own note')
  })
})

describe('POST /api/booking-notes — tenantDb scoping', () => {
  it('stamps the caller\'s real tenant on the inserted note', async () => {
    const req = new NextRequest('https://x/api/booking-notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID, content: 'new note from A' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tenant_id).toBe(TENANT_A)
    const inserted = DB.booking_notes.find((r) => r.content === 'new note from A')!
    expect(inserted.tenant_id).toBe(TENANT_A)
  })
})
