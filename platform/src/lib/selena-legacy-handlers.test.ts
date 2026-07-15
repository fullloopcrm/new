import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Cross-client authorization boundary for the LEGACY Selena tool handlers
 * (selena-legacy-handlers.ts). This is the SMS-bot engine every tenant EXCEPT
 * nycmaid runs in production (webhooks/telnyx/route.ts: "NYC Maid runs the
 * REAL Yinez agent ... Other tenants stay on the legacy engine").
 *
 * handleResendConfirmation, handleRescheduleBooking, handleCancelBooking, and
 * handleBookingDetails all accept a caller-supplied `booking_id` tool-call
 * argument (the AI model fills it in from the SMS conversation) and used to
 * fetch the booking scoped ONLY by tenant_id -- never verifying it belonged
 * to the texting client. Any client with a live SMS conversation could ask
 * Selena about (or reschedule/cancel) a DIFFERENT client's booking in the
 * same tenant just by supplying that booking's id. The sibling bug class was
 * already fixed on the newer selena/core.ts engine (F-1/F-2/F-4) but never
 * ported to this legacy file, which is what real inbound SMS actually runs
 * for the vast majority of tenants.
 *
 * Mock strategy: a per-table resolver keyed on the accumulated .eq() filters,
 * matching the convention already used by src/lib/selena/booking-authz.test.ts.
 */

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }

let selectResolver: (table: string, eqs: Eqs) => Resolved
let updateCalls: Array<{ table: string; values: Record<string, unknown>; eqs: Eqs }>

function builder(table: string) {
  const eqs: Eqs = {}
  let updateValues: Record<string, unknown> | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    update: (values: Record<string, unknown>) => {
      updateValues = values
      return chain
    },
    insert: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => selectResolver(table, eqs),
    maybeSingle: async () => selectResolver(table, eqs),
    then: (onF: (v: Resolved) => unknown, onR?: (e: unknown) => unknown) => {
      if (updateValues !== null) {
        updateCalls.push({ table, values: updateValues, eqs: { ...eqs } })
      }
      return Promise.resolve({ data: null, error: null }).then(onF, onR)
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))

import {
  handleResendConfirmation,
  handleRescheduleBooking,
  handleCancelBooking,
  handleBookingDetails,
} from './selena-legacy-handlers'

const TENANT = 'tenant-A'
const CALLER_CLIENT = 'client-caller'
const VICTIM_CLIENT = 'client-victim'
const FUTURE = new Date(Date.now() + 30 * 864e5).toISOString()

beforeEach(() => {
  updateCalls = []
  selectResolver = () => ({ data: null, error: null })
})

function mockConvo() {
  return (table: string, eqs: Eqs) => {
    if (table === 'sms_conversations') return { data: { client_id: CALLER_CLIENT }, error: null }
    return { data: null, error: null }
  }
}

describe('handleResendConfirmation — cross-client authorization', () => {
  it('REJECTS a booking_id belonging to a different client in the same tenant (no email sent)', async () => {
    selectResolver = (table, eqs) => {
      if (table === 'sms_conversations') return { data: { client_id: CALLER_CLIENT }, error: null }
      if (table === 'bookings') {
        return {
          data: { client_id: VICTIM_CLIENT, start_time: FUTURE, service_type: 'clean', hourly_rate: 50, clients: { name: 'Victim', email: 'victim@example.com', pin: '999999' }, team_members: null, tenants: { name: 'T' } },
          error: null,
        }
      }
      return { data: null, error: null }
    }
    const { sendEmail } = await import('@/lib/email')
    const out = await handleResendConfirmation(TENANT, { booking_id: 'bk-victim' }, 'convo-1')
    expect(JSON.parse(out).error).toBe('not_your_booking')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('ALLOWS resending confirmation for the caller’s own booking', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CALLER_CLIENT }, error: null }
      if (table === 'bookings') {
        return {
          data: { client_id: CALLER_CLIENT, start_time: FUTURE, service_type: 'clean', hourly_rate: 50, clients: { name: 'Caller', email: 'caller@example.com', pin: '111111' }, team_members: null, tenants: { name: 'T' } },
          error: null,
        }
      }
      return { data: null, error: null }
    }
    const out = await handleResendConfirmation(TENANT, { booking_id: 'bk-own' }, 'convo-1')
    expect(JSON.parse(out).success).toBe(true)
  })
})

describe('handleRescheduleBooking — cross-client authorization', () => {
  it('REJECTS a booking_id belonging to a different client (no write)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CALLER_CLIENT }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-victim', client_id: VICTIM_CLIENT, start_time: FUTURE, recurring_type: 'weekly', tenants: { reschedule_notice_days: 2 } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleRescheduleBooking(TENANT, { booking_id: 'bk-victim', new_date: '2099-02-01', new_time: '2:00 PM' }, 'convo-1')
    expect(JSON.parse(out).error).toBe('not_your_booking')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS rescheduling the caller’s own recurring booking (writes)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CALLER_CLIENT }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-own', client_id: CALLER_CLIENT, start_time: FUTURE, recurring_type: 'weekly', tenants: { reschedule_notice_days: 2 } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleRescheduleBooking(TENANT, { booking_id: 'bk-own', new_date: '2099-02-01', new_time: '2:00 PM' }, 'convo-1')
    expect(JSON.parse(out).success).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })
})

describe('handleCancelBooking — cross-client authorization', () => {
  it('REJECTS a booking_id belonging to a different client (no write)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CALLER_CLIENT }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-victim', client_id: VICTIM_CLIENT, start_time: FUTURE, recurring_type: 'weekly', clients: { name: 'Victim' }, tenants: { reschedule_notice_days: 2 } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleCancelBooking(TENANT, { booking_id: 'bk-victim' }, 'convo-1')
    expect(JSON.parse(out).error).toBe('not_your_booking')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS cancelling the caller’s own recurring booking (writes)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CALLER_CLIENT }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-own', client_id: CALLER_CLIENT, start_time: FUTURE, recurring_type: 'weekly', clients: { name: 'Caller' }, tenants: { reschedule_notice_days: 2 } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleCancelBooking(TENANT, { booking_id: 'bk-own' }, 'convo-1')
    expect(JSON.parse(out).success).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })
})

describe('handleBookingDetails — cross-client authorization', () => {
  it('REJECTS an explicit booking_id belonging to a different client (no data returned)', async () => {
    selectResolver = (table, eqs) => {
      if (table === 'sms_conversations') return { data: { client_id: CALLER_CLIENT }, error: null }
      if (table === 'bookings') {
        return {
          data: {
            id: 'bk-victim', client_id: VICTIM_CLIENT, start_time: FUTURE, end_time: FUTURE,
            check_in_time: null, check_out_time: null, check_in_location: null, check_out_location: null,
            check_in_lat: null, check_in_lng: null, check_out_lat: null, check_out_lng: null,
            actual_hours: null, hourly_rate: 50, price: 100, team_member_pay: 30,
            payment_status: 'paid', payment_method: 'card', status: 'completed', service_type: 'clean',
            team_members: null, clients: { name: 'Victim', address: '1 Victim St' },
          },
          error: null,
        }
      }
      return { data: null, error: null }
    }
    const out = await handleBookingDetails(TENANT, { booking_id: 'bk-victim' }, 'convo-1')
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('not_your_booking')
    expect(parsed.client_address).toBeUndefined()
    expect(parsed.payment_status).toBeUndefined()
  })

  it('ALLOWS fetching the caller’s own booking details', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CALLER_CLIENT }, error: null }
      if (table === 'bookings') {
        return {
          data: {
            id: 'bk-own', client_id: CALLER_CLIENT, start_time: FUTURE, end_time: FUTURE,
            check_in_time: null, check_out_time: null, check_in_location: null, check_out_location: null,
            check_in_lat: null, check_in_lng: null, check_out_lat: null, check_out_lng: null,
            actual_hours: null, hourly_rate: 50, price: 100, team_member_pay: 30,
            payment_status: 'paid', payment_method: 'card', status: 'completed', service_type: 'clean',
            team_members: null, clients: { name: 'Caller', address: '1 Caller St' },
          },
          error: null,
        }
      }
      return { data: null, error: null }
    }
    const out = await handleBookingDetails(TENANT, { booking_id: 'bk-own' }, 'convo-1')
    const parsed = JSON.parse(out)
    expect(parsed.error).toBeUndefined()
    expect(parsed.client_address).toBe('1 Caller St')
  })
})
