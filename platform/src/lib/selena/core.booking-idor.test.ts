/**
 * Cross-tenant / cross-client booking IDOR — Yinez SMS agent tool handlers.
 *
 * handleRescheduleBooking / handleCancelBooking took `booking_id` straight
 * from the LLM tool-call input and derived the tenant scope from the TARGET
 * booking's own row (or defaulted to NYCMAID_TENANT_ID) instead of from the
 * authenticated conversation. A customer texting the bot could reschedule or
 * cancel ANY booking belonging to ANY tenant just by supplying that booking's
 * UUID — the read wasn't even tenant-filtered, let alone client-filtered.
 *
 * handleResendConfirmation / handleBookingDetails had a narrower version of
 * the same bug: tenant-scoped but not client-scoped, so a customer could pull
 * another client's PIN/email/GPS check-in-out/payment history within the
 * same tenant by guessing/knowing their booking UUID.
 *
 * Fix: every explicit booking_id lookup now derives tenant_id AND client_id
 * from the conversation row (sms_conversations.tenant_id / .client_id), not
 * from the target booking or from LLM input.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (c: string) => c }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: vi.fn() }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase'
import { handleTool, EMPTY_CHECKLIST, type YinezResult } from './core'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const CLIENT_A = 'client-a'
const CLIENT_B = 'client-b'
const CLIENT_C = 'client-c'
const CONVO_A = 'convo-a' // belongs to tenant A / client A
const BOOKING_B = 'booking-b' // belongs to tenant B / client B — the cross-tenant attack target
const BOOKING_C = 'booking-c' // belongs to tenant A / client C — the same-tenant attack target

function farFutureDate(daysOut: number): string {
  return new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000).toISOString()
}

function seed() {
  fake._seed('sms_conversations', [
    { id: CONVO_A, tenant_id: TENANT_A, client_id: CLIENT_A },
  ])
  fake._seed('clients', [
    { id: CLIENT_A, tenant_id: TENANT_A, name: 'Alice A', email: 'alice@a.com', pin: '1111' },
    { id: CLIENT_B, tenant_id: TENANT_B, name: 'Bob B', email: 'bob@b.com', pin: '2222' },
    { id: CLIENT_C, tenant_id: TENANT_A, name: 'Carol C', email: 'carol@a.com', pin: '3333' },
  ])
  fake._seed('bookings', [
    {
      id: BOOKING_B,
      tenant_id: TENANT_B,
      client_id: CLIENT_B,
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

function dummyResult(): YinezResult {
  return { text: '', checklist: EMPTY_CHECKLIST }
}

beforeEach(() => {
  fake._store.clear()
  seed()
})

describe('Yinez SMS agent — cross-tenant/cross-client booking IDOR', () => {
  it('cancel_booking refuses to touch a booking outside the conversation client/tenant', async () => {
    const out = JSON.parse(
      await handleTool('cancel_booking', { booking_id: BOOKING_B, reason: 'test' }, CONVO_A, dummyResult())
    )
    expect(out.error).toBe('Booking not found')

    const { data: booking } = await fake.from('bookings').select('status').eq('id', BOOKING_B).single()
    expect((booking as { status: string }).status).toBe('scheduled') // unchanged
  })

  it('reschedule_booking refuses to touch a booking outside the conversation client/tenant', async () => {
    const out = JSON.parse(
      await handleTool(
        'reschedule_booking',
        { booking_id: BOOKING_B, new_date: '2027-01-01', new_time: '10am' },
        CONVO_A,
        dummyResult()
      )
    )
    expect(out.error).toBe('Booking not found')

    const { data: booking } = await fake.from('bookings').select('start_time').eq('id', BOOKING_B).single()
    expect((booking as { start_time: string }).start_time).not.toContain('2027-01-01')
  })

  it('booking_details refuses to leak another client\'s booking via explicit booking_id (cross-tenant)', async () => {
    const out = JSON.parse(
      await handleTool('booking_details', { booking_id: BOOKING_B }, CONVO_A, dummyResult())
    )
    expect(out.error).toBe('Booking not found')
  })

  it('resend_confirmation refuses to email another client\'s PIN via explicit booking_id (cross-tenant)', async () => {
    const out = JSON.parse(
      await handleTool('resend_confirmation', { booking_id: BOOKING_B }, CONVO_A, dummyResult())
    )
    expect(out.error).toBe('Booking not found')
  })

  it('booking_details refuses to leak a same-tenant sibling client\'s booking via explicit booking_id', async () => {
    const out = JSON.parse(
      await handleTool('booking_details', { booking_id: BOOKING_C }, CONVO_A, dummyResult())
    )
    // Distinct from the cross-tenant "not found" case above: the booking DOES
    // exist (same tenant), it just doesn't belong to this conversation's client.
    expect(out.error).toBe('not_your_booking')
  })

  it('resend_confirmation refuses to email a same-tenant sibling client\'s PIN via explicit booking_id', async () => {
    const out = JSON.parse(
      await handleTool('resend_confirmation', { booking_id: BOOKING_C }, CONVO_A, dummyResult())
    )
    expect(out.error).toBe('not_your_booking')
  })
})
