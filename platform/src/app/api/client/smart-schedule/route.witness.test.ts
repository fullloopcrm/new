import { describe, it, expect, vi } from 'vitest'

/**
 * client/smart-schedule GET — cross-tenant client_id ownership guard.
 *
 * BUG (fixed here): a caller-supplied `client_id` was used to resolve
 * `tenantId` with NO check that the client belonged to the tenant this
 * request was actually for. This is a PUBLIC, unauthenticated endpoint (no
 * portal token, no session — "public + portal-authenticated callers both use
 * this"), so any caller who knew (or guessed) a client_id belonging to a
 * DIFFERENT tenant could pull that tenant's team-member names, preferred-
 * cleaner id, and (via ?suggest=1) schedule-derived availability reasons —
 * a straight cross-tenant data-exfil READ, same class as P1 in the leak
 * register.
 *
 * FIX: the tenant is now always resolved from the host (middleware signs
 * x-tenant-id on every /api/client/* request, same as every sibling route).
 * A supplied client_id is only trusted if it belongs to THAT tenant; a
 * foreign client_id is silently ignored (falls back to host-tenant-only
 * behavior) rather than ever driving which tenant's data gets returned.
 */

const teamFilterCalls: Array<[string, unknown]> = []
const clientFilterCalls: Array<[string, unknown]> = []

function makeTeamBuilder(members: Array<{ id: string; name: string }>) {
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq', 'order', 'gte', 'lte', 'in']) {
    builder[m] = vi.fn((...args: unknown[]) => {
      if (m === 'eq' || m === 'neq') teamFilterCalls.push([String(args[0]), args[1]])
      return builder
    })
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: members, error: null })
  return builder
}

// A realistic fake: `clients` rows really are tenant-scoped, so a lookup
// filtered by BOTH id and tenant_id only matches when both agree — exactly
// what a real Postgres `.eq('id', x).eq('tenant_id', y)` chain would do.
function makeClientBuilder(rows: Array<{ id: string; tenant_id: string; address: string; preferred_team_member_id: string | null }>) {
  const filters: Array<[string, unknown]> = []
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn((col: string, val: unknown) => {
    filters.push([col, val])
    clientFilterCalls.push([col, val])
    return builder
  })
  builder.maybeSingle = vi.fn(() => {
    const match = rows.find((r) => filters.every(([col, val]) => (r as Record<string, unknown>)[col] === val))
    return Promise.resolve({ data: match || null, error: null })
  })
  return builder
}

const HOST_TENANT = 'tenant-A'
const OTHER_TENANT = 'tenant-B'
const CLIENTS = [
  { id: 'own-client', tenant_id: HOST_TENANT, address: '1 Main St', preferred_team_member_id: 'pref-own' },
  { id: 'foreign-client', tenant_id: OTHER_TENANT, address: '2 Other St', preferred_team_member_id: 'pref-foreign' },
]
const HOST_CREW = [{ id: 'tA-1', name: 'HostTenantCleaner' }]

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'clients') return makeClientBuilder(CLIENTS)
      if (table === 'team_members') return makeTeamBuilder(HOST_CREW)
      throw new Error(`unexpected table ${table}`)
    }),
  },
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: HOST_TENANT })),
}))

vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: vi.fn().mockResolvedValue([]),
  suggestBookingSlots: vi.fn().mockResolvedValue([]),
}))

import { GET } from './route'

function req(ip: string, qs: string) {
  return new Request(`http://localhost/api/client/smart-schedule?${qs}`, {
    headers: { 'x-forwarded-for': ip },
  })
}

describe('client/smart-schedule GET — cross-tenant client_id guard', () => {
  it("a foreign tenant's client_id never resolves that tenant's crew — falls back to the HOST tenant's own crew", async () => {
    const res = await GET(req('10.1.0.1', 'client_id=foreign-client'))
    const body = await res.json()

    expect(res.status).toBe(200)
    // Returns the HOST tenant's crew (empty fallback list logic aside), never
    // anything scoped to OTHER_TENANT.
    expect(clientFilterCalls).toContainEqual(['tenant_id', HOST_TENANT])
    expect(teamFilterCalls.some(([col, val]) => col === 'tenant_id' && val === OTHER_TENANT)).toBe(false)
    expect(body.cleaners.map((c: { id: string }) => c.id)).toEqual(['tA-1'])
    // The foreign client's preferred cleaner must never leak into the response.
    expect(body.cleaners.some((c: { id: string }) => c.id === 'pref-foreign')).toBe(false)
  })

  it("CONTROL: the caller's own tenant's client_id still resolves normally", async () => {
    const res = await GET(req('10.1.0.2', 'client_id=own-client'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.cleaners.map((c: { id: string }) => c.id)).toEqual(['tA-1'])
  })
})
