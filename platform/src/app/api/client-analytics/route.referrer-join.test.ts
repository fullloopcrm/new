import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * fin-05 re-check (2026-07-31, docs/readiness/ledger.json): the prior
 * mocked pagination test suite (route.pagination.test.ts) passed while
 * this route was 100% broken in real production. Live-reproduced against
 * prod (Supabase REST): `.select('*, referrers(name, ref_code)')` on
 * `clients` returns a real PGRST200 error every time -- there is no DB-
 * level FK constraint from clients -> referrers (only clients.referrer_id
 * as a plain column + referrals as a *different* table with the real FK,
 * confirmed via PostgREST's own error hint: "Perhaps you meant 'referrals'
 * instead of 'referrers'"). The old code never checked the destructured
 * `error` from that query, so `clients` silently resolved to `undefined`
 * and every real call returned an all-zero/empty analytics payload with a
 * 200 status -- no crash, no log, no visible signal. The pagination
 * test's mock couldn't catch this: it always resolves
 * `{ data: [], error: null }` regardless of the select shape, so an
 * invalid embed is indistinguishable from a valid, empty one.
 *
 * These tests close that gap: (1) prove the fix actually joins referrer
 * names correctly using a real, non-empty two-row dataset (not the
 * pagination test's always-empty mock), (2) prove the route no longer
 * uses the invalid `referrers(...)` embed syntax at all, and (3) prove a
 * real Supabase error on the clients query now surfaces as a 500 instead
 * of being silently swallowed into an empty 200 -- the actual behavioral
 * fix, not just a query-shape fix.
 */

type Row = Record<string, unknown>

const state: { clients: Row[]; clientsError: Row | null; referrers: Row[]; bookings: Row[]; cancelled: Row[]; all: Row[] } = {
  clients: [], clientsError: null, referrers: [], bookings: [], cancelled: [], all: [],
}
const selectCalls: string[] = []

function chain(table: string) {
  const c: Record<string, unknown> = {
    select: (cols: string) => { selectCalls.push(`${table}:${cols}`); return c },
    eq: () => c,
    in: () => c,
    order: () => c,
    limit: () => c,
    then: (resolve: (v: { data: Row[] | null; error: Row | null }) => unknown) => {
      if (table === 'clients') return resolve({ data: state.clientsError ? null : state.clients, error: state.clientsError })
      if (table === 'referrers') return resolve({ data: state.referrers, error: null })
      return resolve({ data: [], error: null })
    },
  }
  return c
}

// bookings has 3 distinct call shapes (completed/cancelled/all) -- route
// under test picks by call order via the same `.from('bookings')`, so this
// mock differentiates by which `.eq('status', ...)` value was passed. To
// keep the fake simple and still correct for these tests (which don't
// exercise booking-derived stats), all three resolve to the same fixture
// arrays keyed by intent below.
function bookingsChain() {
  const c: Record<string, unknown> = {
    select: (cols: string) => { selectCalls.push(`bookings:${cols}`); return c },
    eq: () => c,
    order: () => c,
    limit: () => c,
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: state.bookings, error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => (table === 'bookings' ? bookingsChain() : chain(table)),
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-a' }, error: null }),
}))

import { GET } from './route'

beforeEach(() => {
  selectCalls.length = 0
  state.clients = []
  state.clientsError = null
  state.referrers = []
  state.bookings = []
})

describe('GET /api/client-analytics — referrer join (fin-05)', () => {
  it('never uses the invalid PostgREST embed syntax that broke this route in prod', async () => {
    state.clients = [{ id: 'c1', name: 'Alice', status: 'active', referrer_id: null, created_at: '2026-01-01' }]
    await GET()
    const clientsSelect = selectCalls.find((s) => s.startsWith('clients:'))
    expect(clientsSelect).toBeDefined()
    expect(clientsSelect).not.toContain('referrers(')
  })

  it('correctly resolves a real referrer name via the separate application-level join, with a real non-empty dataset', async () => {
    state.clients = [
      { id: 'c1', name: 'Alice', status: 'active', referrer_id: 'ref-1', created_at: '2026-01-01' },
      { id: 'c2', name: 'Bob', status: 'active', referrer_id: null, created_at: '2026-01-02' },
    ]
    state.referrers = [{ id: 'ref-1', name: 'William Gagliano', ref_code: 'WILL112' }]

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const alice = body.allClients.find((c: Row) => c.id === 'c1')
    const bob = body.allClients.find((c: Row) => c.id === 'c2')
    expect(alice.referrer_name).toBe('William Gagliano')
    expect(bob.referrer_name).toBeNull()
  })

  it('surfaces a real clients-query error as a 500, instead of silently returning empty analytics (the actual production failure mode)', async () => {
    state.clientsError = { message: 'PGRST200: Could not find a relationship between clients and referrers' }
    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('revenueByReferrer correctly aggregates by the real referrer name, not a broken/missing embed', async () => {
    state.clients = [
      { id: 'c1', name: 'Alice', status: 'active', referrer_id: 'ref-1', created_at: '2026-01-01' },
      { id: 'c2', name: 'Carol', status: 'active', referrer_id: 'ref-1', created_at: '2026-01-03' },
    ]
    state.referrers = [{ id: 'ref-1', name: 'William Gagliano', ref_code: 'WILL112' }]
    state.bookings = [
      { id: 'b1', client_id: 'c1', price: 10000, start_time: '2026-01-05T00:00:00' },
      { id: 'b2', client_id: 'c2', price: 5000, start_time: '2026-01-06T00:00:00' },
    ]

    const res = await GET()
    const body = await res.json()
    expect(body.revenueByReferrer).toHaveLength(1)
    expect(body.revenueByReferrer[0]).toMatchObject({ name: 'William Gagliano', clients: 2, revenue: 15000 })
  })
})
