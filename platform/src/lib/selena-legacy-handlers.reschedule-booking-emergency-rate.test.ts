/**
 * Legacy Selena SMS agent (non-NYCMAID tenants) handleRescheduleBooking —
 * fresh-ground twin of selena-legacy.ts's handleCreateBooking P11.16/17 fix
 * and PUT /api/client/reschedule/[id]'s becomesEmergency (item 11, same
 * session). A client moving an existing booking into today via the AI bot
 * never touched is_emergency/hourly_rate/price, silently skipping the
 * tenant's configured emergency rate. Fixed to read selena_config off the
 * same `tenants(...)` join already used for reschedule_notice_days.
 */
import { describe, it, expect, vi } from 'vitest'
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
import { handleRescheduleBooking } from './selena-legacy-handlers'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-1'
const CLIENT = 'client-1'
const CONVO = 'convo-1'
const BOOKING = 'booking-1'

const TODAY = new Date().toLocaleDateString('en-CA')

function farFutureIso(daysOut: number): string {
  return new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000).toISOString()
}

function seed(selenaConfig?: { emergency_available?: boolean; emergency_rate?: number }) {
  fake._store.clear()
  fake._seed('sms_conversations', [{ id: CONVO, tenant_id: TENANT, client_id: CLIENT }])
  fake._seed('bookings', [{
    id: BOOKING, tenant_id: TENANT, client_id: CLIENT,
    start_time: farFutureIso(30), recurring_type: 'weekly',
    hourly_rate: 69, price: 69 * 2 * 100, is_emergency: false,
    // The fake ignores column projection and returns whatever the row has —
    // embedding `tenants` here stands in for the real `tenants(...)` join.
    tenants: { reschedule_notice_days: 2, selena_config: selenaConfig },
  }])
}

describe('legacy Selena handleRescheduleBooking — same-day landing applies configured emergency rate', () => {
  it('rescheduling to today sets is_emergency + the tenant emergency_rate when configured', async () => {
    seed({ emergency_available: true, emergency_rate: 95 })
    const out = JSON.parse(await handleRescheduleBooking(TENANT, { booking_id: BOOKING, new_date: TODAY, new_time: '2:00 PM' }, CONVO))
    expect(out.success).toBe(true)

    const booking = fake._store.get('bookings')?.find((b) => b.id === BOOKING)
    expect(booking?.is_emergency).toBe(true)
    expect(booking?.hourly_rate).toBe(95)
    expect(booking?.price).toBe(95 * 2 * 100)
  })

  it('rescheduling to today still flags is_emergency when the tenant has no emergency rate configured, but leaves the rate untouched', async () => {
    seed(undefined)
    const out = JSON.parse(await handleRescheduleBooking(TENANT, { booking_id: BOOKING, new_date: TODAY, new_time: '2:00 PM' }, CONVO))
    expect(out.success).toBe(true)

    const booking = fake._store.get('bookings')?.find((b) => b.id === BOOKING)
    expect(booking?.is_emergency).toBe(true)
    expect(booking?.hourly_rate).toBe(69) // unchanged — no configured emergency rate to apply
  })

  it('rescheduling to a far-future date keeps is_emergency false and the routine rate', async () => {
    seed({ emergency_available: true, emergency_rate: 95 })
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
    const out = JSON.parse(await handleRescheduleBooking(TENANT, { booking_id: BOOKING, new_date: futureDate, new_time: '2:00 PM' }, CONVO))
    expect(out.success).toBe(true)

    const booking = fake._store.get('bookings')?.find((b) => b.id === BOOKING)
    expect(booking?.is_emergency).toBe(false)
    expect(booking?.hourly_rate).toBe(69)
  })
})
