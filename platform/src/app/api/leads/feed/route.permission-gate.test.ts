import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/leads/feed called getTenantForRequest() with zero permission
 * check -- any authenticated tenant member, incl. 'staff' (which lacks
 * leads.view by default), could pull the full visitor/lead feed, including
 * client name/email/phone/address/notes. Sibling leads/override, leads/block,
 * leads/verify already gate on leads.view; now matched.
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
  DB.lead_clicks = []
  DB.clients = [{ id: 'client-1', tenant_id: TENANT_A, name: 'Client A', email: 'a@example.com', created_at: new Date().toISOString() }]
  DB.bookings = []
})

function req() {
  return new Request('http://test/api/leads/feed') as unknown as import('next/server').NextRequest
}

describe('GET /api/leads/feed — permission gate', () => {
  it('403s a staff member (no leads.view by default)', async () => {
    const res = await GET(req())
    expect(res.status).toBe(403)
  })

  it('allows a manager (has leads.view by default)', async () => {
    currentRole.value = 'manager'
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.feed)).toBe(true)
  })
})
