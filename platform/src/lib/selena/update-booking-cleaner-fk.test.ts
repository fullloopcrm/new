import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleUpdateBooking (Yinez engine's owner-only update_booking tool,
 * tools.ts) whitelists `cleaner_id` as a mutable field but wrote it straight
 * from the model's tool-call input with NO tenant-ownership check -- the
 * same FK-injection class already closed on handleCreateManualBooking and
 * handleAssignCleaner in this same file (see
 * create-manual-booking-assign-cleaner-fk.test.ts), just missed on this
 * sibling handler. A manipulated/prompt-injected owner conversation could
 * attach another tenant's cleaner id to a booking; the dashboard/AI then
 * joins and displays that cleaner's name/phone/rate straight off the FK
 * with no re-check of the embedded row's own tenant_id.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn() }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import type { YinezResult } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const OWNER_PHONE = '3105559999'

const emptyResult = (): YinezResult => ({ text: '', toolsCalled: [] })

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_A, owner_phone: OWNER_PHONE },
    { id: TENANT_B, owner_phone: '4155558888' },
  ])
  fake._seed('team_members', [
    { id: 'cleaner-A', tenant_id: TENANT_A, name: 'Tenant A Cleaner', phone: '2125550003' },
    { id: 'cleaner-B-victim', tenant_id: TENANT_B, name: 'Tenant B Victim Cleaner', phone: '2125550004' },
  ])
  fake._seed('bookings', [
    { id: 'booking-1', tenant_id: TENANT_A, client_id: 'client-A', team_member_id: null, status: 'pending', notes: null },
  ])
})

describe('update_booking (Yinez owner tool) — cleaner_id FK ownership', () => {
  it('rejects a foreign (Tenant B) cleaner_id and leaves the booking untouched', async () => {
    const out = await runTool(
      'update_booking',
      { booking_id: 'booking-1', fields: { cleaner_id: 'cleaner-B-victim', status: 'scheduled' } },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).error).toBe('cleaner not found')
    const booking = fake._store.get('bookings')!.find((b) => b.id === 'booking-1')!
    expect(booking.team_member_id).toBeNull()
    expect(booking.status).toBe('pending')
  })

  it('CONTROL: accepts a same-tenant cleaner_id', async () => {
    const out = await runTool(
      'update_booking',
      { booking_id: 'booking-1', fields: { cleaner_id: 'cleaner-A', status: 'scheduled' } },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).ok).toBe(true)
    const booking = fake._store.get('bookings')!.find((b) => b.id === 'booking-1')!
    expect(booking.team_member_id).toBe('cleaner-A')
    expect(booking.status).toBe('scheduled')
  })

  it('CONTROL: still allows updating non-cleaner_id fields', async () => {
    const out = await runTool(
      'update_booking',
      { booking_id: 'booking-1', fields: { notes: 'client requested reschedule' } },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).ok).toBe(true)
    const booking = fake._store.get('bookings')!.find((b) => b.id === 'booking-1')!
    expect(booking.notes).toBe('client requested reschedule')
  })
})
