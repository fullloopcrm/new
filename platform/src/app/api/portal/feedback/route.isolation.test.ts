import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — portal/feedback/route.ts (docs/adr/0004).
 * Proves POST inserts are stamped with the portal token's AUTHENTICATED
 * tenant (auth.tid), not a forged tenant_id smuggled through the request body.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function builder(table: string) {
  let insertedRow: Row | null = null
  const chain: Record<string, unknown> = {
    insert: (row: Row) => {
      insertedRow = { id: `new-${(store[table] || []).length + 1}`, ...row }
      return chain
    },
    select: () => chain,
    single: async () => {
      store[table] = [...(store[table] || []), insertedRow as Row]
      return { data: insertedRow, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentAuth: { id: string; tid: string } | null

vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

import { POST } from './route'

beforeEach(() => {
  store = { reviews: [] }
  currentAuth = { id: 'client-a', tid: 'tenant-A' }
})

function reqWith(body: Record<string, unknown>): Request {
  return new Request('http://x/api/portal/feedback', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  })
}

describe('portal/feedback POST — tenantDb stamping', () => {
  it('stamps the new review with the AUTHENTICATED tenant, not a forged body tenant_id', async () => {
    const res = await POST(reqWith({ rating: 5, comment: 'great job', tenant_id: 'tenant-B' }))
    const body = await res.json()
    expect(body.review.tenant_id).toBe('tenant-A')
    expect(body.review.client_id).toBe('client-a')
  })

  it('never lets a client stamp a review under a different tenant by any other client_id override', async () => {
    const res = await POST(reqWith({ rating: 1, client_id: 'someone-else' }))
    const body = await res.json()
    // client_id comes only from the verified token, never the body.
    expect(body.review.client_id).toBe('client-a')
    expect(body.review.tenant_id).toBe('tenant-A')
  })

  it('REJECTS the request with no bearer token before touching the DB', async () => {
    currentAuth = null
    const req = new Request('http://x/api/portal/feedback', { method: 'POST', body: JSON.stringify({ rating: 5 }) })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(store.reviews.length).toBe(0)
  })
})
