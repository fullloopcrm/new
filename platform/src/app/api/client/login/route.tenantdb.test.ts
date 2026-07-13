import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/client/login.
 * A fake PostgREST layer applies every `.eq` predicate against a seeded
 * two-tenant dataset, so a route that silently reverted to unscoped
 * supabaseAdmin would let a PIN collision across tenants log in as the
 * wrong client.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    maybeSingle: async () => ({ data: matched()[0] || null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const tenantCtx: { value: { id: string } } = { value: { id: TENANT_A } }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/client-auth', () => ({
  createClientSession: (clientId: string, tenantId: string) => `${clientId}.${tenantId}.token`,
  clientSessionCookieOptions: () => ({ name: 'client_session', httpOnly: true, secure: false, sameSite: 'strict' as const, path: '/', maxAge: 2592000 }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: () => {} }),
}))

import { POST } from './route'

beforeEach(() => {
  DB.clients = []
  tenantCtx.value = { id: TENANT_A }
})

function req(pin: string): Request {
  return new Request('https://x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pin }),
  })
}

describe('POST /api/client/login — tenantDb scoping', () => {
  it('rejects a PIN that only matches a client in a different tenant', async () => {
    DB.clients.push({ id: 'c-evil', tenant_id: TENANT_B, pin: '123456', do_not_service: false })
    const res = await POST(req('123456'))
    expect(res.status).toBe(401)
  })

  it('logs in the client whose PIN matches within the caller tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, pin: '123456', do_not_service: false })
    const res = await POST(req('123456'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ client_id: 'c-1' })
  })

  it('prefers the caller-tenant match over a same-PIN row in a foreign tenant', async () => {
    DB.clients.push({ id: 'c-evil', tenant_id: TENANT_B, pin: '654321', do_not_service: false })
    DB.clients.push({ id: 'c-real', tenant_id: TENANT_A, pin: '654321', do_not_service: false })
    const res = await POST(req('654321'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ client_id: 'c-real' })
  })
})
