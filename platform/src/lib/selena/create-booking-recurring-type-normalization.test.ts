import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleCreateBooking (core.ts) previously defaulted recurring_type to null
 * only when the model OMITTED the field (`input.recurring_type || null`).
 * agent.ts's own create_booking tool description told the model to pass the
 * literal string 'one_time' for a non-recurring booking -- Anthropic doesn't
 * enforce a tool's declared values on the model's actual output, so a model
 * that followed its own tool description re-wrote the exact 'one_time'
 * sentinel already fixed once (7da18e9b), reintroducing the recurring
 * cancellation-policy mismatch in confirmation texts. Same description also
 * offered bare 'monthly' as an example cadence -- RecurringType has no bare
 * 'monthly', only monthly_date/monthly_weekday, so an explicit 'monthly'
 * input rendered raw ("Schedule: monthly") in formatRecurringLabel's
 * fallback instead of "Schedule: Monthly".
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { handleTool } from '@/lib/selena/core'
import type { YinezResult } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'

const emptyResult = (): YinezResult => ({ text: '', toolsCalled: [] })

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT_A, owner_phone: '3105559999' }])
  fake._seed('clients', [{ id: 'client-A', tenant_id: TENANT_A, name: 'Client A', phone: '2125550001' }])
  fake._seed('sms_conversations', [
    { id: 'convo-1', tenant_id: TENANT_A, client_id: 'client-A', phone: '2125550001' },
  ])
})

const bookingInput = (overrides: Record<string, unknown> = {}) => ({
  date: '2026-08-01',
  time: '10am',
  service_type: 'Standard Clean',
  hourly_rate: 50,
  estimated_hours: 2,
  ...overrides,
})

describe('create_booking (Yinez client tool) — recurring_type normalization', () => {
  it('stores null, not the literal string, when the model sends recurring_type: "one_time"', async () => {
    const out = await handleTool('create_booking', bookingInput({ recurring_type: 'one_time' }), 'convo-1', emptyResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    const rows = fake._store.get('bookings') || []
    expect(rows.length).toBe(1)
    expect(rows[0].recurring_type).toBeNull()
  })

  it('normalizes bare "monthly" to monthly_date, not the raw string', async () => {
    const out = await handleTool('create_booking', bookingInput({ recurring_type: 'monthly' }), 'convo-1', emptyResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    const rows = fake._store.get('bookings') || []
    expect(rows.length).toBe(1)
    expect(rows[0].recurring_type).toBe('monthly_date')
  })

  it('CONTROL: a real cadence (weekly) passes through unchanged', async () => {
    const out = await handleTool('create_booking', bookingInput({ recurring_type: 'weekly' }), 'convo-1', emptyResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    const rows = fake._store.get('bookings') || []
    expect(rows[0].recurring_type).toBe('weekly')
  })

  it('CONTROL: omitting recurring_type still defaults to null', async () => {
    const out = await handleTool('create_booking', bookingInput(), 'convo-1', emptyResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    const rows = fake._store.get('bookings') || []
    expect(rows[0].recurring_type).toBeNull()
  })
})
