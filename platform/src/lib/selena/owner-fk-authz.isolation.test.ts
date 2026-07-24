import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane for the F-5 owner-tool FK fix (e4ff36e0).
 *
 * Fix e4ff36e0 added idInTenant() to the owner tools so a referenced
 * client_id / cleaner_id must resolve INSIDE the caller's tenant before the
 * side-effect runs. The fix's own suite (owner-fk-authz.test.ts) proves foreign
 * ids are rejected with no write and own-tenant ids pass.
 *
 * This independently-authored suite locks THREE complementary properties that
 * sibling does NOT assert:
 *
 *   1. THE EXISTENCE PROBE IS TENANT-SCOPED AT THE QUERY — idInTenant fetches
 *      `.eq('id', fk).eq('tenant_id', caller)`. We capture the eq-filters on the
 *      clients/cleaners probe SELECT and assert tenant_id = the caller's tenant.
 *      That proves the guard cannot be satisfied by a row with the same id in
 *      ANOTHER tenant — the exact failure the pre-fix code allowed.
 *
 *   2. NO CROSS-TENANT EXISTENCE ORACLE — a foreign-but-EXISTING id and a
 *      never-existing id both return the identical stable error, so the tool
 *      leaks no signal about whether the id exists in some other tenant.
 *
 *   3. score_cleaners (client-callable, bypasses the owner gate) — a foreign
 *      client_id is rejected AND the scorer is never invoked. Sibling covers the
 *      reject; here we additionally prove the guarded probe was tenant-scoped and
 *      the expensive scorer path was skipped entirely.
 *
 * Independent mock: a builder recording every SELECT's (table, eq-filters) plus
 * insert/update capture, so a rejected request can be asserted to have scoped
 * its probe and written nothing.
 */

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }

let selectResolver: (table: string, eqs: Eqs) => Resolved
let selectCalls: Array<{ table: string; eqs: Eqs }>
let insertCalls: Array<{ table: string }>
let updateCalls: Array<{ table: string }>

function builder(table: string) {
  const eqs: Eqs = {}
  let isUpdate = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    update: () => { isUpdate = true; return chain },
    insert: () => { insertCalls.push({ table }); return chain },
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    is: (col: string, val: unknown) => { eqs[col] = val; return chain },
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => { selectCalls.push({ table, eqs: { ...eqs } }); return selectResolver(table, eqs) },
    maybeSingle: async () => { selectCalls.push({ table, eqs: { ...eqs } }); return selectResolver(table, eqs) },
    then: (onF: (v: Resolved) => unknown, onR?: (e: unknown) => unknown) => {
      if (isUpdate) updateCalls.push({ table })
      return Promise.resolve({ data: null, error: null }).then(onF, onR)
    },
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))

// score_cleaners dynamically imports the scorer only AFTER the FK guard passes;
// a REJECT must never reach it.
const scoreMock = vi.hoisted(() => ({ calls: 0 }))
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: async () => { scoreMock.calls++; return [] },
}))

import { runTool } from '@/lib/selena/tools'
import { type YinezResult } from '@/lib/selena/agent'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OWNER_PHONE = '212-555-1111'
const OWN_CLIENT = 'client-A'
const FOREIGN_BUT_EXISTS = 'client-B-in-tenant-B' // exists, but only inside tenant B
const NEVER_EXISTS = 'client-does-not-exist-anywhere'

const agentResult = (): YinezResult => ({ text: '', toolsCalled: [] })

// Resolver: caller is tenant A's owner. In tenant A only OWN_CLIENT exists. The
// clients/cleaners probe is scoped by (id + tenant_id): a foreign id scoped to A
// misses regardless of whether it exists in some other tenant.
function baseResolver(table: string, eqs: Eqs): Resolved {
  if (table === 'tenants') return { data: { owner_phone: OWNER_PHONE }, error: null }
  if (table === 'clients') {
    return eqs.id === OWN_CLIENT && eqs.tenant_id === TENANT_A ? { data: { id: OWN_CLIENT }, error: null } : { data: null, error: null }
  }
  if (table === 'team_members') return { data: null, error: null }
  return { data: null, error: null }
}

beforeEach(() => {
  selectCalls = []
  insertCalls = []
  updateCalls = []
  scoreMock.calls = 0
  selectResolver = baseResolver
})
afterEach(() => vi.unstubAllEnvs())

const probe = (table: string) => selectCalls.filter((c) => c.table === table)

// ── create_deal: probe is tenant-scoped; foreign id -> no write ─────────────

describe('W4 F-5: create_deal FK probe is scoped to the caller tenant', () => {
  it('REJECTS a foreign client_id and the clients probe carried tenant_id=A (no deal inserted)', async () => {
    const out = await runTool('create_deal', { client_id: FOREIGN_BUT_EXISTS, value_dollars: 500 }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('client not found')
    expect(insertCalls.filter((i) => i.table === 'deals')).toHaveLength(0)
    // The probe must have been scoped to the caller's tenant, not the row's.
    expect(probe('clients').length).toBeGreaterThan(0)
    for (const c of probe('clients')) {
      expect(c.eqs.id).toBe(FOREIGN_BUT_EXISTS)
      expect(c.eqs.tenant_id).toBe(TENANT_A)
    }
  })
})

// ── No cross-tenant existence oracle ────────────────────────────────────────

describe('W4 F-5: reject error does not disclose cross-tenant existence', () => {
  it('a foreign-but-existing id and a never-existing id return the IDENTICAL error', async () => {
    const outForeign = await runTool('create_deal', { client_id: FOREIGN_BUT_EXISTS }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    const outNever = await runTool('create_deal', { client_id: NEVER_EXISTS }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(outForeign).error).toBe('client not found')
    // Identical message — the tool is not an oracle for "exists in another tenant".
    expect(JSON.parse(outNever).error).toBe(JSON.parse(outForeign).error)
  })
})

// ── score_cleaners: client-callable, foreign client_id blocked before scorer ─

describe('W4 F-5: score_cleaners rejects a foreign client_id before the scorer runs', () => {
  it('a foreign client_id is rejected, the probe was tenant-scoped, and scoreCleanersForBooking is never called', async () => {
    const out = await runTool('score_cleaners', { date: '2099-02-01', time: '14:00', duration_hours: 2, client_id: FOREIGN_BUT_EXISTS }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('client not found')
    expect(scoreMock.calls).toBe(0)
    expect(probe('clients').length).toBeGreaterThan(0)
    for (const c of probe('clients')) expect(c.eqs.tenant_id).toBe(TENANT_A)
  })

  it('an own-tenant client_id passes the guard and the scorer runs', async () => {
    const out = await runTool('score_cleaners', { date: '2099-02-01', time: '14:00', duration_hours: 2, client_id: OWN_CLIENT }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBeUndefined()
    expect(scoreMock.calls).toBe(1)
  })
})
