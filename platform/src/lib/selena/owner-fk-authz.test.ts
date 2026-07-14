import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * P3-5 — Owner-tool FK tenant-ownership boundary.
 *
 * The bug these tests lock down: the owner tools create_manual_booking,
 * create_deal, block_cleaner_dates, assign_cleaner (assign_cleaner_to_booking)
 * and score_cleaners each accept a referenced client_id / cleaner_id and write
 * it verbatim into a row whose tenant_id is the CALLER's tenant — but they
 * never checked the referenced FK belongs to that tenant. An owner (or, for
 * score_cleaners which bypasses the owner gate, any client) could therefore
 * point a booking/deal/block/assignment at ANOTHER tenant's client or cleaner
 * id. The fix validates each referenced id resolves inside the caller's tenant
 * before the side-effect runs.
 *
 * Mock strategy mirrors booking-authz.test.ts: a tiny Supabase query builder
 * whose .single()/.maybeSingle() result is decided by a per-test resolver keyed
 * on (table, eq-filters), and whose insert/update chains record the mutation so
 * a rejected request can be asserted to have written NOTHING.
 */

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }

let selectResolver: (table: string, eqs: Eqs) => Resolved
let updateCalls: Array<{ table: string; values: Record<string, unknown>; eqs: Eqs }>
let insertCalls: Array<{ table: string; values: unknown }>

function builder(table: string) {
  const eqs: Eqs = {}
  let updateValues: Record<string, unknown> | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    update: (values: Record<string, unknown>) => {
      updateValues = values
      return chain
    },
    insert: (values: unknown) => {
      insertCalls.push({ table, values })
      return chain
    },
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    ilike: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    is: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: () => chain,
    single: async () => selectResolver(table, eqs),
    maybeSingle: async () => selectResolver(table, eqs),
    // Awaiting the chain itself (the `await ...insert()`/`update().eq()` path)
    // resolves here. Selects terminate in .single()/.maybeSingle().
    then: (onF: (v: Resolved) => unknown, onR?: (e: unknown) => unknown) => {
      if (updateValues !== null) {
        updateCalls.push({ table, values: updateValues, eqs: { ...eqs } })
      }
      return Promise.resolve({ data: null, error: null }).then(onF, onR)
    },
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))

// create_manual_booking notifies operators on the ALLOW path; stub it.
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))

// score_cleaners dynamically imports the scorer only AFTER the FK guard passes;
// stub it so the ALLOW path never touches the real smart-schedule / DB, and so a
// REJECT can be asserted to have skipped it entirely.
const scoreMock = vi.hoisted(() => ({ calls: 0 }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({
  scoreCleanersForBooking: async () => {
    scoreMock.calls++
    return []
  },
}))

import { runTool } from '@/lib/selena/tools'
import { type YinezResult } from '@/lib/selena/agent'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OWNER_PHONE = '212-555-1111'

// Ids that resolve INSIDE tenant A vs. foreign ids that belong to another tenant.
const OWN_CLIENT = 'client-A'
const FOREIGN_CLIENT = 'client-B'
const OWN_CLEANER = 'cleaner-A'
const FOREIGN_CLEANER = 'cleaner-B'
const OWN_BOOKING = 'bk-1'
const FOREIGN_BOOKING = 'bk-2'

const agentResult = (): YinezResult => ({ text: '', toolsCalled: [] })

// Default resolver: caller is tenant A's owner; only OWN_* ids exist in tenant A;
// insert .select().single() paths return a fresh row id.
function baseResolver(table: string, eqs: Eqs): Resolved {
  if (table === 'tenants') return { data: { owner_phone: OWNER_PHONE }, error: null }
  if (table === 'clients') {
    return eqs.id === OWN_CLIENT && eqs.tenant_id === TENANT_A
      ? { data: { id: OWN_CLIENT }, error: null }
      : { data: null, error: null }
  }
  if (table === 'cleaners') {
    return eqs.id === OWN_CLEANER && eqs.tenant_id === TENANT_A
      ? { data: { id: OWN_CLEANER }, error: null }
      : { data: null, error: null }
  }
  if (table === 'bookings') {
    // idInTenant's FK check filters by id + tenant_id (maybeSingle); the
    // create_manual_booking post-insert .select().single() has no eq filters
    // at all — only the FK-check path should be gated on OWN_BOOKING.
    if (eqs.id !== undefined) {
      return eqs.id === OWN_BOOKING && eqs.tenant_id === TENANT_A
        ? { data: { id: OWN_BOOKING }, error: null }
        : { data: null, error: null }
    }
    return { data: { id: 'bk-new', start_time: '2099-01-01T10:00:00' }, error: null }
  }
  if (table === 'deals') return { data: { id: 'deal-new' }, error: null }
  return { data: null, error: null }
}

beforeEach(() => {
  updateCalls = []
  insertCalls = []
  scoreMock.calls = 0
  selectResolver = baseResolver
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// ── create_manual_booking ────────────────────────────────────────────────────

describe('create_manual_booking — FK tenant-ownership', () => {
  const base = { date: '2099-02-01', time: '2:00 PM', service_type: 'standard', hourly_rate: 69, estimated_hours: 2 }

  it("REJECTS a client_id from another tenant (no booking inserted)", async () => {
    const out = await runTool('create_manual_booking', { ...base, client_id: FOREIGN_CLIENT }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('client not found')
    expect(insertCalls).toHaveLength(0)
  })

  it("REJECTS a foreign cleaner_id even when the client is own-tenant (no insert)", async () => {
    const out = await runTool('create_manual_booking', { ...base, client_id: OWN_CLIENT, cleaner_id: FOREIGN_CLEANER }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect(insertCalls).toHaveLength(0)
  })

  it('ALLOWS own-tenant client + cleaner (booking inserted, tenant-scoped)', async () => {
    const out = await runTool('create_manual_booking', { ...base, client_id: OWN_CLIENT, cleaner_id: OWN_CLEANER }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(insertCalls).toHaveLength(1)
    const values = insertCalls[0].values as Record<string, unknown>
    expect(values.tenant_id).toBe(TENANT_A)
    expect(values.client_id).toBe(OWN_CLIENT)
  })
})

// ── create_deal ──────────────────────────────────────────────────────────────

describe('create_deal — FK tenant-ownership', () => {
  it("REJECTS a client_id from another tenant (no deal inserted)", async () => {
    const out = await runTool('create_deal', { client_id: FOREIGN_CLIENT, value_dollars: 500 }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('client not found')
    expect(insertCalls).toHaveLength(0)
  })

  it('ALLOWS an own-tenant client (deal inserted, tenant-scoped)', async () => {
    const out = await runTool('create_deal', { client_id: OWN_CLIENT, value_dollars: 500 }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(insertCalls).toHaveLength(1)
    expect((insertCalls[0].values as Record<string, unknown>).tenant_id).toBe(TENANT_A)
  })
})

// ── block_cleaner_dates ──────────────────────────────────────────────────────

describe('block_cleaner_dates — FK tenant-ownership', () => {
  const base = { from_date: '2099-03-01', to_date: '2099-03-05' }

  it("REJECTS a cleaner_id from another tenant (no block inserted)", async () => {
    const out = await runTool('block_cleaner_dates', { ...base, cleaner_id: FOREIGN_CLEANER }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect(insertCalls).toHaveLength(0)
  })

  it('ALLOWS an own-tenant cleaner (block inserted, tenant-scoped)', async () => {
    const out = await runTool('block_cleaner_dates', { ...base, cleaner_id: OWN_CLEANER }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(insertCalls).toHaveLength(1)
    expect((insertCalls[0].values as Record<string, unknown>).tenant_id).toBe(TENANT_A)
  })
})

// ── assign_cleaner (assign_cleaner_to_booking) ───────────────────────────────

describe('assign_cleaner_to_booking — FK tenant-ownership', () => {
  it("REJECTS a cleaner_id from another tenant (no booking update)", async () => {
    const out = await runTool('assign_cleaner_to_booking', { booking_id: 'bk-1', cleaner_id: FOREIGN_CLEANER }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect(updateCalls).toHaveLength(0)
  })

  it("REJECTS a booking_id from another tenant even with an own-tenant cleaner (no booking update, false-success regression guard)", async () => {
    const out = await runTool('assign_cleaner_to_booking', { booking_id: FOREIGN_BOOKING, cleaner_id: OWN_CLEANER }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('booking not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS an own-tenant cleaner (booking updated, tenant-scoped)', async () => {
    const out = await runTool('assign_cleaner_to_booking', { booking_id: 'bk-1', cleaner_id: OWN_CLEANER }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(updateCalls).toHaveLength(1)
    // Missing assertion (W4): the update must target the CALLER-SUPPLIED
    // booking_id, not some other row — otherwise a wrong-id regression here
    // would silently "succeed" against the wrong booking and this test
    // wouldn't catch it (the mock resolves every update as ok regardless).
    expect(updateCalls[0].eqs.id).toBe('bk-1')
    expect(updateCalls[0].eqs.tenant_id).toBe(TENANT_A)
    expect(updateCalls[0].values.cleaner_id).toBe(OWN_CLEANER)
  })
})

// ── score_cleaners (client-callable: bypasses the owner gate) ─────────────────

describe('score_cleaners — FK tenant-ownership', () => {
  const base = { date: '2099-02-01', time: '14:00', duration_hours: 2 }

  it("REJECTS a client_id from another tenant WITHOUT scoring (no leak)", async () => {
    // Called on a client channel (no owner phone) — the FK guard must still fire.
    const out = await runTool('score_cleaners', { ...base, client_id: FOREIGN_CLIENT }, 'convo', null, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('client not found')
    expect(scoreMock.calls).toBe(0)
  })

  it('ALLOWS an own-tenant client_id (scorer runs)', async () => {
    const out = await runTool('score_cleaners', { ...base, client_id: OWN_CLIENT }, 'convo', null, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBeUndefined()
    expect(scoreMock.calls).toBe(1)
  })

  it('ALLOWS an absent client_id (address-only scoring, scorer runs)', async () => {
    const out = await runTool('score_cleaners', { ...base, client_address: '1 Main St' }, 'convo', null, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBeUndefined()
    expect(scoreMock.calls).toBe(1)
  })
})
