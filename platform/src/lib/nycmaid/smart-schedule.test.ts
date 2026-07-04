import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Tenant-isolation regression test ──────────────────────────────────────
// scoreCleanersForBooking reads `cleaners`, `bookings`, and `booking_cleaners`
// — all tenant-owned tables — through the service-role client, which BYPASSES
// Postgres RLS. Before the fix these reads had NO tenant_id filter, so when the
// shared Selena engine scored a booking it pulled EVERY tenant's cleaners and
// bookings (cross-tenant PII leak + wrong-tenant cleaner assignment).
// This test asserts every such read is scoped by tenant_id.

const eqCalls: Array<{ table: string; args: unknown[] }> = []
let currentTable = ''

function makeBuilder() {
  const builder: Record<string, unknown> = {}
  const chain = ['select', 'eq', 'gte', 'lte', 'neq', 'order', 'limit', 'in', 'or', 'filter', 'update', 'insert']
  for (const m of chain) {
    builder[m] = vi.fn((...args: unknown[]) => {
      if (m === 'eq') eqCalls.push({ table: currentTable, args })
      return builder
    })
  }
  builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }))
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
  // make the builder awaitable (resolves to an empty result set)
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      currentTable = table
      return makeBuilder()
    }),
  },
}))

vi.mock('@/lib/nycmaid/geo', () => ({
  geocodeAddress: vi.fn().mockResolvedValue(null),
  geocodeClient: vi.fn().mockResolvedValue(null),
  calculateDistance: vi.fn().mockReturnValue(0),
  estimateTransitMinutes: vi.fn().mockReturnValue(0),
}))

import { scoreCleanersForBooking } from './smart-schedule'

describe('scoreCleanersForBooking — tenant isolation', () => {
  beforeEach(() => {
    eqCalls.length = 0
  })

  it('scopes every tenant-owned read by tenant_id', async () => {
    const TENANT = 'tenant-A'
    await scoreCleanersForBooking({
      tenantId: TENANT,
      date: '2026-07-10',
      startTime: '10:00',
      durationHours: 2,
      clientAddress: '123 Main St',
      jobCoords: { lat: 40.7128, lng: -74.006 }, // pre-resolved → skips geocode + client read
    })

    for (const table of ['booking_cleaners', 'cleaners', 'bookings']) {
      const scoped = eqCalls.some(
        (c) => c.table === table && c.args[0] === 'tenant_id' && c.args[1] === TENANT,
      )
      expect(scoped, `read on "${table}" must be filtered by .eq('tenant_id', tenantId)`).toBe(true)
    }
  })
})
