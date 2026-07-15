import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Regression: fallback team-member picker column bug ────────────────────
// The public booking form falls back to an UNSCORED list of a tenant's team
// members when slot info (date/time/address) isn't complete yet. That query
// used `.eq('active', true)` — but `team_members` has NO boolean `active`
// column (schema uses `status`, e.g. 'inactive' = off-boarded). Postgres
// rejects a filter on a missing column, so the picker silently returned an
// empty list: the customer saw NO cleaners to choose from.
//
// The mock below reproduces that: a filter on `active` yields a DB error
// (empty result), while the correct `status`-based filter returns the crew.
// Pre-fix code fails this test; post-fix code (.neq('status','inactive')) passes.

const teamFilterCalls: Array<[string, unknown]> = []

function makeTeamBuilder(members: Array<{ id: string; name: string }>) {
  let usedActiveColumn = false
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq', 'order', 'gte', 'lte', 'in']) {
    builder[m] = vi.fn((...args: unknown[]) => {
      if (m === 'eq' || m === 'neq') {
        teamFilterCalls.push([String(args[0]), args[1]])
        if (args[0] === 'active') usedActiveColumn = true
      }
      return builder
    })
  }
  // Await the query: emulate Postgres rejecting a filter on the non-existent
  // `active` column, otherwise return the seeded active crew.
  builder.then = (resolve: (v: unknown) => void) =>
    resolve(
      usedActiveColumn
        ? { data: null, error: { message: 'column team_members.active does not exist' } }
        : { data: members, error: null },
    )
  return builder
}

function makeClientBuilder(row: unknown) {
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq']) builder[m] = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }))
  return builder
}

const CLIENT_ROW = { address: '123 Main St', tenant_id: 'tenant-A', preferred_team_member_id: 't2' }
const CREW = [
  { id: 't1', name: 'Ana' },
  { id: 't2', name: 'Ben' },
]

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'clients') return makeClientBuilder(CLIENT_ROW)
      if (table === 'team_members') return makeTeamBuilder(CREW)
      throw new Error(`unexpected table ${table}`)
    }),
  },
}))

// The route now requires a host tenant (middleware-signed x-tenant-id) before
// it will trust a caller-supplied client_id at all — see route.witness.test.ts
// for the cross-tenant ownership guard itself. Stub it here so this file's
// pre-existing column-bug regression test stays focused on that one bug.
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-A' })),
}))

// Scored path is never reached in the fallback branch; stub to keep it isolated.
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: vi.fn().mockResolvedValue([]),
  suggestBookingSlots: vi.fn().mockResolvedValue([]),
}))

import { GET } from './route'

// Distinct IP per call so the module-level rate limiter never trips.
function req(ip: string, qs: string) {
  return new Request(`http://localhost/api/client/smart-schedule?${qs}`, {
    headers: { 'x-forwarded-for': ip },
  })
}

describe('client/smart-schedule fallback picker — team_members column', () => {
  beforeEach(() => {
    teamFilterCalls.length = 0
  })

  it('returns the tenant crew via the status column (not a non-existent boolean active)', async () => {
    // Only client_id → no date/time → hits the unscored fallback branch.
    const res = await GET(req('10.0.0.1', 'client_id=c1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.cleaners.map((c: { id: string }) => c.id)).toEqual(['t1', 't2'])
    // preferred flag still resolves off the client row
    expect(body.cleaners.find((c: { id: string }) => c.id === 't2').is_preferred).toBe(true)
  })

  it('never filters team_members on the non-existent boolean `active` column', async () => {
    await GET(req('10.0.0.2', 'client_id=c1'))
    expect(teamFilterCalls.some(([col]) => col === 'active')).toBe(false)
    // and IS scoped to the tenant + excludes off-boarded members
    expect(teamFilterCalls).toContainEqual(['tenant_id', 'tenant-A'])
    expect(teamFilterCalls).toContainEqual(['status', 'inactive'])
  })
})
