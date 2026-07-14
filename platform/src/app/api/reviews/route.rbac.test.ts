import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/reviews checked only getTenantForRequest() (any
 * authenticated tenant member) with no requirePermission() call, even
 * though rbac.ts already defines reviews.view/reviews.request and the
 * sibling admin/reviews route correctly gates GET on reviews.view and
 * PUT/DELETE on reviews.request. 'staff' has reviews.view but NOT
 * reviews.request, so it could POST a brand-new review row with an
 * attacker-chosen status (e.g. 'approved') straight past moderation --
 * the exact mutation admin/reviews' PUT gates on reviews.request for.
 * Real rbac.ts hasPermission() drives the assertions below (tenant-query
 * is mocked only for role/tenantId; requirePermission and rbac are real).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = { reviews: [] }
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
      order: () => c,
      single: async () => {
        if (kind === 'insert') {
          const row = { id: `${table}-new`, ...payload }
          store[table] = [...(store[table] || []), row]
          return { data: row, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
        res({ data: (store[table] || []).filter(match), error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, role: currentRole, tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

import { GET, POST } from '@/app/api/reviews/route'

function postReq(body: unknown): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

describe('GET/POST /api/reviews — RBAC enforcement', () => {
  beforeEach(() => {
    store.reviews = [{ id: 'r1', tenant_id: TENANT, status: 'pending' }]
    currentRole = 'staff'
  })

  it('staff (has reviews.view) can list reviews', async () => {
    currentRole = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('staff (no reviews.request) cannot directly insert an approved review', async () => {
    currentRole = 'staff'
    const res = await POST(postReq({
      client_id: 'bbbbbbbb-1111-2222-3333-444444444444',
      rating: 5,
      status: 'approved',
    }))
    expect(res.status).toBe(403)
    expect(store.reviews.length).toBe(1)
  })

  it('manager (has reviews.request) can insert a review', async () => {
    currentRole = 'manager'
    const res = await POST(postReq({
      client_id: 'bbbbbbbb-1111-2222-3333-444444444444',
      rating: 5,
      status: 'approved',
    }))
    expect(res.status).toBe(201)
    expect(store.reviews.length).toBe(2)
  })
})
