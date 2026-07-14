import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/client/properties?include_history=true — tenant-scope gap.
 *
 * isAdminAuthenticated() (lib/nycmaid/auth) is a legacy admin_session cookie
 * with NO tenant binding — same class as the Selena IDOR (authenticated
 * actor, wrong-scope resource). Before this fix, the property_changes read
 * filtered only by client_id, so a property_changes row mistagged to a
 * foreign tenant would still surface in the history. Fixed by resolving the
 * client's OWN tenant_id and requiring every returned row to match it.
 */

const h = vi.hoisted(() => ({
  clients: [] as Array<Record<string, unknown>>,
  propertyChanges: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/nycmaid/auth', () => ({
  isAdminAuthenticated: vi.fn(async () => true),
  protectClientAPI: vi.fn(async () => ({})),
}))
vi.mock('@/lib/client-properties', () => ({
  listProperties: vi.fn(async () => []),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        const chain = {
          select: () => chain,
          eq: () => chain,
          single: async () => ({ data: h.clients[0] ?? null, error: null }),
        }
        return chain
      }
      if (table === 'property_changes') {
        const filters: Record<string, unknown> = {}
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: (col: string, val: unknown) => { filters[col] = val; return chain },
          order: () => chain,
          limit: async () => ({
            data: h.propertyChanges.filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v)),
            error: null,
          }),
        }
        return chain
      }
      const generic = { select: () => generic, eq: () => generic, single: async () => ({ data: null, error: null }) }
      return generic
    },
  },
}))

import { GET } from './route'

const CLIENT_A = 'client-A'
const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

function req(clientId: string): Request {
  return new Request(`http://localhost/api/client/properties?client_id=${clientId}&include_history=true`)
}

beforeEach(() => {
  h.clients = [{ id: CLIENT_A, tenant_id: TENANT_A }]
  h.propertyChanges = [
    { id: 'chg-1', client_id: CLIENT_A, tenant_id: TENANT_A, action: 'add' },
    { id: 'chg-2', client_id: CLIENT_A, tenant_id: TENANT_B, action: 'edit' }, // mistagged foreign-tenant row
  ]
})

describe('GET /api/client/properties?include_history=true — tenant scope', () => {
  it("excludes a property_changes row mistagged to a foreign tenant, even though client_id matches", async () => {
    const res = await GET(req(CLIENT_A) as never)
    const body = await res.json()
    const ids = body.history.map((h: { id: string }) => h.id)
    expect(ids).toEqual(['chg-1'])
    expect(ids).not.toContain('chg-2')
  })

  it('returns the correctly-tagged rows in full', async () => {
    const res = await GET(req(CLIENT_A) as never)
    const body = await res.json()
    expect(body.history).toHaveLength(1)
    expect(body.history[0]).toMatchObject({ id: 'chg-1', action: 'add' })
  })

  it('returns empty history (not an error) when the client itself cannot be resolved to a tenant', async () => {
    h.clients = []
    const res = await GET(req(CLIENT_A) as never)
    const body = await res.json()
    expect(body.history).toEqual([])
  })
})
