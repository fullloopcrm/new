import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/leads/domains called getTenantForRequest() with zero permission
 * check -- any authenticated tenant member, incl. 'staff' (which lacks
 * leads.view by default), could list every tracked domain plus its visit/CTA
 * counts. Sibling leads/override, leads/block, leads/verify already gate on
 * leads.view; now matched.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let countMode = false
  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count) countMode = true
      return c
    },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    not: () => c,
    order: () => c,
    then: (res: (v: { data: unknown; error: unknown; count?: number }) => unknown) => {
      const matched = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (countMode) return Promise.resolve(res({ data: null, error: null, count: matched.length }))
      return Promise.resolve(res({ data: matched, error: null }))
    },
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
  DB.domains = [{ id: 'domain-1', tenant_id: TENANT_A, name: 'example.com' }]
  DB.website_visits = []
})

describe('GET /api/leads/domains — permission gate', () => {
  it('403s a staff member (no leads.view by default)', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows a manager (has leads.view by default)', async () => {
    currentRole.value = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.domains).toHaveLength(1)
  })
})
