import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/POST /api/waitlist.
 * Both the waitlist/sms_conversations reads (GET, admin) and the waitlist
 * insert (POST, public lead capture) used to carry a manual tenant_id filter
 * or literal — proves tenantDb() still excludes a foreign tenant's rows and
 * still stamps the caller's own tenant_id on insert.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) >= (val as string)); return c },
    order: () => c,
    limit: () => c,
    insert: (row: Row) => {
      rowsOf().push(row)
      return { then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }) }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_A, phone: null }),
}))

import { NextRequest } from 'next/server'
import { GET, POST } from './route'

beforeEach(() => {
  DB.waitlist = [
    { id: 'w-a', tenant_id: TENANT_A, name: 'A Client', phone: '1', service_type: null, preferred_date: null, preferred_time: null, created_at: new Date().toISOString(), client_id: null, source: 'web', status: 'open' },
    { id: 'w-b', tenant_id: TENANT_B, name: 'B Client', phone: '2', service_type: null, preferred_date: null, preferred_time: null, created_at: new Date().toISOString(), client_id: null, source: 'web', status: 'open' },
  ]
  DB.sms_conversations = []
})

describe('GET /api/waitlist — tenantDb scoping', () => {
  it('does not return a foreign tenant\'s waitlist entries', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.map((e: { id: string }) => e.id)).toEqual(['w-a'])
  })
})

describe('POST /api/waitlist — tenantDb scoping', () => {
  it('stamps the caller tenant\'s own id on insert, ignoring any caller-supplied tenant_id', async () => {
    const req = new NextRequest('https://x/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New Lead', phone: '555-1234', tenant_id: TENANT_B }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const inserted = DB.waitlist.find((r) => r.name === 'New Lead')!
    expect(inserted.tenant_id).toBe(TENANT_A)
  })
})
