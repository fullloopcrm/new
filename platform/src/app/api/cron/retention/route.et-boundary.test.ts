import { describe, it, expect, vi, afterEach } from 'vitest'
import { nowNaiveET } from '@/lib/recurring'

/**
 * cron/retention -- p1-w1 queue item 8 (ET/UTC boundary sweep). This morning's
 * platform-wide sweep (79f44df88, already on main) fixed the upcoming-booking
 * check in this same file but missed a second instance: `lastDate = new
 * Date(lastBooking.end_time)` still misparses the naive-ET end_time column as
 * UTC, shifting the 30/90-day retention window a few hours off the real ET
 * boundary. Fixed via parseNaiveET().
 */

const TENANT_ROW = { id: 'tenant-1', name: 'Test Co', telnyx_api_key: 'key', telnyx_phone: '+15551110000' }
const CLIENT_ROW = { id: 'client-1', name: 'Jane Doe', phone: '+15559998888' }

let bookingsQueue: Array<Record<string, unknown>>
let sentSms: Array<{ to: string }> = []

function builder(table: string) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    not: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => {
      const row = bookingsQueue.shift()
      return row ? { data: row, error: null } : { data: null, error: { message: 'no rows' } }
    },
    insert: () => ({ then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) }),
    then: (resolve: (v: { data: unknown; error: null; count?: number }) => void) => {
      if (table === 'tenants') return resolve({ data: [TENANT_ROW], error: null })
      if (table === 'clients') return resolve({ data: [CLIENT_ROW], error: null })
      // bookings count queries (upcoming check) and notifications count
      // queries (retention-count / recent-retention checks) both just need
      // "none" so the client is never skipped for those unrelated reasons.
      return resolve({ data: [], error: null, count: 0 })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => builder(t) } }))
vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn(async () => true) }))
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async (args: { to: string }) => {
    sentSms.push({ to: args.to })
    return { success: true }
  }),
}))

import { GET } from './route'

describe('cron/retention -- ET-aware 30/90 day window', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    sentSms = []
  })

  it('sends a retention text for a client whose last completed job was ~31 days ago (naive ET)', async () => {
    bookingsQueue = [{ id: 'b1', end_time: nowNaiveET(-31 * 86400000) }]
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(sentSms).toEqual([{ to: '+15559998888' }])
  })

  it('skips a client whose last completed job was only ~29 days ago (too recent, inside the 30-day floor)', async () => {
    bookingsQueue = [{ id: 'b1', end_time: nowNaiveET(-29 * 86400000) }]
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(sentSms).toEqual([])
  })

  it('skips a client whose last completed job was ~91 days ago (past the 90-day ceiling)', async () => {
    bookingsQueue = [{ id: 'b1', end_time: nowNaiveET(-91 * 86400000) }]
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(sentSms).toEqual([])
  })
})
