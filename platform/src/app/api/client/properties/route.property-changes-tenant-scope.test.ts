import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 regression — GET /api/client/properties?include_history=true.
 *
 * isAdminAuthenticated() (lib/nycmaid/auth) is a legacy admin_session cookie
 * with NO tenant binding (same class as the Selena IDOR: authenticated actor,
 * wrong-scope resource). Before this fix, the property_changes read filtered
 * only by client_id, so a property_changes row mistagged to a foreign tenant
 * (or an admin session for a different tenant altogether) would still surface
 * in the history. The fix resolves the client's OWN tenant_id and requires
 * every returned row to match it.
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

const adminCtx = { value: true }
vi.mock('@/lib/nycmaid/auth', () => ({
  isAdminAuthenticated: async () => adminCtx.value,
  protectClientAPI: async (clientId?: string) => ({ clientId }),
}))

import { GET } from './route'

beforeEach(() => {
  DB.clients = []
  DB.property_changes = []
  adminCtx.value = true
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

  it('non-admin callers never reach the history branch (require_client_session gate unchanged)', async () => {
    adminCtx.value = false
    DB.clients.push({ id: 'c-3', tenant_id: TENANT_A })
    DB.property_changes.push({ id: 'pc-x', client_id: 'c-3', tenant_id: TENANT_A, action: 'add', created_at: '2099-01-01' })

    const res = await GET(new Request('https://x?client_id=c-3&include_history=true'))
    const body = await res.json() as { history?: Row[] }
    expect(body.history).toBeUndefined()
  })
})
