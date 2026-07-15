import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — crews/route.ts (docs/adr/0004).
 *
 * `crews` is tenant-owned (tenant_id column) and now goes through tenantDb.
 * `crew_members` has NO tenant_id column of its own, so it stays on
 * supabaseAdmin — its safety depends entirely on the caller verifying the
 * crewId belongs to the tenant first.
 *
 * PATCH previously did NOT verify that before calling setMembers(): a caller
 * could pass a foreign tenant's crew id and setMembers() would unconditionally
 * wipe that tenant's crew_members and rewrite them with the CALLER's own
 * (validated) team members — a cross-tenant destructive write, not just a
 * read leak. This suite proves the fix: PATCH now 404s on a foreign crew id
 * BEFORE touching crew_members at all.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let insertedRows: Row[] | null = null
  let updateValues: Row | null = null
  let inFilter: { col: string; vals: unknown[] } | null = null
  let isDelete = false

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      inFilter = { col, vals }
      return chain
    },
    order: () => chain,
    insert: (rows: Row | Row[]) => {
      const arr = Array.isArray(rows) ? rows : [rows]
      insertedRows = arr.map((r) => ('id' in r ? r : { id: `new-${(store[table] || []).length + 1}`, ...r }))
      return chain
    },
    update: (values: Row) => {
      updateValues = values
      return chain
    },
    delete: () => {
      isDelete = true
      return chain
    },
    maybeSingle: async () => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs))
      return { data: rows[0] ?? null, error: null }
    },
    single: async () => {
      if (insertedRows) {
        store[table] = [...(store[table] || []), ...insertedRows]
        return { data: insertedRows[0], error: null }
      }
      const rows = (store[table] || []).filter((r) => matches(r, eqs))
      return { data: rows[0] ?? null, error: null }
    },
    then: (resolve: (v: { data: Row[] | null; error: null }) => unknown) => {
      if (isDelete) {
        store[table] = (store[table] || []).filter((r) => !matches(r, eqs))
        return resolve({ data: null, error: null })
      }
      if (updateValues) {
        const rows = store[table] || []
        for (const r of rows) if (matches(r, eqs)) Object.assign(r, updateValues)
        return resolve({ data: rows.filter((r) => matches(r, eqs)), error: null })
      }
      if (insertedRows) {
        store[table] = [...(store[table] || []), ...insertedRows]
        return resolve({ data: insertedRows, error: null })
      }
      let rows = (store[table] || []).filter((r) => matches(r, eqs))
      if (inFilter) rows = rows.filter((r) => (inFilter as { col: string; vals: unknown[] }).vals.includes(r[(inFilter as { col: string; vals: unknown[] }).col]))
      return resolve({ data: rows, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenant: string

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET, POST, PATCH } from './route'

beforeEach(() => {
  store = {
    crews: [
      { id: 'crew-a', tenant_id: 'tenant-A', name: 'Crew A', color: null, active: true },
      { id: 'crew-b', tenant_id: 'tenant-B', name: 'Crew B', color: null, active: true },
    ],
    crew_members: [
      { crew_id: 'crew-b', team_member_id: 'tm-b' },
    ],
    team_members: [
      { id: 'tm-a', tenant_id: 'tenant-A', name: 'A Worker' },
      { id: 'tm-b', tenant_id: 'tenant-B', name: 'B Worker' },
    ],
  }
  currentTenant = 'tenant-A'
})

describe('crews GET — tenantDb isolation', () => {
  it("never returns another tenant's crew", async () => {
    const res = await GET()
    const body = await res.json()
    const ids = body.crews.map((c: Row) => c.id)
    expect(ids).toContain('crew-a')
    expect(ids).not.toContain('crew-b')
  })
})

describe('crews POST — tenantDb stamping', () => {
  it('stamps the new crew with the authenticated tenant', async () => {
    const req = new Request('http://x/api/crews', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Crew' }),
    })
    const res = await POST(req)
    const body = await res.json()
    const row = store.crews.find((r) => r.id === body.id)!
    expect(row.tenant_id).toBe('tenant-A')
  })
})

describe("crews PATCH — CANNOT touch another tenant's crew or its roster (fixed IDOR)", () => {
  it("404s on a foreign tenant's crew id BEFORE calling setMembers — B's crew_members survive untouched", async () => {
    const req = new Request('http://x/api/crews', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'crew-b', name: 'HACKED', member_ids: ['tm-a'] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(404)

    // B's crew row must be untouched.
    const bCrew = store.crews.find((r) => r.id === 'crew-b')!
    expect(bCrew.name).toBe('Crew B')

    // B's crew_members must be untouched — this is the actual exploit this
    // test guards: before the fix, setMembers() ran unconditionally and would
    // have deleted this row and inserted tenant A's team member instead.
    expect(store.crew_members).toEqual([{ crew_id: 'crew-b', team_member_id: 'tm-b' }])
  })

  it('a genuine PATCH on the authenticated tenant\'s own crew still replaces members normally (positive control)', async () => {
    store.crew_members.push({ crew_id: 'crew-a', team_member_id: 'tm-a' })
    const req = new Request('http://x/api/crews', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'crew-a', name: 'Crew A Renamed', member_ids: ['tm-a'] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(store.crews.find((r) => r.id === 'crew-a')!.name).toBe('Crew A Renamed')
    expect(store.crew_members.filter((m) => m.crew_id === 'crew-a')).toMatchObject([{ crew_id: 'crew-a', team_member_id: 'tm-a' }])
  })
})
