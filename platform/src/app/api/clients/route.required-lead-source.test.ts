import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * lss-08 readiness finding (2026-08-01): 90% of real clients had zero
 * lead-source record at all, because every direct-client-creation path
 * (this one included) let it through as fully optional free text. Now
 * required and constrained to the curated LEAD_SOURCE_OPTIONS list.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

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
          const row = { id: genId(), tenant_id: TENANT, ...payload }
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

describe('POST /api/clients — required lead source', () => {
  beforeEach(() => {
    store.clients = []
    store.sales_partners = []
    store.referrers = []
    idSeq = 0
  })

  it('rejects a new client with no source at all', async () => {
    const res = await POST(jsonReq({ name: 'Jane Doe', phone: '212-555-1234' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/lead source/i)
  })

  it('rejects a source value outside the curated list', async () => {
    const res = await POST(jsonReq({ name: 'Jane Doe', phone: '212-555-1234', source: 'made-up-value' }))
    expect(res.status).toBe(400)
  })

  it('accepts a valid curated source value', async () => {
    const res = await POST(jsonReq({ name: 'Jane Doe', phone: '212-555-1234', source: 'referral' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.client.source).toBe('referral')
  })
})
