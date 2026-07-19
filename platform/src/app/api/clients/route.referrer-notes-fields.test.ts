import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/clients built its insert row from a validate() allow-list that
 * silently dropped referrer_id and notes -- even though BookingsAdmin.tsx's
 * "New Client" modal sends both on every create (a <select> for referrer_id,
 * a <textarea> for notes). referrer_id loss meant the sticky commission
 * attribution (clients.referrer_id, read on every completed cleaning per
 * 2026_07_18_sales_partners.sql) never got set for phone-booked clients
 * whose referrer staff picked manually, silently losing that referrer's
 * commission on every future booking for that client. Same allow-list-drops-
 * a-real-field shape as the bookings/batch fix in 8b6486b2.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_REFERRER = 'bbbbbbbb-0001-0001-0001-000000000001'
const FOREIGN_REFERRER = 'bbbbbbbb-0002-0002-0002-000000000002'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}
let idSeq = 0
const genId = () => `client-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      limit: () => c,
      maybeSingle: async () => {
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      single: async () => {
        if (kind === 'insert') {
          const row = { id: genId(), ...payload }
          store[table] = [...(store[table] || []), row]
          return { data: row, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    default_client_status: 'active',
    require_client_phone: false,
    require_client_email: false,
  }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from './route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/clients', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/clients — referrer_id and notes', () => {
  beforeEach(() => {
    store.clients = []
    store.sales_partners = []
    store.referrers = [
      { id: OWN_REFERRER, tenant_id: TENANT, name: 'Own Referrer' },
      { id: FOREIGN_REFERRER, tenant_id: OTHER_TENANT, name: 'Foreign Referrer' },
    ]
    idSeq = 0
  })

  it('persists referrer_id and notes instead of silently dropping them', async () => {
    const res = await POST(jsonReq({
      name: 'Jane Doe', phone: '212-555-1234', referrer_id: OWN_REFERRER, notes: 'Met at the farmers market',
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.client.referrer_id).toBe(OWN_REFERRER)
    expect(body.client.notes).toBe('Met at the farmers market')
  })

  it('rejects a referrer_id belonging to a different tenant', async () => {
    const res = await POST(jsonReq({
      name: 'Jane Doe', phone: '212-555-1234', referrer_id: FOREIGN_REFERRER,
    }))
    expect(res.status).toBe(400)
  })
})
