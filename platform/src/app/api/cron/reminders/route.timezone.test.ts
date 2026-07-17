import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * cron/reminders — item (117): the 2-hour team/client reminder SMS bodies
 * rendered `booking.start_time` with a bare `toLocaleTimeString` and no
 * `timeZone` option (this cron never even selected `tenants.timezone`), so
 * every reminder text displayed a clock time hours off from a non-Eastern
 * tenant's real local time — same shape as item (115)'s sms-templates.ts
 * fix, and item (70)'s original discovery, just in this cron's own inline
 * SMS bodies instead of the shared template module. Proves the fix: a
 * Pacific tenant's 2-hour reminder texts now render Pacific clock time.
 */

const HOUR_BOOKINGS_SELECT = 'id, client_id, team_member_id, service_type, start_time, clients(name, phone, email, sms_consent), team_members!bookings_team_member_id_fkey(name, phone, sms_consent)'

const holder = vi.hoisted(() => ({
  hourBooking: null as Record<string, unknown> | null,
}))

const { sendSMSMock } = vi.hoisted(() => ({ sendSMSMock: vi.fn(async (_args: { body: string }) => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ reminder: () => 'sms body' }) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))

const TENANT_ID = 'tenant-reminders-tz'
const TENANT = { id: TENANT_ID, name: 'West Coast Co', telnyx_api_key: 'key', telnyx_phone: '+15550000000', resend_api_key: null, timezone: 'America/Los_Angeles' }

// Empty/no-op chain for every query this cron makes that isn't the one
// hour-based reminder query this test cares about.
function emptyChain(): unknown {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    neq: () => c,
    not: () => c,
    is: () => c,
    lt: () => c,
    gt: () => c,
    gte: () => c,
    lte: () => c,
    in: () => c,
    order: () => c,
    limit: () => c,
    insert: () => c,
    returns: () => c,
    single: async () => ({ data: null, error: null }),
    then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
  }
  return c
}

function tenantsChain(): unknown {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    limit: () => c,
    single: async () => ({ data: TENANT, error: null }),
    then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [TENANT], error: null }).then(res),
  }
  return c
}

function hourBookingsChain(): unknown {
  const c: Record<string, unknown> = {
    select: (cols: string) => (cols === HOUR_BOOKINGS_SELECT ? c : emptyChain()),
    eq: () => c,
    in: () => c,
    gte: () => c,
    lte: () => c,
    limit: () => c,
    returns: () => c,
    then: (res: (v: unknown) => unknown) => Promise.resolve({ data: holder.hourBooking ? [holder.hourBooking] : [], error: null }).then(res),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsChain()
      if (table === 'bookings') return hourBookingsChain()
      return emptyChain()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://x/api/cron/reminders', { headers: { authorization: 'Bearer test-cron-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMSMock.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/reminders — 2-hour reminder SMS renders in the tenant\'s own timezone', () => {
  it('client + team 2hr-reminder SMS show Pacific clock time, not the server-default (ET) one', async () => {
    // Fix "now" so the calendar-day gate difference between America/New_York
    // (server default) and America/Los_Angeles is exercised:
    // 2026-08-10T05:00:00Z is 1:00 AM Aug 10 in ET but 10:00 PM Aug 9 in PT.
    // now = 03:00Z keeps `now.getHours()` (ET) away from every other gated
    // section's trigger hour (8/14/20/21) so only the hour-based path fires.
    const NOW = new Date('2026-08-10T03:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const startTime = new Date(NOW.getTime() + 2 * 60 * 60 * 1000).toISOString() // 05:00:00Z
    holder.hourBooking = {
      id: 'bk-1', client_id: 'client-1', team_member_id: 'tech-1',
      service_type: 'Cleaning', start_time: startTime,
      clients: { name: 'Alice', phone: '+15551234567', email: null, sms_consent: true },
      team_members: { name: 'Tommy Tech', phone: '+15559876543', sms_consent: true },
    }

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledTimes(2) // client + team

    const bodies = sendSMSMock.mock.calls.map((c) => (c[0] as { body: string }).body)
    const clientBody = bodies.find((b) => b.includes('arrives at'))
    const teamBody = bodies.find((b) => b.includes('Job in'))
    expect(clientBody).toContain('10:00 PM')
    expect(clientBody).not.toContain('1:00 AM')
    expect(teamBody).toContain('10:00 PM')
    expect(teamBody).not.toContain('1:00 AM')
  })
})
