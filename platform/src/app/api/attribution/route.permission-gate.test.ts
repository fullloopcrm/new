import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/attribution previously called getTenantForRequest() with zero
 * permission check -- any authenticated tenant member, incl. 'staff' (which
 * lacks leads.view by default), could pull tenant-wide attribution stats and
 * trigger a bulk re-attribution run (POST, optionally ?reset=true clearing
 * attribution on every booking). Sibling /api/leads/attribution already
 * gates on leads.view; now matched here.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<[string, unknown]> = []
  let op: 'select' | 'insert' | 'update' = 'select'
  let payload: Row = {}
  const applyFilters = (rows: Row[]) => rows.filter((r) => filters.every(([k, v]) => r[k] === v))
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row) => { op = 'insert'; payload = p; return c },
    update: (p: Row) => { op = 'update'; payload = p; return c },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return c },
    not: () => c,
    is: () => c,
    order: () => c,
    limit: () => c,
    single: async () => {
      const matches = applyFilters(rowsOf())
      return { data: matches[0] || null, error: null }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      if (op === 'update') {
        const matches = applyFilters(rowsOf())
        matches.forEach((m) => Object.assign(m, payload))
        return Promise.resolve(res({ data: matches, error: null }))
      }
      if (op === 'insert') {
        DB[table] = [...rowsOf(), { ...payload }]
        return Promise.resolve(res({ data: payload, error: null }))
      }
      return Promise.resolve(res({ data: applyFilters(rowsOf()), error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.bookings = []
})

const postReq = (qs = '') => new Request(`http://x/api/attribution${qs}`, { method: 'POST' })
const getReq = () => new Request('http://x/api/attribution')

describe('/api/attribution — permission gate', () => {
  it('403s a staff member on GET (stats), no data leaked', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('403s a staff member on POST (attribution run), bookings untouched', async () => {
    DB.bookings = [{ id: 'b1', tenant_id: TENANT_A, attributed_domain: 'foo.com' }]
    const res = await POST(postReq('?reset=true'))
    expect(res.status).toBe(403)
    expect(DB.bookings[0].attributed_domain).toBe('foo.com')
  })

  it('allows a manager (has leads.view) on GET and POST', async () => {
    currentRole.value = 'manager'
    const getRes = await GET(getReq())
    expect(getRes.status).toBe(200)

    const postRes = await POST(postReq())
    expect(postRes.status).toBe(200)
  })
})
