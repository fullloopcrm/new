import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/leads/attribution called getTenantForRequest() with zero
 * permission check -- any authenticated tenant member, incl. 'staff' (which
 * lacks leads.view by default), could pull tenant-wide source attribution
 * data. Sibling leads/override, leads/block, leads/verify already gate on
 * leads.view; now matched.
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
    not: () => c,
    order: () => c,
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
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ attribution_window_hours: 24 }),
}))

import { GET } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.website_visits = [
    { tenant_id: TENANT_A, referrer: 'https://google.com/search' },
  ]
})

describe('GET /api/leads/attribution — permission gate', () => {
  it('403s a staff member (no leads.view by default)', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows a manager (has leads.view by default)', async () => {
    currentRole.value = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(1)
  })
})
