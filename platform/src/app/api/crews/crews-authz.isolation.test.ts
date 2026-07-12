import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane — crews cross-tenant crew_members wipe (R-1).
 *
 * ┌─ STATUS ON p1-w4: FIX ABSENT ─────────────────────────────────────────────┐
 * │ The R-1 guard (commit dcef807b, "scope crew member replacement to caller   │
 * │ tenant") is NOT an ancestor of this branch's HEAD. src/app/api/crews/       │
 * │ route.ts::setMembers still does `.delete().eq('crew_id', crewId)` with NO   │
 * │ tenant re-verification. crew_members has no tenant_id column, so an owner   │
 * │ of tenant A can wipe/pollute tenant B's crew by PATCHing with B's crew      │
 * │ UUID. This was FLAGGED to the leader — not cherry-picked here.              │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Because the fix is absent, this file does two honest things:
 *   • WITNESS (active): runs the REAL PATCH handler and proves the exploit is
 *     LIVE on p1-w4 today — a cross-tenant PATCH DOES wipe tenant B's members.
 *     This is runtime evidence for the flag, not a code-read claim. When the
 *     R-1 guard lands this witness WILL start failing — that failure is the
 *     signal that the hole is closed; delete the witness and un-skip the
 *     regression below.
 *   • REGRESSION (skipped): the fix-proof secure assertion, ready to activate
 *     the moment dcef807b (or an equivalent guard) is merged into this branch.
 *     Independent harness — does not reuse the fix's own route.test.ts.
 */

type Row = Record<string, unknown>
const h = vi.hoisted(() => ({ tenantId: 'tenant-A', store: {} as Record<string, Row[]>, seq: 0 }))

type State = { table: string; op: 'select' | 'insert' | 'update' | 'delete'; eqs: Row; inFilter: { col: string; vals: unknown[] } | null; payload: unknown }

function run(state: State, terminal: 'single' | 'maybeSingle' | 'many') {
  const rows = h.store[state.table] || (h.store[state.table] = [])
  const match = (r: Row) =>
    Object.entries(state.eqs).every(([k, v]) => r[k] === v) &&
    (!state.inFilter || state.inFilter.vals.includes(r[state.inFilter!.col]))

  if (state.op === 'insert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const inserted = (payload as Row[]).map((p) => {
      const row = { ...p }
      if (state.table === 'crews' && row.id == null) { h.seq += 1; row.id = `crew-${h.seq}` }
      rows.push(row)
      return row
    })
    return { data: terminal === 'many' ? inserted : inserted[0] ?? null, error: null }
  }
  if (state.op === 'update') { for (const r of rows) if (match(r)) Object.assign(r, state.payload as object); return { data: null, error: null } }
  if (state.op === 'delete') { h.store[state.table] = rows.filter((r) => !match(r)); return { data: null, error: null } }
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
        insert: (p: unknown) => { state.op = 'insert'; state.payload = p; return chain },
        update: (p: unknown) => { state.op = 'update'; state.payload = p; return chain },
        delete: () => { state.op = 'delete'; return chain },
        eq: (c: string, v: unknown) => { state.eqs[c] = v; return chain },
        in: (c: string, v: unknown[]) => { state.inFilter = { col: c, vals: v }; return chain },
        order: () => chain,
        single: () => Promise.resolve(run(state, 'single')),
        maybeSingle: () => Promise.resolve(run(state, 'maybeSingle')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run(state, 'many')).then(res, rej),
      }
      return chain
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient(), supabase: makeClient() }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { PATCH } from './route'

const patchReq = (body: unknown) => new Request('http://x/api/crews', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A' // caller is always tenant A here (the attacker)
  h.seq = 0
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
})

// ── WITNESS: the R-1 hole is LIVE on p1-w4 (fix absent) ─────────────────────
describe('WITNESS [R-1 LIVE on p1-w4 — fix dcef807b absent]', () => {
  it('cross-tenant PATCH WIPES tenant B’s crew AND injects A’s member — vulnerability confirmed at runtime', async () => {
    // Caller is tenant A; targets tenant B's crew UUID. With no tenant guard in
    // setMembers, B's member (memberB) is deleted and A's member (memberA, valid
    // under tenant A) is injected into B's crew — a wipe AND a cross-tenant
    // pollution. When the fix lands, setMembers no-ops (B stays intact) and THIS
    // TEST fails — that failure is the signal that the hole closed.
    const res = await PATCH(patchReq({ id: 'crewB', member_ids: ['memberA'] }))
    expect(res.status).toBe(200)
    const bMembers = h.store.crew_members.filter((m) => m.crew_id === 'crewB')
    expect(bMembers.some((m) => m.team_member_id === 'memberB')).toBe(false) // original wiped
    expect(bMembers).toEqual([{ crew_id: 'crewB', team_member_id: 'memberA' }]) // A's member leaked in
  })
})

// ── REGRESSION: secure behavior — ACTIVATE when the R-1 guard is merged ─────
// Un-skip (and delete the WITNESS above) once dcef807b or an equivalent
// tenant-ownership check lands in setMembers on this branch.
describe.skip('R-1 regression (ACTIVATE when fix present): cross-tenant crew_members wipe blocked', () => {
  it('rejects an A-owner PATCH on tenant B’s crew: B’s members untouched, no A member injected', async () => {
    const res = await PATCH(patchReq({ id: 'crewB', member_ids: ['memberA'] }))
    expect(res.status).toBe(200) // no-op, not an error
    expect(h.store.crew_members).toEqual([{ crew_id: 'crewB', team_member_id: 'memberB' }])
  })

  it('does not inject an A member into B’s crew even when B’s crew is empty', async () => {
    h.store.crew_members = []
    await PATCH(patchReq({ id: 'crewB', member_ids: ['memberA'] }))
    expect(h.store.crew_members).toEqual([])
  })

  it('positive control: an A-owner PATCH on tenant A’s own crew updates its members', async () => {
    await PATCH(patchReq({ id: 'crewA', member_ids: ['memberA'] }))
    expect(h.store.crew_members.filter((m) => m.crew_id === 'crewA')).toEqual([{ crew_id: 'crewA', team_member_id: 'memberA' }])
    expect(h.store.crew_members.filter((m) => m.crew_id === 'crewB')).toEqual([{ crew_id: 'crewB', team_member_id: 'memberB' }])
  })
})
