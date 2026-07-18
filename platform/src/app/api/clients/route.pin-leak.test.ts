import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/clients did `select('*')` and returned it verbatim. clients.pin
 * is the plaintext 6-digit client-portal login credential (see
 * /api/client/login), and clients.view is held down to the 'staff' role --
 * without stripping it, any staff-tier dashboard user could pull every
 * client's PIN off this list and log into the portal as them. Same class as
 * the /api/cleaners (team_members.pin) leak.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [
    { id: 'c1', tenant_id: TENANT_A, name: 'Jane Doe', email: 'jane@example.com', pin: '482913' },
  ],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    range: () => c,
    or: () => c,
    then: (res: (v: { data: unknown; count: number; error: unknown }) => unknown) => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve(res({ data: rows, count: rows.length, error: null }))
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
import { NextRequest } from 'next/server'

function req() {
  return new NextRequest('http://localhost/api/clients')
}

describe('GET /api/clients — pin exposure', () => {
  it('never includes the plaintext portal-login pin in the response', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.clients).toHaveLength(1)
    expect(body.clients[0]).not.toHaveProperty('pin')
    expect(body.clients[0]).toMatchObject({ name: 'Jane Doe', email: 'jane@example.com' })
  })
})
