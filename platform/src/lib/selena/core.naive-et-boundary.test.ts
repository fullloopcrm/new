import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

/**
 * get_account, resend_confirmation, and manage_recurring (pause/cancel) all
 * found a client's "next upcoming booking" via
 * `.gte('start_time', new Date().toISOString())` against the naive-ET (no
 * tz) `bookings.start_time` column. During the evening ET window (roughly
 * 8pm-midnight ET) the real-UTC instant is already on tomorrow's calendar
 * date while the naive-ET column is still today's — the comparison
 * silently excluded a still-upcoming booking later that same ET evening.
 * Same class already fixed on webhooks/telnyx's YES/CONFIRM branch.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5 -- UTC has
 * already rolled to Jan 6, ET has not. Tonight's booking is at 9pm ET Jan 5.
 */
process.env.TZ = 'UTC'

let fake: FakeSupabase

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => fake.from(table) }),
}))

const notifyMock = vi.hoisted(() => ({ calls: [] as Array<{ type: string; title: string; message: string }> }))
vi.mock('@/lib/nycmaid/notify', () => ({
  notify: async (opts: { type: string; title: string; message: string }) => { notifyMock.calls.push(opts) },
}))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(() => Promise.resolve()) }))

import { handleTool, EMPTY_CHECKLIST, type YinezResult } from '@/lib/selena/core'

const TENANT = 'tttttttt-tttt-tttt-tttt-tttttttttttt'
const CLIENT = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const SCHEDULE = 'ssssssss-ssss-ssss-ssss-ssssssssssss'
const TONIGHT = '2026-01-05T21:00:00' // 9pm ET Jan 5 -- naive-ET, still upcoming
const coreResult = (): YinezResult => ({ text: '', checklist: EMPTY_CHECKLIST })

beforeEach(() => {
  fake = createFakeSupabase()
  notifyMock.calls = []
  fake._seed('sms_conversations', [{ id: 'convo-1', client_id: CLIENT, tenant_id: TENANT }])
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
})
afterEach(() => {
  vi.useRealTimers()
})

describe('get_account — must not drop tonight\'s still-upcoming booking during the evening ET window', () => {
  it('includes a 9pm-ET booking in `upcoming` at 7:30pm ET real time', async () => {
    fake._seed('clients', [{ id: CLIENT, tenant_id: TENANT, name: 'Jane', email: 'jane@x.com' }])
    fake._seed('bookings', [{ id: 'bk-tonight', tenant_id: TENANT, client_id: CLIENT, status: 'scheduled', start_time: TONIGHT }])

    const out = await handleTool('get_account', {}, 'convo-1', coreResult())
    const parsed = JSON.parse(out)
    // Pre-fix: real-UTC lower bound (already Jan 6) excluded the Jan 5 9pm
    // booking -- `upcoming` came back empty.
    expect(parsed.upcoming.map((b: { id: string }) => b.id)).toContain('bk-tonight')
  })
})

describe('resend_confirmation — must find tonight\'s booking without an explicit booking_id', () => {
  it('resolves the 9pm-ET booking, not "No upcoming booking found"', async () => {
    fake._seed('clients', [{ id: CLIENT, tenant_id: TENANT, name: 'Jane', email: null }])
    fake._seed('bookings', [{ id: 'bk-tonight', tenant_id: TENANT, client_id: CLIENT, status: 'scheduled', start_time: TONIGHT, service_type: 'Standard', hourly_rate: 60 }])

    const out = await handleTool('resend_confirmation', {}, 'convo-1', coreResult())
    const parsed = JSON.parse(out)
    // Pre-fix: the lookup query missed the booking entirely and returned
    // {error:'No upcoming booking found'}. Post-fix it resolves the booking
    // and fails one step later on the (unrelated) missing-email check --
    // proving the naive-ET lookup itself now succeeds.
    expect(parsed.error).not.toBe('No upcoming booking found')
    expect(parsed.error).toBe('No email on file')
  })
})

describe('manage_recurring pause/cancel — must cancel tonight\'s still-upcoming booking', () => {
  beforeEach(() => {
    fake._seed('recurring_schedules', [{ id: SCHEDULE, tenant_id: TENANT, client_id: CLIENT, status: 'active', paused_until: null }])
  })

  it('pause: cancels a booking at 9pm ET tonight when pause_until is today', async () => {
    fake._seed('bookings', [{ id: 'bk-tonight', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'scheduled', start_time: TONIGHT }])

    const out = await handleTool('manage_recurring', { action: 'pause', schedule_id: SCHEDULE, pause_until: '2026-01-05' }, 'convo-1', coreResult())
    const parsed = JSON.parse(out)
    expect(parsed.success).toBe(true)
    // Pre-fix: real-UTC lower bound (already Jan 6) excluded the Jan 5 9pm
    // booking from the cancel -- cleaner still shows up despite Selena
    // telling the client the schedule is paused.
    expect(parsed.message).toContain('1 upcoming visit cancelled')
    const statuses = Object.fromEntries(fake._all('bookings').map((b) => [b.id, b.status]))
    expect(statuses['bk-tonight']).toBe('cancelled')
  })

  it('cancel: cancels a booking at 9pm ET tonight', async () => {
    fake._seed('bookings', [{ id: 'bk-tonight', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'confirmed', start_time: TONIGHT }])

    const out = await handleTool('manage_recurring', { action: 'cancel', schedule_id: SCHEDULE }, 'convo-1', coreResult())
    const parsed = JSON.parse(out)
    expect(parsed.success).toBe(true)
    expect(parsed.message).toContain('1 upcoming visit cancelled')
    const statuses = Object.fromEntries(fake._all('bookings').map((b) => [b.id, b.status]))
    expect(statuses['bk-tonight']).toBe('cancelled')
  })
})
