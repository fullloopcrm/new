import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Crews API — cross-tenant authorization regression [P1-4 / R-1].
 *
 * setMembers() used to DELETE crew_members by crew_id ALONE (no tenant check).
 * crew_members has no tenant_id column, so an owner of tenant A could wipe /
 * pollute tenant B's crew by PATCHing with B's crew UUID. The fix re-verifies
 * the crew belongs to the caller's tenant (via the tenant-scoped crews table)
 * before touching its members.
 *
 * These tests run the REAL route handlers against a small in-memory Supabase
 * fake that enforces the eq() filters the handlers pass — so a missing tenant
 * scope shows up as cross-tenant data loss, exactly like production.
 */

// Mutable test state, hoisted so the vi.mock factories can reach it.
const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  eqs: Record<string, unknown>
  inFilter: { col: string; vals: unknown[] } | null
  payload: unknown
}

function runQuery(state: State, terminal: 'single' | 'maybeSingle' | 'many') {
  const store = h.store
  const rows = store[state.table] || (store[state.table] = [])
  const match = (r: Record<string, unknown>) =>
    Object.entries(state.eqs).every(([k, v]) => r[k] === v) &&
    (!state.inFilter || state.inFilter.vals.includes(r[state.inFilter.col]))

  if (state.op === 'insert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const inserted = payload.map((p: Record<string, unknown>) => {
      const row = { ...p }
      if (state.table === 'crews' && row.id == null) {
        h.seq += 1
        row.id = `crew-${h.seq}`
      }
      rows.push(row)
      return row
    })
    if (terminal === 'single') return { data: inserted[0] ?? null, error: null }
    if (terminal === 'maybeSingle') return { data: inserted[0] ?? null, error: null }
    return { data: inserted, error: null }
  }

  if (state.op === 'update') {
    for (const r of rows) if (match(r)) Object.assign(r, state.payload as object)
    return { data: null, error: null }
  }

  if (state.op === 'delete') {
    store[state.table] = rows.filter((r) => !match(r))
    return { data: null, error: null }
  }

  // select
  const found = rows.filter(match)
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  if (terminal === 'maybeSingle') return { data: found[0] ?? null, error: null }
  return { data: found, error: null }
}

function makeClient() {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, inFilter: null, payload: null }
      const chain: Record<string, unknown> = {
        select: () => chain,
        insert: (payload: unknown) => { state.op = 'insert'; state.payload = payload; return chain },
        update: (payload: unknown) => { state.op = 'update'; state.payload = payload; return chain },
        delete: () => { state.op = 'delete'; return chain },
        eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
        in: (col: string, vals: unknown[]) => { state.inFilter = { col, vals }; return chain },
        order: () => chain,
        single: () => Promise.resolve(runQuery(state, 'single')),
        maybeSingle: () => Promise.resolve(runQuery(state, 'maybeSingle')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(state, 'many')).then(res, rej),
      }
      return chain
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient(), supabase: makeClient() }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, role: 'owner' }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { PATCH } from './route'

const patchReq = (body: unknown) =>
  new Request('http://x/api/crews', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.store = {
    crews: [
      { id: 'crewA', tenant_id: 'tenant-A', name: 'A Team', active: true },
      { id: 'crewB', tenant_id: 'tenant-B', name: 'B Team', active: true },
    ],
    crew_members: [{ crew_id: 'crewB', team_member_id: 'memberB' }],
    team_members: [
      { id: 'memberA', tenant_id: 'tenant-A', name: 'Alice' },
      { id: 'memberB', tenant_id: 'tenant-B', name: 'Bob' },
    ],
  }
  h.seq = 0
})

describe('PATCH /api/crews — cross-tenant crew_members guard', () => {
  it("rejects an A-owner PATCH targeting tenant B's crew: B's members are NOT wiped or polluted", async () => {
    h.tenantId = 'tenant-A' // caller is tenant A
    // Attacker passes tenant B's crew UUID and tries to replace its members.
    const res = await PATCH(patchReq({ id: 'crewB', member_ids: ['memberA'] }))
    expect(res.status).toBe(200) // handler does not error — it simply no-ops

    // B's crew is untouched: still exactly its original member, no A member injected.
    expect(h.store.crew_members).toEqual([{ crew_id: 'crewB', team_member_id: 'memberB' }])
  })

  it("positive control: an A-owner PATCH on tenant A's own crew updates its members", async () => {
    h.tenantId = 'tenant-A'
    const res = await PATCH(patchReq({ id: 'crewA', member_ids: ['memberA'] }))
    expect(res.status).toBe(200)

    const aMembers = h.store.crew_members.filter((m) => m.crew_id === 'crewA')
    expect(aMembers).toEqual([{ crew_id: 'crewA', team_member_id: 'memberA' }])
    // B's crew still intact and never affected.
    expect(h.store.crew_members.filter((m) => m.crew_id === 'crewB')).toEqual([
      { crew_id: 'crewB', team_member_id: 'memberB' },
    ])
  })

  it("does not let A inject its own member into B's crew even when B's crew has no members", async () => {
    h.tenantId = 'tenant-A'
    h.store.crew_members = [] // B's crew currently empty
    await PATCH(patchReq({ id: 'crewB', member_ids: ['memberA'] }))
    expect(h.store.crew_members).toEqual([]) // nothing inserted under crewB
  })
})
