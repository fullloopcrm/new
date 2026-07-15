import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/attribution/manual previously called getTenantForRequest()
 * with zero permission check -- any authenticated tenant member, incl.
 * 'staff' (which lacks leads.view by default), could list recent bookings
 * with client PII and overwrite a booking's attributed_domain. Sibling
 * /api/attribution and /api/leads/attribution already gate on leads.view;
 * now matched here.
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
  DB.bookings = [{ id: 'b1', tenant_id: TENANT_A, attributed_domain: null, clients: { name: 'Jane' } }]
  DB.notifications = []
})

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('/api/attribution/manual — permission gate', () => {
  it('403s a staff member listing bookings for manual attribution', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('403s a staff member overriding attribution, booking untouched, no notification', async () => {
    const res = await POST(postReq({ booking_id: 'b1', domain: 'evil.com' }))
    expect(res.status).toBe(403)
    expect(DB.bookings[0].attributed_domain).toBe(null)
    expect(DB.notifications.length).toBe(0)
  })

  it('allows a manager (has leads.view) to list and override', async () => {
    currentRole.value = 'manager'
    const getRes = await GET()
    expect(getRes.status).toBe(200)

    const postRes = await POST(postReq({ booking_id: 'b1', domain: 'good.com' }))
    expect(postRes.status).toBe(200)
    expect(DB.bookings[0].attributed_domain).toBe('good.com')
    expect(DB.notifications.length).toBe(1)
  })
})
