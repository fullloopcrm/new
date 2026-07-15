import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 regression — GET /api/client/properties?include_history=true.
 *
 * This route used to trust lib/nycmaid/auth's isAdminAuthenticated() — a
 * legacy admin_session cookie with NO tenant binding (same class as the
 * Selena IDOR: authenticated actor, wrong-scope resource). It has since been
 * replaced with requirePermission('clients.view'|'clients.edit'), which both
 * authenticates the caller AND resolves their own tenant — so the operator's
 * tenant is the source of truth for the history read, not something derived
 * (or mistakenly trusted) from the target client_id alone. This file covers:
 *   - an operator whose tenant matches the client sees only their own
 *     tenant's property_changes rows, even if a row is mistagged;
 *   - an operator whose tenant does NOT own the client is rejected before
 *     any property/history data is returned;
 *   - a non-admin (customer-portal) caller never reaches the history branch.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let limitN: number | null = null
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => {
    const all = rowsOf().filter((r) => filters.every((f) => f(r)))
    return limitN != null ? all.slice(0, limitN) : all
  }
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    limit: (n: number) => { limitN = n; return c },
    single: async () => {
      const m = matched()
      return m[0] ? { data: m[0], error: null } : { data: null, error: { message: 'not found' } }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/client-properties', () => ({
  listProperties: async () => [],
  addProperty: async () => null,
  updateProperty: async () => null,
  setPrimaryProperty: async () => {},
  deactivateProperty: async () => {},
}))

const opCtx = { tenantId: TENANT_A as string | null }
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () =>
    opCtx.tenantId
      ? { tenant: { tenantId: opCtx.tenantId }, error: null }
      : { tenant: null, error: { status: 401 } },
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => null,
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => ({ status: 401 }),
}))

import { GET } from './route'

beforeEach(() => {
  DB.clients = []
  DB.property_changes = []
  opCtx.tenantId = TENANT_A
})

describe('GET /api/client/properties?include_history=true — tenant scope', () => {
  it('excludes a property_changes row mistagged to a foreign tenant even when client_id matches', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A })
    DB.property_changes.push({ id: 'pc-mine', client_id: 'c-1', tenant_id: TENANT_A, action: 'add', created_at: '2099-01-01' })
    DB.property_changes.push({ id: 'pc-foreign', client_id: 'c-1', tenant_id: TENANT_B, action: 'add', created_at: '2099-01-02' })

    const res = await GET(new Request('https://x?client_id=c-1&include_history=true'))
    const body = await res.json() as { history: Row[] }
    const ids = body.history.map((h) => h.id)
    expect(ids).toContain('pc-mine')
    expect(ids).not.toContain('pc-foreign')
  })

  it('returns the full history when every row is correctly tagged to the client tenant', async () => {
    DB.clients.push({ id: 'c-2', tenant_id: TENANT_A })
    DB.property_changes.push({ id: 'pc-a', client_id: 'c-2', tenant_id: TENANT_A, action: 'add', created_at: '2099-01-01' })
    DB.property_changes.push({ id: 'pc-b', client_id: 'c-2', tenant_id: TENANT_A, action: 'edit', created_at: '2099-01-02' })

    const res = await GET(new Request('https://x?client_id=c-2&include_history=true'))
    const body = await res.json() as { history: Row[] }
    expect(body.history.map((h) => h.id).sort()).toEqual(['pc-a', 'pc-b'])
  })

  it('rejects an operator whose own tenant does not own the client — no cross-tenant peek', async () => {
    // c-3 belongs to TENANT_B, but the authenticated operator's tenant is TENANT_A.
    DB.clients.push({ id: 'c-3', tenant_id: TENANT_B })
    DB.property_changes.push({ id: 'pc-x', client_id: 'c-3', tenant_id: TENANT_B, action: 'add', created_at: '2099-01-01' })

    const res = await GET(new Request('https://x?client_id=c-3&include_history=true'))
    expect(res.status).toBe(404)
    const body = await res.json() as { history?: Row[] }
    expect(body.history).toBeUndefined()
  })

  it('non-admin callers never reach the history branch (client-session gate unchanged)', async () => {
    opCtx.tenantId = null // operator auth fails -> falls through to client-session path, which also fails here
    DB.clients.push({ id: 'c-4', tenant_id: TENANT_A })
    DB.property_changes.push({ id: 'pc-x', client_id: 'c-4', tenant_id: TENANT_A, action: 'add', created_at: '2099-01-01' })

    const res = await GET(new Request('https://x?client_id=c-4&include_history=true'))
    expect(res.status).toBe(401)
    const body = await res.json() as { history?: Row[] }
    expect(body.history).toBeUndefined()
  })
})
