import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nowNaiveET } from '@/lib/recurring'

/**
 * outreach cron -- p1-w1 queue item 8 (ET/UTC boundary sweep). The
 * upcoming-booking exclusion queried `.gte('start_time', new
 * Date().toISOString())` -- bookings.start_time is naive ET (no offset),
 * not real UTC, so a real-instant boundary here could miss an actual
 * upcoming booking and send seasonal "come check us out" outreach to a
 * client who is already booked. Fixed to the established
 * `${nowNaiveET()}Z` convention (same as cron/retention/no-show-check,
 * this morning's platform-wide sweep 79f44df88).
 */

const TENANT_ID = 'tenant-1'
const sentSms: Array<{ to: string }> = []

vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async (args: { to: string }) => {
    sentSms.push({ to: args.to })
    return { success: true }
  }),
}))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: { retention: { sms: true } } })),
}))
vi.mock('@/lib/outreach', () => ({
  getActiveMoments: () => [{ id: 'moment-1', name: 'Test Moment' }],
  pickMessage: () => 'Hey there!',
  qualifiesForMoment: () => true,
}))

type Row = Record<string, unknown>
let clientsRows: Row[]
let bookingsRows: Row[]
const bookingsGteCalls: Array<{ col: string; val: unknown }> = []

function builder(table: string) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    not: () => chain,
    in: () => chain,
    gte: (col: string, val: unknown) => {
      if (table === 'bookings') bookingsGteCalls.push({ col, val })
      return chain
    },
    insert: () => ({ then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) }),
    update: () => chain,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenants') return resolve({ data: [{ id: TENANT_ID, name: 'Test Co', telnyx_api_key: 'key', telnyx_phone: '+15550000000', selena_config: null }], error: null })
      if (table === 'clients') return resolve({ data: clientsRows, error: null })
      if (table === 'bookings') return resolve({ data: bookingsRows, error: null })
      if (table === 'recurring_schedules') return resolve({ data: [], error: null })
      if (table === 'deals') return resolve({ data: [], error: null })
      if (table === 'outreach_log') return resolve({ data: [], error: null })
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (table: string) => builder(table) } }))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/outreach', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sentSms.length = 0
  bookingsGteCalls.length = 0
  clientsRows = [
    { id: 'c-booked', name: 'Already Booked', phone: '+15551110001', pet_name: null, pet_type: null, do_not_service: false, sms_marketing_opt_out: false, sms_consent: true, outreach_count: 0 },
    { id: 'c-unbooked', name: 'Not Booked', phone: '+15551110002', pet_name: null, pet_type: null, do_not_service: false, sms_marketing_opt_out: false, sms_consent: true, outreach_count: 0 },
  ]
  bookingsRows = [{ client_id: 'c-booked' }]
})

describe('outreach cron -- upcoming-booking exclusion uses ET-aware boundary', () => {
  it('builds the boundary from nowNaiveET(), not a real UTC instant', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(bookingsGteCalls).toHaveLength(1)
    expect(bookingsGteCalls[0].col).toBe('start_time')
    expect((bookingsGteCalls[0].val as string).slice(0, 16)).toBe(`${nowNaiveET()}Z`.slice(0, 16))
  })

  it('excludes a client with an upcoming booking from outreach SMS', async () => {
    await GET(req())
    expect(sentSms.some((s) => s.to === '+15551110001')).toBe(false)
    expect(sentSms.some((s) => s.to === '+15551110002')).toBe(true)
  })
})
