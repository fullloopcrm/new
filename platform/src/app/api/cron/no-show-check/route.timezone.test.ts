import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/no-show-check — the "🚨 EMERGENCY —" admin notify message rendered
 * `booking.start_time` with a bare `toLocaleString()` and zero options at
 * all (no `timeZone`, this cron never even selected `tenants.timezone`), so
 * every auto-flip alert showed the server's runtime clock (UTC on Vercel)
 * instead of the tenant's own — same UTC-implicit shape as items
 * (70)/(115)/(117)/(119), just in a cron those sweeps missed because it
 * queries bookings across all tenants in one shot rather than looping per
 * tenant. Most archetype-relevant instance yet: this is the exact moment
 * an admin is scrambling to re-dispatch after a no-show, and the message is
 * already flagged 🚨 EMERGENCY. Proves the fix: the alert now shows the
 * tenant's own Pacific date/time, not the UTC one.
 */

const { notifyMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async (..._args: unknown[]) => ({})),
}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/cron-auth', () => ({
  verifyCronSecret: () => null,
}))

const TENANT_ID = 'tenant-noshow-tz'
// 2026-08-10T05:00:00Z = Aug 10, 1:00 AM Eastern but still Aug 9, 10:00 PM
// in America/Los_Angeles — only a real Pacific-zone render gets this right;
// the old bare toLocaleString() (server default, UTC on Vercel) would show
// a UTC reading, not either tenant's own local time.
const START_TIME = '2026-08-10T05:00:00.000Z'

function bookingsChain(): unknown {
  const c: Record<string, unknown> = {
    select: () => c,
    in: () => c,
    not: () => c,
    is: () => c,
    lt: () => c,
    gt: () => c,
    eq: () => c,
    update: () => c,
    limit: () => c,
    then: (res: (v: unknown) => unknown) =>
      Promise.resolve({
        data: [
          {
            id: 'bk-1', tenant_id: TENANT_ID, start_time: START_TIME,
            client_id: 'client-1', team_member_id: 'tm-1', is_emergency: true,
            clients: { name: 'Jane Doe' }, team_members: { name: 'Sam Tech' },
          },
        ],
        error: null,
      }).then(res),
  }
  return c
}

function tenantsChain(): unknown {
  const c: Record<string, unknown> = {
    select: () => c,
    in: () => c,
    then: (res: (v: unknown) => unknown) =>
      Promise.resolve({ data: [{ id: TENANT_ID, timezone: 'America/Los_Angeles' }], error: null }).then(res),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'bookings') return bookingsChain()
      if (table === 'tenants') return tenantsChain()
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://x/api/cron/no-show-check')
}

beforeEach(() => {
  notifyMock.mockClear()
})

describe('cron/no-show-check — emergency no-show alert renders in the tenant\'s own timezone', () => {
  it('shows the Pacific calendar date/time, not the UTC one', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const [call] = notifyMock.mock.calls[0] as [{ message: string }]
    expect(call.message).toContain('Aug 9')
    expect(call.message).toContain('10:00 PM')
    expect(call.message).not.toContain('Aug 10')
    expect(call.message).not.toContain('1:00 AM')
  })
})
