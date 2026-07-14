import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/reviews/request checked only getTenantForRequest() (any
 * authenticated tenant member) with no requirePermission() call, despite
 * matching exactly the reviews.request permission's name/purpose (trigger
 * a real outbound email/SMS review-request to a client). 'staff' has
 * reviews.view but NOT reviews.request.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {
  reviews: [],
  clients: [{ id: 'c1', tenant_id: TENANT, name: 'Vic Tim', email: 'vic@example.com', phone: null }],
}
let currentRole = 'staff'

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
      single: async () => {
        if (kind === 'insert') {
          const row = { id: `${table}-new`, ...payload }
          store[table] = [...(store[table] || []), row]
          return { data: row, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, role: currentRole, tenant: { name: 'Acme', google_place_id: null } }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from '@/app/api/reviews/request/route'

function postReq(body: unknown): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/reviews/request — RBAC enforcement', () => {
  beforeEach(() => {
    store.reviews = []
    currentRole = 'staff'
  })

  it('staff (no reviews.request) cannot trigger a review request', async () => {
    currentRole = 'staff'
    const res = await POST(postReq({ client_id: 'c1' }))
    expect(res.status).toBe(403)
    expect(store.reviews.length).toBe(0)
  })

  it('manager (has reviews.request) can trigger a review request', async () => {
    currentRole = 'manager'
    const res = await POST(postReq({ client_id: 'c1' }))
    expect(res.status).toBe(200)
    expect(store.reviews.length).toBe(1)
  })
})
