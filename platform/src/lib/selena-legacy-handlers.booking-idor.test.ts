/**
 * Same-tenant cross-client booking IDOR — legacy Selena SMS agent tool
 * handlers (non-NYCMAID tenants).
 *
 * handleRescheduleBooking / handleCancelBooking never called getConvoClientId
 * at all, so they never scoped the target booking by the requesting client —
 * only by tenant_id (trusted, passed in by the caller). Any client of a
 * tenant could reschedule/cancel ANY OTHER client's booking in that same
 * tenant by getting the SMS bot to pass that booking's UUID.
 *
 * handleResendConfirmation / handleBookingDetails fetched clientId but never
 * used it in the explicit-booking_id lookup, so the same class of leak
 * (portal PIN, email, GPS check-in/out, payment history) applied to those
 * two as well.
 *
 * Fix: every explicit booking_id lookup now scopes by tenant_id AND
 * client_id (from sms_conversations via conversationId), matching every
 * other handler in this file (handleCheckPayment, handleLookupBookings,
 * handleGetInvoice, etc.) which already do this correctly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))

import { supabaseAdmin } from '@/lib/supabase'
import {
  handleResendConfirmation,
  handleBookingDetails,
  handleRescheduleBooking,
  handleCancelBooking,
} from './selena-legacy-handlers'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'
const CLIENT_A = 'client-a'
const CLIENT_C = 'client-c' // sibling client, same tenant — the attack target's owner
const CONVO_A = 'convo-a' // belongs to tenant A / client A
const BOOKING_C = 'booking-c' // belongs to tenant A / client C

function farFutureDate(daysOut: number): string {
  return new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000).toISOString()
}

function seed() {
  fake._seed('sms_conversations', [{ id: CONVO_A, tenant_id: TENANT_A, client_id: CLIENT_A }])
  fake._seed('clients', [
    { id: CLIENT_A, tenant_id: TENANT_A, name: 'Alice A', email: 'alice@a.com', pin: '1111' },
    { id: CLIENT_C, tenant_id: TENANT_A, name: 'Carol C', email: 'carol@a.com', pin: '3333' },
  ])
  fake._seed('bookings', [
    {
      id: BOOKING_C,
      tenant_id: TENANT_A,
      client_id: CLIENT_C,
      start_time: farFutureDate(30),
      end_time: farFutureDate(30),
      recurring_type: 'weekly',
      status: 'scheduled',
      payment_status: 'unpaid',
      service_type: 'Regular cleaning',
      hourly_rate: 69,
      check_in_time: null,
      check_out_time: null,
    },
  ])
}

beforeEach(() => {
  fake._store.clear()
  seed()
})

describe('legacy Selena SMS agent — same-tenant cross-client booking IDOR', () => {
  it('cancel_booking refuses to touch a sibling client\'s booking', async () => {
    const out = JSON.parse(await handleCancelBooking(TENANT_A, { booking_id: BOOKING_C, reason: 'test' }, CONVO_A))
    expect(out.error).toBe('Booking not found')

    const { data: booking } = await fake.from('bookings').select('status').eq('id', BOOKING_C).single()
    expect((booking as { status: string }).status).toBe('scheduled') // unchanged
  })

  it('reschedule_booking refuses to touch a sibling client\'s booking', async () => {
    const out = JSON.parse(
      await handleRescheduleBooking(TENANT_A, { booking_id: BOOKING_C, new_date: '2027-01-01', new_time: '10am' }, CONVO_A)
    )
    expect(out.error).toBe('Booking not found')

    const { data: booking } = await fake.from('bookings').select('start_time').eq('id', BOOKING_C).single()
    expect((booking as { start_time: string }).start_time).not.toContain('2027-01-01')
  })

  it('booking_details refuses to leak a sibling client\'s booking via explicit booking_id', async () => {
    const out = JSON.parse(await handleBookingDetails(TENANT_A, { booking_id: BOOKING_C }, CONVO_A))
    expect(out.error).toBe('Booking not found')
  })

  it('resend_confirmation refuses to email a sibling client\'s PIN via explicit booking_id', async () => {
    const out = JSON.parse(await handleResendConfirmation(TENANT_A, { booking_id: BOOKING_C }, CONVO_A))
    expect(out.error).toBe('Booking not found')
  })
})
