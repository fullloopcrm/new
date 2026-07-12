/**
 * Happy-path lifecycle test: recurring schedule → generated occurrences,
 * tenant-scoped (P1/W1 queue item a).
 *
 * Drives the REAL POST /api/admin/recurring-schedules handler against one
 * shared in-memory Supabase fake (same pattern as
 * lead/lead-capture-attribution.test.ts & crews/route.test.ts), so tenant
 * scoping shows up as real row placement rather than a mocked return value.
 *
 * Lifecycle asserted:
 *   1. CREATE SCHEDULE      — a `recurring_schedules` row lands, tenant-scoped.
 *   2. GENERATE OCCURRENCES — the 6-week horizon fans out into `bookings`,
 *      each carrying schedule_id + the caller's tenant_id + recurring_type.
 *   3. TENANT SCOPE         — a client_id owned by ANOTHER tenant is rejected
 *      (404) and writes nothing, so the schedule can't straddle tenants.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── shared mutable store, hoisted so vi.mock factories can reach it ──
const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  eqs: Record<string, unknown>
  payload: unknown
}

function matches(r: Record<string, unknown>, s: State): boolean {
  return Object.entries(s.eqs).every(([k, v]) => r[k] === v)
}

function runQuery(state: State, terminal: 'single' | 'maybeSingle' | 'many') {
  const rows = h.store[state.table] || (h.store[state.table] = [])

  if (state.op === 'insert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const inserted = payload.map((p: Record<string, unknown>) => {
      const row: Record<string, unknown> = { ...p }
      if (row.id == null) {
        h.seq += 1
        row.id = `${state.table}-${h.seq}`
      }
      rows.push(row)
      return row
    })
    if (terminal === 'many') return { data: inserted, error: null }
    return { data: inserted[0] ?? null, error: null }
  }

  if (state.op === 'update') {
    for (const r of rows) if (matches(r, state)) Object.assign(r, state.payload as object)
    return { data: null, error: null }
  }

  const found = rows.filter((r) => matches(r, state))
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  if (terminal === 'maybeSingle') return { data: found[0] ?? null, error: null }
  return { data: found, error: null }
}

function makeClient() {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, payload: null }
      const chain: Record<string, unknown> = {
        select: () => chain,
        insert: (payload: unknown) => { state.op = 'insert'; state.payload = payload; return chain },
        update: (payload: unknown) => { state.op = 'update'; state.payload = payload; return chain },
        eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
        order: () => chain,
        limit: () => chain,
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))
// Deterministic, non-repeating team-member tokens for the generated bookings.
vi.mock('@/lib/tokens', () => ({ generateToken: () => `tok-${(h.seq += 1)}` }))

import { POST } from './route'

const TENANT = 'tenant-A'
const OTHER = 'tenant-B'

const req = (body: unknown) =>
  new Request('http://acme.example.com/api/admin/recurring-schedules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.tenantId = TENANT
  h.seq = 0
  h.store = {
    clients: [
      { id: 'client-A', tenant_id: TENANT, name: 'Acme Client' },
      { id: 'client-B', tenant_id: OTHER, name: 'Other Client' },
    ],
    recurring_schedules: [],
    bookings: [],
  }
})

const validBody = {
  client_id: 'client-A',
  recurring_type: 'weekly',
  start_date: '2026-08-03', // Mon
  preferred_time: '10:00',
  duration_hours: 3,
  price: 150,
  service_type: 'Standard Cleaning',
}

describe('recurring schedule → occurrences (happy path)', () => {
  it('creates a tenant-scoped recurring_schedules row', async () => {
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(h.store.recurring_schedules).toHaveLength(1)
    const schedule = h.store.recurring_schedules[0]
    expect(schedule.tenant_id).toBe(TENANT)
    expect(schedule).toMatchObject({ client_id: 'client-A', recurring_type: 'weekly', status: 'active' })
    expect(body.schedule.id).toBe(schedule.id)
  })

  it('fans the 6-week horizon out into bookings tied to the schedule + tenant', async () => {
    const res = await POST(req(validBody))
    const body = await res.json()
    const scheduleId = h.store.recurring_schedules[0].id

    // Weekly across a 42-day horizon → at least the first handful of visits.
    expect(body.bookings_created).toBeGreaterThan(0)
    expect(h.store.bookings).toHaveLength(body.bookings_created)

    for (const bk of h.store.bookings) {
      expect(bk.tenant_id).toBe(TENANT)
      expect(bk.schedule_id).toBe(scheduleId)
      expect(bk.recurring_type).toBe('weekly')
      expect(bk.client_id).toBe('client-A')
      expect(bk.status).toBe('scheduled')
    }
    // First occurrence sits on the requested start date at the preferred time.
    expect(String(h.store.bookings[0].start_time)).toBe('2026-08-03T10:00:00')
  })

  it("rejects a client owned by another tenant and writes nothing (tenant scope)", async () => {
    const res = await POST(req({ ...validBody, client_id: 'client-B' }))
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ error: 'Client not found' })

    expect(h.store.recurring_schedules).toHaveLength(0)
    expect(h.store.bookings).toHaveLength(0)
  })
})
