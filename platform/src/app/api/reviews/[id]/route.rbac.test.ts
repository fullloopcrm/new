import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/reviews/[id] checked only getTenantForRequest() (any authenticated
 * tenant member) with no requirePermission() call, even though the sibling
 * admin/reviews route gates the identical status/rating/comment mutation on
 * reviews.request. 'staff' has reviews.view but NOT reviews.request, so it
 * could approve/reject/edit any review via direct API call.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = { reviews: [] }
let currentRole = 'staff'

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        if (kind === 'update') {
          const idx = (store[table] || []).findIndex(match)
          if (idx === -1) return { data: null, error: { message: 'not found' } }
          store[table][idx] = { ...store[table][idx], ...payload }
          return { data: store[table][idx], error: null }
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
  getTenantForRequest: async () => ({ tenantId: TENANT, role: currentRole, tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

import { PUT } from '@/app/api/reviews/[id]/route'

function putReq(body: unknown): Request {
  return new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
}

describe('PUT /api/reviews/[id] — RBAC enforcement', () => {
  beforeEach(() => {
    store.reviews = [{ id: 'r1', tenant_id: TENANT, status: 'pending', rating: 3 }]
    currentRole = 'staff'
  })

  it('staff (no reviews.request) cannot approve a review', async () => {
    currentRole = 'staff'
    const res = await PUT(putReq({ status: 'approved' }), { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(403)
    expect(store.reviews[0].status).toBe('pending')
  })

  it('admin (has reviews.request) can approve a review', async () => {
    currentRole = 'admin'
    const res = await PUT(putReq({ status: 'approved' }), { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(200)
    expect(store.reviews[0].status).toBe('approved')
  })
})
