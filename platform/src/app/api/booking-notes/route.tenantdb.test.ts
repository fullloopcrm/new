import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

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

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {},
}))

import { NextRequest } from 'next/server'
import { GET, POST } from './route'

const DB = () => h.store

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: BOOKING_ID, tenant_id: TENANT_A },
    ],
    booking_notes: [
      { id: 'note-a', tenant_id: TENANT_A, booking_id: BOOKING_ID, content: 'A own note', author_type: 'admin', author_name: 'A Admin', created_at: '2020-01-01' },
      { id: 'note-b', tenant_id: TENANT_B, booking_id: BOOKING_ID, content: 'B foreign note', author_type: 'admin', author_name: 'B Admin', created_at: '2020-01-01' },
    ],
  }
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
    const inserted = DB().booking_notes.find((r) => r.content === 'new note from A')!
    expect(inserted.tenant_id).toBe(TENANT_A)
  })
})
