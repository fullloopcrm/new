import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * pause_recurring / resume_recurring (Selena/Yinez owner tools, tools.ts) —
 * silently skipped the booking-window cancellation the human-admin route
 * (.../recurring-schedules/[id]/pause POST) already performs.
 *
 * The admin route pauses a schedule AND cancels any already-materialized
 * booking that falls inside the pause window -- necessary because
 * cron/generate-recurring keeps a schedule's next ~4 weeks pre-generated, so
 * "pause" has to retroactively cancel visits that were booked before the
 * pause request. handlePauseRecurring only ever flipped the schedule's own
 * status/paused_until; every already-scheduled visit inside the window stayed
 * 'scheduled' and a cleaner would still show up, contradicting a client's
 * pause request made through this exact tool. handleResumeRecurring had the
 * mirror-image gap: no restoration of bookings a (once-fixed) pause would
 * have cancelled.
 *
 * Fix: mirror the admin route's cancel-on-pause / restore-on-resume behavior
 * inline, scoped to bookings.tenant_id + schedule_id.
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
    // Inside the pause window (until 2026-09-15) -- must be cancelled.
    { id: 'book-in-window', tenant_id: TENANT_A, schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-09-01T09:00:00', cancelled_reason: null },
    // Also inside the window but a different tenant's row sharing the same schedule id string coincidentally -- must stay untouched.
    { id: 'book-other-tenant', tenant_id: TENANT_B, schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-09-01T09:00:00', cancelled_reason: null },
    // After the pause window -- must stay scheduled.
    { id: 'book-after-window', tenant_id: TENANT_A, schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-10-01T09:00:00', cancelled_reason: null },
  ])
})

describe('pause_recurring (Yinez owner tool) — cancels bookings inside the pause window', () => {
  it('cancels the in-window booking and marks the schedule paused', async () => {
    const out = await runTool(
      'pause_recurring',
      { schedule_id: 'sched-A1', until_date: '2026-09-15' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    const parsed = JSON.parse(out)
    expect(parsed.ok).toBe(true)
    expect(parsed.bookings_cancelled).toBe(1)

    const inWindow = fake._store.get('bookings')!.find((b) => b.id === 'book-in-window')!
    expect(inWindow.status).toBe('cancelled')
    expect(inWindow.cancelled_reason).toBe('schedule_paused')

    const sched = fake._store.get('recurring_schedules')!.find((s) => s.id === 'sched-A1')!
    expect(sched.status).toBe('paused')
  })

  it('leaves the after-window booking scheduled', async () => {
    await runTool(
      'pause_recurring',
      { schedule_id: 'sched-A1', until_date: '2026-09-15' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    const afterWindow = fake._store.get('bookings')!.find((b) => b.id === 'book-after-window')!
    expect(afterWindow.status).toBe('scheduled')
  })

  it('never touches another tenant\'s booking even if it shares the schedule id string', async () => {
    await runTool(
      'pause_recurring',
      { schedule_id: 'sched-A1', until_date: '2026-09-15' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    const otherTenant = fake._store.get('bookings')!.find((b) => b.id === 'book-other-tenant')!
    expect(otherTenant.status).toBe('scheduled')
  })
})

describe('resume_recurring (Yinez owner tool) — restores bookings the matching pause cancelled', () => {
  it('restores an in-window booking this handler previously cancelled via pause', async () => {
    await runTool(
      'pause_recurring',
      { schedule_id: 'sched-A1', until_date: '2026-09-15' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    const out = await runTool(
      'resume_recurring',
      { schedule_id: 'sched-A1' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    const parsed = JSON.parse(out)
    expect(parsed.ok).toBe(true)
    expect(parsed.bookings_restored).toBe(1)

    const restored = fake._store.get('bookings')!.find((b) => b.id === 'book-in-window')!
    expect(restored.status).toBe('scheduled')
    expect(restored.cancelled_reason).toBeNull()
  })
})
