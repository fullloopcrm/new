import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Client-tool booking-ownership boundary — reschedule/cancel/resend/details.
 *
 * reschedule_booking, cancel_booking, resend_confirmation and booking_details
 * are all CLIENT_TOOLS (src/lib/selena/tools.ts CLIENT_TOOLS set) — reachable
 * by any ordinary client texting the tenant's SMS assistant, with booking_id
 * supplied as a free-form tool argument. All four fetched the referenced
 * booking WITHOUT checking it belonged to the calling client:
 *
 *   - reschedule_booking / cancel_booking didn't even scope the initial
 *     SELECT by tenant_id (booking.tenant_id was read back FROM the row and
 *     used only for the later UPDATE) — any client, in ANY tenant, could
 *     reschedule or CANCEL any booking system-wide just by supplying its id.
 *   - resend_confirmation / booking_details scoped the SELECT by tenant_id
 *     but never checked client_id — an intra-tenant cross-client read
 *     (another client's address/GPS/payment details, or a triggered
 *     confirmation email disclosing the victim's address in the tool result).
 *
 * Fixed by loading the conversation's own client_id/tenant_id FIRST, scoping
 * the booking lookup to that tenant, and rejecting with 'not_your_booking'
 * when booking.client_id doesn't match.
 */

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }

let selectResolver: (table: string, eqs: Eqs) => Resolved
let updateCalls: Array<{ table: string; values: Record<string, unknown>; eqs: Eqs }>
const emailMock = vi.hoisted(() => ({ calls: [] as Array<{ to: string; subject: string }> }))

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
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => selectResolver(table, eqs),
    then: (resolve: (v: Resolved) => void) => {
      if (updateValues) updateCalls.push({ table, values: updateValues, eqs: { ...eqs } })
      resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (table: string) => builder(table) } }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({
  sendEmail: async (to: string, subject: string) => { emailMock.calls.push({ to, subject }) },
}))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))

import { handleTool, EMPTY_CHECKLIST, type YinezResult as CoreResult } from '@/lib/selena/core'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const CLIENT_A = 'client-A'
const CLIENT_OTHER = 'client-OTHER'

const coreResult = (): CoreResult => ({ text: '', checklist: EMPTY_CHECKLIST })

beforeEach(() => {
  updateCalls = []
  emailMock.calls = []
  selectResolver = () => ({ data: null, error: null })
})

describe('reschedule_booking / cancel_booking — client ownership', () => {
  it('reschedule_booking REJECTS a same-tenant booking owned by a different client, no mutation', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-OTHER', start_time: '2099-06-01T10:00:00', recurring_type: 'weekly', client_id: CLIENT_OTHER, tenant_id: TENANT_A }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('reschedule_booking', { booking_id: 'bk-OTHER', new_date: '2099-06-08', new_time: '10am' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('not_your_booking')
    expect(updateCalls).toHaveLength(0)
  })

  it('reschedule_booking REJECTS a booking_id from another tenant (scoped fetch misses), no mutation', async () => {
    selectResolver = (table, eqs) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') {
        if (eqs.tenant_id === TENANT_B) return { data: { id: 'bk-B', start_time: '2099-06-01T10:00:00', recurring_type: 'weekly', client_id: 'client-B', tenant_id: TENANT_B }, error: null }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }
    const out = await handleTool('reschedule_booking', { booking_id: 'bk-B', new_date: '2099-06-08', new_time: '10am' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('Booking not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('reschedule_booking ALLOWS the owning client to reschedule their own recurring booking', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-A', start_time: '2099-06-01T10:00:00', recurring_type: 'weekly', client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('reschedule_booking', { booking_id: 'bk-A', new_date: '2099-06-08', new_time: '10am' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })

  it('cancel_booking REJECTS a same-tenant booking owned by a different client, no mutation', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-OTHER', start_time: '2099-06-01T10:00:00', recurring_type: 'weekly', client_id: CLIENT_OTHER, clients: { name: 'Victim' }, tenant_id: TENANT_A }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('cancel_booking', { booking_id: 'bk-OTHER' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('not_your_booking')
    expect(updateCalls).toHaveLength(0)
  })

  it('cancel_booking ALLOWS the owning client to cancel their own recurring booking', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-A', start_time: '2099-06-01T10:00:00', recurring_type: 'weekly', client_id: CLIENT_A, clients: { name: 'A Client' }, tenant_id: TENANT_A }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('cancel_booking', { booking_id: 'bk-A' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })
})

describe('resend_confirmation — client ownership', () => {
  it('REJECTS a same-tenant booking owned by a different client (no email sent)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { client_id: CLIENT_OTHER, start_time: '2099-01-01T10:00:00', service_type: 'standard', hourly_rate: 69, clients: { name: 'Victim', email: 'victim@example.com', pin: '1234' }, cleaners: { name: 'Cleaner' } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('resend_confirmation', { booking_id: 'bk-OTHER' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('not_your_booking')
    expect(emailMock.calls).toHaveLength(0)
  })

  it('ALLOWS the owning client to resend their own confirmation', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { client_id: CLIENT_A, start_time: '2099-01-01T10:00:00', service_type: 'standard', hourly_rate: 69, clients: { name: 'A Client', email: 'a@example.com', pin: '1234' }, cleaners: { name: 'Cleaner' } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('resend_confirmation', { booking_id: 'bk-A' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    expect(emailMock.calls).toHaveLength(1)
    expect(emailMock.calls[0].to).toBe('a@example.com')
  })
})

describe('booking_details — client ownership', () => {
  it('REJECTS a same-tenant booking owned by a different client (no data returned)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') {
        return {
          data: {
            id: 'bk-OTHER', client_id: CLIENT_OTHER, start_time: '2026-01-01T10:00:00', end_time: '2026-01-01T12:00:00',
            check_in_time: null, check_out_time: null, check_in_location: null, check_out_location: null,
            actual_hours: null, hourly_rate: 69, price: 13800, cleaner_pay: 5000, payment_status: 'unpaid',
            payment_method: null, status: 'completed', service_type: 'standard',
            cleaners: { name: 'Cleaner' }, clients: { name: 'Victim', address: '123 Secret Ave' }, client_properties: null,
          },
          error: null,
        }
      }
      return { data: null, error: null }
    }
    const out = await handleTool('booking_details', { booking_id: 'bk-OTHER' }, 'convo-A', coreResult(), TENANT_A)
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('not_your_booking')
    expect(JSON.stringify(parsed)).not.toContain('Secret Ave')
  })

  it('ALLOWS the owning client to read their own booking details', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') {
        return {
          data: {
            id: 'bk-A', client_id: CLIENT_A, start_time: '2026-01-01T10:00:00', end_time: '2026-01-01T12:00:00',
            check_in_time: null, check_out_time: null, check_in_location: null, check_out_location: null,
            actual_hours: null, hourly_rate: 69, price: 13800, cleaner_pay: 5000, payment_status: 'unpaid',
            payment_method: null, status: 'completed', service_type: 'standard',
            cleaners: { name: 'Cleaner' }, clients: { name: 'A Client', address: '1 Main St' }, client_properties: null,
          },
          error: null,
        }
      }
      return { data: null, error: null }
    }
    const out = await handleTool('booking_details', { booking_id: 'bk-A' }, 'convo-A', coreResult(), TENANT_A)
    const parsed = JSON.parse(out)
    expect(parsed.error).toBeUndefined()
  })
})
