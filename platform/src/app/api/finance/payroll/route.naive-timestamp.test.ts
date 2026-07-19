import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * finance/payroll GET — naive check_in_time/check_out_time misparse
 * (nycmaid ref 64cba3c4, ported P1/W2).
 *
 * BUG this closes: Supabase can return a timestamp column WITHOUT a 'Z'
 * suffix even though the underlying value is UTC (see lib/dates.ts's own
 * parseTimestamp doc comment). A bare `new Date("...")` in Node reads that
 * as the RUNTIME's local zone, not UTC. For a same-day check-in/check-out
 * pair the local-zone misparse error is IDENTICAL on both sides and cancels
 * out of the subtraction — numerically harmless most of the time. It stops
 * cancelling across a DST transition, where the local UTC offset itself
 * changes between check-in and check-out: the test below picks a
 * spring-forward pair (2026-03-08, US DST start) where the old bare-Date
 * parse under-counts a real 4-hour shift as 3 hours. `pending_hours`/
 * `pending_pay` here are literally what a team member gets paid.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { GET } from './route'

function seed() {
  return {
    team_members: [{ id: 'tm-a1', tenant_id: CTX_TENANT, name: 'Amy', pay_rate: 25, status: 'active' }],
    bookings: [
      {
        // Naive Postgres-style timestamp strings (space separator, no Z) —
        // exactly what Supabase can hand back for a `timestamp` (not
        // `timestamptz`) column. A REAL 4-hour job (01:00-05:00 UTC)
        // straddling 2026's US spring-forward (2026-03-08 02:00 ET -> 03:00
        // ET) — the one case where the local-zone misparse error doesn't
        // cancel between check-in and check-out.
        team_member_id: 'tm-a1', tenant_id: CTX_TENANT, status: 'completed', pay_rate: 25,
        check_in_time: '2026-03-08 01:00:00',
        check_out_time: '2026-03-08 05:00:00',
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/payroll GET — naive timestamp fix', () => {
  it('a naive (no-Z) check-in/check-out pair spanning a DST transition still computes the real 4-hour span, not 3', async () => {
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    const amy = body.payroll.find((p: { id: string }) => p.id === 'tm-a1')
    expect(amy.pending_hours).toBe(4)
    expect(amy.pending_pay).toBe(4 * 25)
  })
})
