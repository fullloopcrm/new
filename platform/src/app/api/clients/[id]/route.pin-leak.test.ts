import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/clients/[id] did `select('*')` and returned it verbatim, same as
 * the list route. clients.pin is the plaintext 6-digit client-portal login
 * credential (see /api/client/login) -- strip it here too.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CLIENT_ID = 'c1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [{ id: CLIENT_ID, tenant_id: TENANT_A, name: 'Jane Doe', email: 'jane@example.com', pin: '482913' }],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: () => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'not found' } })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT_A,
    role: 'staff',
    tenant: { selena_config: {} },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

function params() {
  return { params: Promise.resolve({ id: CLIENT_ID }) }
}

describe('GET /api/clients/[id] — pin exposure', () => {
  it('never includes the plaintext portal-login pin in the response', async () => {
    const res = await GET(new Request('http://localhost'), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client.id).toBe(CLIENT_ID)
    expect(body.client).not.toHaveProperty('pin')
  })
})
