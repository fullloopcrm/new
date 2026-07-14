import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of the GET
 * /api/client/properties?include_history=true branch. The prior code read
 * `property_changes` via `.eq('tenant_id', clientRow?.tenant_id ?? '')` —
 * a manual fallback. The tenantDb() conversion instead short-circuits to an
 * empty history when the client's tenant can't be resolved (tenantDb() throws
 * on an empty tenantId), which route.property-changes-tenant-scope.test.ts
 * does not cover (it only exercises the mistagged-row and non-admin cases
 * with a resolvable tenant). This file covers the missing-tenant guard and a
 * same-client-id cross-tenant collision, using a real filtering fake DB
 * rather than asserting recorded call args.
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
vi.mock('@/lib/nycmaid/auth', () => ({
  isAdminAuthenticated: async () => true,
  protectClientAPI: async (clientId?: string) => ({ clientId }),
}))

import { GET } from './route'

beforeEach(() => {
  DB.clients = []
  DB.property_changes = []
})

describe('GET /api/client/properties?include_history=true — tenantDb guard + collision', () => {
  it('returns empty history (no throw) when the client row has no resolvable tenant_id', async () => {
    DB.clients.push({ id: 'c-orphan', tenant_id: null })
    DB.property_changes.push({ id: 'pc-orphan', client_id: 'c-orphan', tenant_id: null, action: 'add', created_at: '2099-01-01' })

    const res = await GET(new Request('https://x?client_id=c-orphan&include_history=true'))
    expect(res.status).toBe(200)
    const body = await res.json() as { history: Row[] }
    expect(body.history).toEqual([])
  })

  it('scopes history strictly to the resolved tenant even when a foreign tenant reuses the same client_id value', async () => {
    // Same client_id string appears under two different tenants (id replay) —
    // the resolved clientRow is tenant A's, so only tenant A's changes must surface.
    DB.clients.push({ id: 'c-shared', tenant_id: TENANT_A })
    DB.property_changes.push({ id: 'pc-a', client_id: 'c-shared', tenant_id: TENANT_A, action: 'add', created_at: '2099-01-01' })
    DB.property_changes.push({ id: 'pc-b-foreign', client_id: 'c-shared', tenant_id: TENANT_B, action: 'add', created_at: '2099-01-02' })

    const res = await GET(new Request('https://x?client_id=c-shared&include_history=true'))
    const body = await res.json() as { history: Row[] }
    const ids = body.history.map((h) => h.id)
    expect(ids).toEqual(['pc-a'])
  })
})
