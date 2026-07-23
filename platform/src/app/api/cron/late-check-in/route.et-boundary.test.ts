import { describe, it, expect, vi, afterEach } from 'vitest'
import { nowNaiveET, etToday, formatNaiveET, parseNaiveET } from '@/lib/recurring'

/**
 * cron/late-check-in -- p1-w1 queue item 8 (ET/UTC boundary sweep). An
 * earlier fix here correctly switched the "10 min ago" bound to the
 * naive-ET-digits-plus-Z convention, but left the day-floor as
 * etDayBoundaryUTC() -- documented (in its own doc comment) as the helper
 * for real TIMESTAMPTZ columns, NOT naive-ET columns like start_time.
 * Comparing its genuine UTC-converted digits against the naive column
 * reintroduced the same class of 4-5h skew for the floor bound. Fixed to
 * match the 10-min bound's convention: `${formatNaiveET(etToday())}Z`.
 * Also fixed a display-only new Date(start_time) misparse in the
 * push/in-app notification text.
 */

const BOOKING_START = nowNaiveET(-20 * 60 * 1000) // 20 min ago ET -- past the 10-min late threshold, well within today

let bookingsGteCalls: Array<{ col: string; val: unknown }> = []

function builder(table: string) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    is: () => chain,
    not: () => chain,
    lte: () => chain,
    gte: (col: string, val: unknown) => {
      if (table === 'bookings') bookingsGteCalls.push({ col, val })
      return chain
    },
    limit: () => chain,
    then: (resolve: (v: { data: unknown; error: null }) => void) => {
      if (table === 'tenants') {
        return resolve({ data: [{ id: 'tenant-1', name: 'Test Co', telnyx_api_key: 'key', telnyx_phone: '+15550000000', owner_phone: '+15551234567', phone: '+15551234567' }], error: null })
      }
      if (table === 'bookings') {
        return resolve({
          data: [{ id: 'b1', start_time: BOOKING_START, hourly_rate: 65, team_member_id: 'tm1', fifteen_min_alert_time: null, clients: { name: 'Jane Doe', phone: '+15559990000' }, team_members: { name: 'Alex Cleaner', phone: '+15559991111', pin: '1234' } }],
          error: null,
        })
      }
      return resolve({ data: [], error: null })
    },
    insert: () => ({ then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => builder(t) } }))
vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/comms-prefs', () => ({ getCommPrefs: vi.fn(async () => ({ comms: {} })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({
  teamSmsTemplates: () => ({
    lateCheckInCleaner: () => 'cleaner text',
    lateCheckInAdmin: () => 'admin text',
    lateCheckOutCleaner: () => 'cleaner text',
    lateCheckOutAdmin: () => 'admin text',
  }),
}))
const pushCalls: Array<{ title: string; body: string }> = []
vi.mock('@/lib/push', () => ({
  sendPushToTenantAdmins: vi.fn(async (_tenantId: string, title: string, body: string) => {
    pushCalls.push({ title, body })
  }),
}))

import { GET } from './route'

describe('cron/late-check-in -- ET-aware day-floor + display time', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    bookingsGteCalls = []
    pushCalls.length = 0
  })

  it('builds the day-floor bound from naive ET digits, not a real UTC-converted instant', async () => {
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)

    const dayFloorCall = bookingsGteCalls.find((c) => c.col === 'start_time')
    expect(dayFloorCall).toBeDefined()
    expect(dayFloorCall!.val).toBe(`${formatNaiveET(etToday())}Z`)
  })

  it('shows the correct ET clock time in the late-check-in push notification', async () => {
    await GET(new Request('http://x'))
    const expectedTime = parseNaiveET(BOOKING_START).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    expect(pushCalls.some((p) => p.body.includes(expectedTime))).toBe(true)
  })
})
