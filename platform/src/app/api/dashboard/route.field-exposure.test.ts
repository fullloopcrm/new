/**
 * GET /api/dashboard's todayJobs/allJobs/upcomingBookings queries embedded
 * team_members via `team_members!bookings_team_member_id_fkey(*)` -- a
 * wildcard nested join. This route is gated on finance.view, which 'manager'
 * holds without team.edit (see rbac.ts), so a manager-tier user hitting this
 * aggregator got every coworker's pin, pay_rate, HR notes, and
 * tax_ssn_last4/tax_address embedded in the response -- same exposure class
 * as the GET /api/team(+[id]) pin leak (866f49c2), just via a nested embed
 * instead of a top-level select. Fixed by narrowing every
 * team_members!bookings_team_member_id_fkey(...) embed in this file to
 * `(name)`, matching the map-view queries that were already safe.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const selectMock = vi.fn()
const fromMock = vi.fn((..._args: unknown[]) => ({ select: selectMock }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => fromMock(...args) },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }),
}))

function chain(): Record<string, unknown> {
  const c: Record<string, unknown> = {
    eq: () => c,
    gte: () => c,
    lt: () => c,
    lte: () => c,
    in: () => c,
    order: () => c,
    then: (resolve: (v: { data: unknown[]; error: null; count: number }) => unknown) =>
      resolve({ data: [], error: null, count: 0 }),
  }
  return c
}

describe('GET /api/dashboard — team_members embed field-exposure allowlist', () => {
  beforeEach(() => {
    vi.resetModules()
    fromMock.mockClear()
    selectMock.mockReset().mockReturnValue(chain())
  })

  it('never embeds team_members via a wildcard select', async () => {
    const { GET } = await import('./route')
    await GET()

    const teamMemberSelects = selectMock.mock.calls
      .map((call) => String(call[0]))
      .filter((cols) => cols.includes('team_members!bookings_team_member_id_fkey'))

    expect(teamMemberSelects.length).toBeGreaterThan(0)
    for (const cols of teamMemberSelects) {
      expect(cols).not.toContain('team_members!bookings_team_member_id_fkey(*)')
      expect(cols).toContain('team_members!bookings_team_member_id_fkey(name)')
    }
  })
})
