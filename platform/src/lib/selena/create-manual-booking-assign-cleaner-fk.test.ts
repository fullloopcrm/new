import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleCreateManualBooking + handleAssignCleaner (Yinez engine's owner-only
 * booking tools, tools.ts) inserted/updated `bookings.client_id` /
 * `suggested_cleaner_id` / `cleaner_id` straight from the model's tool-call
 * input with NO tenant-ownership check. Anthropic doesn't enforce a tool's
 * declared input_schema on the model's actual output, so a manipulated/
 * prompt-injected owner conversation could get Yinez to emit a client_id or
 * cleaner_id belonging to ANOTHER tenant. bookings is read back tenant-scoped
 * only (e.g. GET /api/bookings embeds clients(name, phone, address) and
 * team_members(...) straight off the FK with no re-check of the embedded
 * row's own tenant_id), so a foreign id written here leaks that tenant's
 * client/cleaner PII into this tenant's own dashboard. Same FK-injection
 * class already closed on POST /api/bookings/batch (3d0bff43) and PUT
 * /api/bookings/[id]/team, missed on these two Yinez tool handlers.
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
  fake._seed('clients', [
    { id: 'client-A', tenant_id: TENANT_A, name: 'Tenant A Client', phone: '2125550001' },
    { id: 'client-B-victim', tenant_id: TENANT_B, name: 'Tenant B Victim Client', phone: '2125550002' },
  ])
  fake._seed('cleaners', [
    { id: 'cleaner-A', tenant_id: TENANT_A, name: 'Tenant A Cleaner', phone: '2125550003' },
    { id: 'cleaner-B-victim', tenant_id: TENANT_B, name: 'Tenant B Victim Cleaner', phone: '2125550004' },
  ])
})

const bookingInput = (overrides: Record<string, unknown> = {}) => ({
  client_id: 'client-A',
  date: '2026-08-01',
  time: '10am',
  service_type: 'Standard Clean',
  hourly_rate: 50,
  estimated_hours: 2,
  ...overrides,
})

describe('create_manual_booking (Yinez owner tool) — FK ownership', () => {
  it('rejects a foreign (Tenant B) client_id and inserts no booking', async () => {
    const out = await runTool(
      'create_manual_booking',
      bookingInput({ client_id: 'client-B-victim' }),
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A,
    )
    expect(JSON.parse(out).error).toBe('client not found')
    expect((fake._store.get('bookings') || []).length).toBe(0)
  })

  it('rejects a foreign (Tenant B) cleaner_id and inserts no booking', async () => {
    const out = await runTool(
      'create_manual_booking',
      bookingInput({ cleaner_id: 'cleaner-B-victim' }),
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A,
    )
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect((fake._store.get('bookings') || []).length).toBe(0)
  })

  it('CONTROL: accepts a same-tenant client_id + cleaner_id', async () => {
    const out = await runTool(
      'create_manual_booking',
      bookingInput({ cleaner_id: 'cleaner-A' }),
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A,
    )
    const parsed = JSON.parse(out)
    expect(parsed.ok).toBe(true)
    const rows = fake._store.get('bookings') || []
    expect(rows.length).toBe(1)
    expect(rows[0].client_id).toBe('client-A')
    expect(rows[0].suggested_cleaner_id).toBe('cleaner-A')
  })
})

describe('assign_cleaner_to_booking (Yinez owner tool) — FK ownership', () => {
  beforeEach(() => {
    fake._seed('bookings', [
      { id: 'booking-1', tenant_id: TENANT_A, client_id: 'client-A', cleaner_id: null, status: 'pending' },
    ])
  })

  it('rejects a foreign (Tenant B) cleaner_id and leaves the booking unassigned', async () => {
    const out = await runTool(
      'assign_cleaner_to_booking',
      { booking_id: 'booking-1', cleaner_id: 'cleaner-B-victim' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A,
    )
    expect(JSON.parse(out).error).toBe('cleaner not found')
    const booking = fake._store.get('bookings')!.find((b) => b.id === 'booking-1')!
    expect(booking.cleaner_id).toBeNull()
    expect(booking.status).toBe('pending')
  })

  it('CONTROL: accepts a same-tenant cleaner_id', async () => {
    const out = await runTool(
      'assign_cleaner_to_booking',
      { booking_id: 'booking-1', cleaner_id: 'cleaner-A' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A,
    )
    expect(JSON.parse(out).ok).toBe(true)
    const booking = fake._store.get('bookings')!.find((b) => b.id === 'booking-1')!
    expect(booking.cleaner_id).toBe('cleaner-A')
    expect(booking.status).toBe('scheduled')
  })
})
