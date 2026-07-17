import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * handleGetAccount and handleResendConfirmation (legacy Selena engine) find a
 * client's "next upcoming booking" via
 * `.gte('start_time', new Date().toISOString())` against the naive-ET (no
 * tz) `bookings.start_time` column. During the evening ET window (roughly
 * 8pm-midnight ET) the real-UTC instant is already on tomorrow's calendar
 * date while the naive-ET column is still today's — the comparison silently
 * excluded a still-upcoming booking later that same ET evening. Same class
 * already fixed on webhooks/telnyx's YES/CONFIRM branch and mirrored in
 * @/lib/selena/core (the Yinez/NYC Maid engine).
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5 -- UTC has
 * already rolled to Jan 6, ET has not. Tonight's booking is at 9pm ET Jan 5.
 */
process.env.TZ = 'UTC'

const TENANT = 'tenant-a'
const CLIENT = 'client-a'
const TONIGHT = '2026-01-05T21:00:00' // 9pm ET Jan 5 -- naive-ET, still upcoming

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) >= (val as string)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) <= (val as string)); return c },
    order: () => c,
    limit: () => c,
    single: async () => ({ data: matched()[0] ?? null, error: matched()[0] ? null : { message: 'not found' } }),
    then: (resolve: (v: { data: unknown; error: null }) => unknown) => Promise.resolve({ data: matched(), error: null }).then(resolve),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(() => Promise.resolve()) }))

import { handleGetAccount, handleResendConfirmation } from './selena-legacy-handlers'

beforeEach(() => {
  for (const k of Object.keys(DB)) delete DB[k]
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
})
afterEach(() => {
  vi.useRealTimers()
})

describe('handleGetAccount — must not drop tonight\'s still-upcoming booking during the evening ET window', () => {
  it('includes a 9pm-ET booking in `upcoming` at 7:30pm ET real time', async () => {
    DB.sms_conversations = [{ id: 'convo-1', client_id: CLIENT }]
    DB.clients = [{ id: CLIENT, tenant_id: TENANT, name: 'Jane' }]
    DB.bookings = [{ id: 'bk-tonight', tenant_id: TENANT, client_id: CLIENT, status: 'scheduled', start_time: TONIGHT }]

    const out = await handleGetAccount(TENANT, 'convo-1')
    const parsed = JSON.parse(out)
    // Pre-fix: real-UTC lower bound (already Jan 6) excluded the Jan 5 9pm
    // booking -- `upcoming` came back empty.
    expect(parsed.upcoming.map((b: { id: string }) => b.id)).toContain('bk-tonight')
  })
})

describe('handleResendConfirmation — must find tonight\'s booking without an explicit booking_id', () => {
  it('resolves the 9pm-ET booking, not "No upcoming booking found"', async () => {
    DB.sms_conversations = [{ id: 'convo-1', client_id: CLIENT }]
    DB.bookings = [{ id: 'bk-tonight', tenant_id: TENANT, client_id: CLIENT, status: 'scheduled', start_time: TONIGHT, service_type: 'Standard', hourly_rate: 60 }]

    const out = await handleResendConfirmation(TENANT, {}, 'convo-1')
    const parsed = JSON.parse(out)
    // Pre-fix: the lookup query missed the booking entirely and returned
    // {error:'No upcoming booking found'}. Post-fix it resolves the booking
    // and fails one step later (no client row seeded, so `booking.clients`
    // join is empty and `client?.email` is falsy) -- proving the naive-ET
    // lookup itself now succeeds.
    expect(parsed.error).not.toBe('No upcoming booking found')
    expect(parsed.error).toBe('No email on file')
  })
})
