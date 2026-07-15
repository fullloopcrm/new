import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — portal/notes/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops a portal token from
 * one tenant from reading/writing a same-id client row owned by another
 * tenant (id collision across tenants), even though the route only filters
 * by client id + the token's own tenant claim.
 *
 * Also locks the client/staff field-separation fix: the route must read/write
 * clients.special_instructions only, never clients.notes (the internal
 * operator note field) -- a client-portal token must not be able to read or
 * overwrite staff's private notes about that client.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let updateValues: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    update: (values: Row) => {
      updateValues = values
      return chain
    },
    single: async () => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs))
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}` } }
      return { data: rows[0], error: null }
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      const rows = store[table] || []
      if (updateValues) {
        for (const row of rows) {
          if (matches(row, eqs)) Object.assign(row, updateValues)
        }
      }
      return resolve({ data: rows.filter((r) => matches(r, eqs)), error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.hoisted(() => {
  process.env.PORTAL_SECRET = 'test-portal-secret'
})

import { createToken } from '../auth/token'
import { GET, PUT } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const CLIENT_ID = 'client-shared-id' // same client id row-collision across tenants

beforeEach(() => {
  store = {
    clients: [
      { id: CLIENT_ID, tenant_id: A_ID, special_instructions: 'A private note', notes: 'A internal operator note' },
      { id: CLIENT_ID, tenant_id: B_ID, special_instructions: 'B private note', notes: 'B internal operator note' },
    ],
  }
})

function reqWithToken(tenantId: string, method = 'GET', body?: unknown): Request {
  const token = createToken(CLIENT_ID, tenantId)
  return new Request('http://x/api/portal/notes', {
    method,
    headers: { authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('portal/notes GET — tenantDb isolation', () => {
  it("tenant A's portal token reads tenant A's note (positive control)", async () => {
    const res = await GET(reqWithToken(A_ID) as never)
    const body = await res.json()
    expect(body.notes).toBe('A private note')
  })

  it("tenant A's portal token NEVER returns tenant B's note, even though the client id row-collides", async () => {
    const res = await GET(reqWithToken(A_ID) as never)
    const body = await res.json()
    expect(body.notes).not.toBe('B private note')
  })
})

describe('portal/notes PUT — tenantDb isolation', () => {
  it("tenant A writing its note does not mutate tenant B's row with the same client id", async () => {
    const res = await PUT(reqWithToken(A_ID, 'PUT', { notes: 'A UPDATED' }) as never)
    expect(res.status).toBe(200)

    const aRow = store.clients.find((r) => r.tenant_id === A_ID)!
    const bRow = store.clients.find((r) => r.tenant_id === B_ID)!
    expect(aRow.special_instructions).toBe('A UPDATED')
    expect(bRow.special_instructions).toBe('B private note')
  })
})

describe('portal/notes — client/staff field separation', () => {
  it('GET never returns the internal operator note (clients.notes)', async () => {
    const res = await GET(reqWithToken(A_ID) as never)
    const body = await res.json()
    expect(body.notes).toBe('A private note')
    expect(body.notes).not.toBe('A internal operator note')
  })

  it('PUT never mutates the internal operator note (clients.notes)', async () => {
    const res = await PUT(reqWithToken(A_ID, 'PUT', { notes: 'client-submitted text' }) as never)
    expect(res.status).toBe(200)

    const aRow = store.clients.find((r) => r.tenant_id === A_ID)!
    expect(aRow.special_instructions).toBe('client-submitted text')
    expect(aRow.notes).toBe('A internal operator note')
  })
})
