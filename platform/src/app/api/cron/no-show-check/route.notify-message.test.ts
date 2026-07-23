import { describe, it, expect, vi, afterEach } from 'vitest'
import { nowNaiveET, parseNaiveET } from '@/lib/recurring'

/**
 * cron/no-show-check -- the gating logic (which bookings flip to no_show)
 * was already fixed in an earlier session for the naive-ET/UTC misparse.
 * This covers the one remaining spot: the admin notify message built the
 * displayed time via new Date(b.start_time).toLocaleString(), which
 * misparses the naive-ET start_time as local/UTC on a real server -- an
 * admin reading the alert would see the wrong time for the missed booking.
 * Fixed via parseNaiveET().
 */

const notifyCalls: Array<{ message: string }> = []
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async (args: { message: string }) => { notifyCalls.push(args) }) }))
vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))

const BOOKING_START = nowNaiveET(-2 * 3600000) // 2h ago ET, well past the 45-min grace window

function builder(table: string) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    in: () => chain,
    is: () => chain,
    lt: () => chain,
    gt: () => chain,
    limit: () => chain,
    eq: () => chain,
    update: () => chain,
    then: (resolve: (v: { data: unknown; error: null }) => void) => {
      if (table === 'bookings') {
        return resolve({
          data: [{ id: 'b1', tenant_id: 'tenant-1', start_time: BOOKING_START, client_id: 'c1', team_member_id: 'tm1', clients: { name: 'Jane Doe' }, team_members: { name: 'Alex Cleaner' } }],
          error: null,
        })
      }
      return resolve({ data: [], error: null })
    },
  }
  return chain
}
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => builder(t) } }))

import { GET } from './route'

describe('cron/no-show-check -- notify message uses the real ET time', () => {
  afterEach(() => vi.restoreAllMocks())

  it('formats the alert time via parseNaiveET, not a raw new Date() misparse', async () => {
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)
    expect(notifyCalls).toHaveLength(1)
    const expectedTime = parseNaiveET(BOOKING_START).toLocaleString()
    expect(notifyCalls[0].message).toContain(expectedTime)
  })
})
