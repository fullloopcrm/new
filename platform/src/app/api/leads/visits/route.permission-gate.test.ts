import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/leads/visits called getTenantForRequest() with zero permission
 * check -- any authenticated tenant member, incl. 'staff' (which lacks
 * leads.view by default), could pull the full website-visits analytics feed.
 * Sibling leads/override, leads/block, leads/verify already gate on
 * leads.view; now matched. (POST stays public -- it's the unauthenticated
 * tracking pixel called by t.js.)
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    gte: () => c,
    order: () => c,
    limit: () => c,
    then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null })),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.website_visits = [
    { tenant_id: TENANT_A, session_id: 's1', visitor_id: 'v1', action: 'visit', device: 'desktop', page_url: '/', created_at: new Date().toISOString() },
  ]
})

function req() {
  return new Request('http://test/api/leads/visits?period=week') as unknown as import('next/server').NextRequest
}

describe('GET /api/leads/visits — permission gate', () => {
  it('403s a staff member (no leads.view by default)', async () => {
    const res = await GET(req())
    expect(res.status).toBe(403)
  })

  it('allows a manager (has leads.view by default)', async () => {
    currentRole.value = 'manager'
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats.pageViews).toBe(1)
  })
})
