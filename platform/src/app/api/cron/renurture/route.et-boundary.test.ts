import { describe, it, expect, vi, afterEach } from 'vitest'
import { nowNaiveET } from '@/lib/recurring'

/**
 * renurture cron -- p1-w1 queue item 8 (ET/UTC boundary sweep). hasUpcoming
 * was computed via `new Date(booking.start_time).getTime() > now`, but
 * bookings.start_time is stored naive-ET (no offset). A 'T'-formatted string
 * with no timezone parses as UTC per the JS spec, so every value read 4-5h
 * EARLIER than the real ET instant it represents (same bug class as
 * team-portal/jobs' day-boundary fix, parseNaiveET's own doc comment). A
 * client with a real, still-upcoming booking could have it misread as
 * already in the past and get sent a "come back, we miss you" win-back
 * touch while already rebooked -- fixed via parseNaiveET().
 */

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: () => 'fake-telnyx-key' }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

const sentTouches: Array<{ clientId: string; touchKey: string }> = []
vi.mock('@/lib/nycmaid/renurture-send', () => ({
  sendRenurtureTouch: vi.fn(async (_tenantId: string, client: { id: string }, touch: { key: string }) => {
    sentTouches.push({ clientId: client.id, touchKey: touch.key })
    return 'sent'
  }),
}))

type Row = Record<string, unknown>
let tenantsRows: Row[]
let clientsRows: Row[]
let bookingsRows: Row[]
let schedulesRows: Row[]
let renurtureLogRows: Row[]

function builder(table: string) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    limit: () => chain,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenants') return resolve({ data: tenantsRows, error: null })
      if (table === 'clients') return resolve({ data: clientsRows, error: null })
      if (table === 'bookings') return resolve({ data: bookingsRows, error: null })
      if (table === 'recurring_schedules') return resolve({ data: schedulesRows, error: null })
      if (table === 'renurture_log') return resolve({ data: renurtureLogRows, error: null })
      return resolve({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => builder(t) } }))

import { GET } from './route'

function seedOneTimeClientDueForTouch(overrides: Partial<Row> = {}) {
  tenantsRows = [{ id: NYCMAID_TENANT_ID, telnyx_api_key: 'encrypted-key' }]
  clientsRows = [{ id: 'client-1', name: 'Test Client', email: 't@example.com', phone: '+15551234567', email_marketing_opt_out: false, sms_marketing_opt_out: false }]
  // One completed booking 30 days ago, expressed the same naive-ET way
  // bookings.start_time really is (nowNaiveET is the codebase's own helper
  // for this), well past the 21-day one-time-segment threshold -- due for
  // the t1 touch.
  const completedNaive = nowNaiveET(-30 * 86400000)
  bookingsRows = [
    { client_id: 'client-1', status: 'completed', start_time: completedNaive },
    ...(overrides.extraBookings as Row[] || []),
  ]
  schedulesRows = []
  renurtureLogRows = []
}

describe('cron/renurture -- ET/UTC instant parsing for hasUpcoming', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    sentTouches.length = 0
  })

  it('sends a win-back touch to a client with no upcoming booking', async () => {
    seedOneTimeClientDueForTouch()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { balance: '50.00' } }) })))

    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(sentTouches).toEqual([{ clientId: 'client-1', touchKey: 'renurture_onetime_t1' }])
  })

  it('never sends a win-back touch when the client has a real upcoming booking, even one that would misparse as already-past under the old UTC-misread bug', async () => {
    seedOneTimeClientDueForTouch()
    // Scheduled 3 hours from real now, in ET wall-clock terms -- close enough
    // to "now" that the old bug (misreading it as UTC, 4-5h earlier) would
    // have placed it in the past relative to Date.now(), flipping hasUpcoming
    // to false and letting the client through as if they had no booking.
    const inThreeHoursNaive = nowNaiveET(3 * 3600000)
    bookingsRows.push({ client_id: 'client-1', status: 'scheduled', start_time: inThreeHoursNaive })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { balance: '50.00' } }) })))

    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(sentTouches).toEqual([])
  })
})
