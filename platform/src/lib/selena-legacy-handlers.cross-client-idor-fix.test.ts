import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleRescheduleBooking, handleCancelBooking, handleManageRecurring,
 * handleBookingDetails, and handleResendConfirmation all accept a
 * caller-supplied id (booking_id / schedule_id) and, before this fix,
 * scoped their lookup to tenant_id only -- not client_id. Any client texting
 * Selena could act on (or read) another client's booking/recurring schedule
 * in the same tenant just by supplying that id. This is the same class of
 * bug already fixed in lib/selena/core.ts's handleManageRecurring, but this
 * parallel "legacy" file (live-wired via selena.ts / the Telnyx webhook) had
 * never received the equivalent fix.
 */

const TENANT = 'tenant-a'
const CLIENT_A = 'client-a'
const CLIENT_B = 'client-b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    not: () => c,
    gte: () => c,
    lte: () => c,
    order: () => c,
    limit: () => c,
    update: (patch: Row) => ({
      eq: (col: string, val: unknown) => {
        const localFilters = [...filters, (r: Row) => r[col] === val]
        return {
          eq: (col2: string, val2: unknown) => {
            localFilters.push((r: Row) => r[col2] === val2)
            const apply = () => rowsOf().filter((r) => localFilters.every((f) => f(r))).forEach((r) => Object.assign(r, patch))
            return { then: (resolve: (v: unknown) => unknown) => { apply(); return Promise.resolve({ data: null, error: null }).then(resolve) } }
          },
          then: (resolve: (v: unknown) => unknown) => {
            rowsOf().filter((r) => localFilters.every((f) => f(r))).forEach((r) => Object.assign(r, patch))
            return Promise.resolve({ data: null, error: null }).then(resolve)
          },
        }
      },
    }),
    single: async () => ({ data: matched()[0] ?? null, error: matched()[0] ? null : { message: 'not found' } }),
    maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: null }) => unknown) => Promise.resolve({ data: matched(), error: null }).then(resolve),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({})) }))

import {
  handleRescheduleBooking,
  handleCancelBooking,
  handleManageRecurring,
  handleBookingDetails,
  handleResendConfirmation,
} from './selena-legacy-handlers'

beforeEach(() => {
  for (const k of Object.keys(DB)) delete DB[k]
  DB.sms_conversations = [{ id: 'convo-a', client_id: CLIENT_A, tenant_id: TENANT }]
})

describe('cross-client IDOR fix — booking_id / schedule_id ownership checks', () => {
  it('handleRescheduleBooking refuses to touch a booking owned by another client', async () => {
    DB.bookings = [{
      id: 'bk-victim', tenant_id: TENANT, client_id: CLIENT_B, recurring_type: 'weekly',
      start_time: '2026-09-01T14:00:00', tenants: { reschedule_notice_days: 1 },
    }]
    const out = JSON.parse(await handleRescheduleBooking(TENANT, { booking_id: 'bk-victim', new_date: '2026-09-05', new_time: '2:00 PM' }, 'convo-a'))
    expect(out.error).toBe('not_your_booking')
    expect(DB.bookings[0].start_time).toBe('2026-09-01T14:00:00')
  })

  it('handleCancelBooking refuses to cancel a booking owned by another client', async () => {
    DB.bookings = [{
      id: 'bk-victim', tenant_id: TENANT, client_id: CLIENT_B, recurring_type: 'weekly',
      start_time: '2026-09-01T14:00:00', tenants: { reschedule_notice_days: 1 },
    }]
    const out = JSON.parse(await handleCancelBooking(TENANT, { booking_id: 'bk-victim' }, 'convo-a'))
    expect(out.error).toBe('not_your_booking')
    expect(DB.bookings[0].status).not.toBe('cancelled')
  })

  it('handleManageRecurring refuses to pause/cancel a schedule owned by another client', async () => {
    DB.recurring_schedules = [{ id: 'sched-victim', tenant_id: TENANT, client_id: CLIENT_B, status: 'active' }]
    const out = JSON.parse(await handleManageRecurring(TENANT, { action: 'cancel', schedule_id: 'sched-victim' }, 'convo-a'))
    expect(out.error).toBe('not_your_schedule')
    expect(DB.recurring_schedules[0].status).toBe('active')
  })

  it('handleBookingDetails refuses to return another client\'s booking (address/GPS/payment history)', async () => {
    DB.bookings = [{
      id: 'bk-victim', tenant_id: TENANT, client_id: CLIENT_B, status: 'completed',
      start_time: '2026-09-01T14:00:00', clients: { name: 'Victim', address: '123 Secret St' },
    }]
    const out = JSON.parse(await handleBookingDetails(TENANT, { booking_id: 'bk-victim' }, 'convo-a'))
    expect(out.error).toBe('not_your_booking')
    expect(JSON.stringify(out)).not.toContain('123 Secret St')
  })

  it('handleResendConfirmation refuses to resend confirmation for another client\'s booking', async () => {
    DB.bookings = [{
      id: 'bk-victim', tenant_id: TENANT, client_id: CLIENT_B, status: 'scheduled',
      start_time: '2026-09-01T14:00:00', service_type: 'Deep Clean', hourly_rate: 60,
      clients: { name: 'Victim', email: 'victim@example.com', pin: '9999' },
    }]
    const out = JSON.parse(await handleResendConfirmation(TENANT, { booking_id: 'bk-victim' }, 'convo-a'))
    expect(out.error).toBe('not_your_booking')
  })

  it('still allows a client to act on their own booking/schedule', async () => {
    DB.bookings = [{
      id: 'bk-mine', tenant_id: TENANT, client_id: CLIENT_A, recurring_type: 'weekly',
      start_time: '2026-09-01T14:00:00', tenants: { reschedule_notice_days: 1 }, clients: { name: 'Me' },
    }]
    const out = JSON.parse(await handleCancelBooking(TENANT, { booking_id: 'bk-mine' }, 'convo-a'))
    expect(out.success).toBe(true)
    expect(DB.bookings[0].status).toBe('cancelled')
  })
})
