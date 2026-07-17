import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cancel_recurring (Selena/Yinez owner tool, tools.ts) — same gap this
 * session already fixed for pause_recurring/resume_recurring, this time on
 * the cancel tool: it only ever flipped recurring_schedules.status to
 * 'cancelled' and skipped the booking cancellation the human-admin route
 * (DELETE .../recurring-schedules/[id]) already performs.
 *
 * cron/generate-recurring keeps a schedule's next ~4 weeks pre-generated, so
 * "cancel" has to retroactively cancel those already-materialized visits too
 * -- flipping the rule alone stops FUTURE generation but leaves every
 * already-booked visit 'scheduled', so a cleaner would still show up for a
 * series the client asked (via this exact tool) to cancel entirely.
 *
 * Fix: mirror the admin route's cancel-future-bookings behavior inline,
 * scoped to bookings.tenant_id + schedule_id, same as pause/resume.
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
  fake._seed('recurring_schedules', [
    { id: 'sched-A1', tenant_id: TENANT_A, status: 'active', paused_until: null },
  ])
  fake._seed('bookings', [
    // Already materialized future visit -- must be cancelled.
    { id: 'book-future', tenant_id: TENANT_A, schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-09-01T09:00:00' },
    // Different tenant's row sharing the same schedule id string -- must stay untouched.
    { id: 'book-other-tenant', tenant_id: TENANT_B, schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-09-01T09:00:00' },
    // Already-completed history -- must never be touched by a cancel.
    { id: 'book-completed', tenant_id: TENANT_A, schedule_id: 'sched-A1', status: 'completed', start_time: '2026-06-01T09:00:00' },
  ])
})

describe('cancel_recurring (Yinez owner tool) — cancels already-materialized future bookings', () => {
  it('cancels the future booking and marks the schedule cancelled', async () => {
    const out = await runTool(
      'cancel_recurring',
      { schedule_id: 'sched-A1', reason: 'client requested' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    const parsed = JSON.parse(out)
    expect(parsed.ok).toBe(true)
    expect(parsed.bookings_cancelled).toBe(1)

    const future = fake._store.get('bookings')!.find((b) => b.id === 'book-future')!
    expect(future.status).toBe('cancelled')

    const sched = fake._store.get('recurring_schedules')!.find((s) => s.id === 'sched-A1')!
    expect(sched.status).toBe('cancelled')
  })

  it('never touches completed booking history', async () => {
    await runTool(
      'cancel_recurring',
      { schedule_id: 'sched-A1' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    const completed = fake._store.get('bookings')!.find((b) => b.id === 'book-completed')!
    expect(completed.status).toBe('completed')
  })

  it("never touches another tenant's booking even if it shares the schedule id string", async () => {
    await runTool(
      'cancel_recurring',
      { schedule_id: 'sched-A1' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    const otherTenant = fake._store.get('bookings')!.find((b) => b.id === 'book-other-tenant')!
    expect(otherTenant.status).toBe('scheduled')
  })
})
