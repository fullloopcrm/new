import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

/**
 * handleManageRecurring (the `manage_recurring` SMS tool) trusted a
 * caller-supplied `schedule_id` for pause/resume/cancel without checking it
 * belonged to the client on the current conversation — only that it belonged
 * to the right TENANT. Any client could pause/resume/cancel ANOTHER client's
 * recurring schedule (and cascade-cancel their upcoming bookings) in the
 * same tenant just by supplying that schedule's id. reschedule_booking and
 * cancel_booking already enforce this exact same-tenant-different-client
 * boundary; manage_recurring did not.
 */

let fake: FakeSupabase

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => fake.from(table) }),
}))

const notifyMock = vi.hoisted(() => ({ calls: [] as Array<{ type: string; title: string; message: string }> }))
vi.mock('@/lib/nycmaid/notify', () => ({
  notify: async (opts: { type: string; title: string; message: string }) => { notifyMock.calls.push(opts) },
}))

import { handleTool, EMPTY_CHECKLIST, type YinezResult } from '@/lib/selena/core'

const TENANT = 'tttttttt-tttt-tttt-tttt-tttttttttttt'
const CALLER_CLIENT = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const VICTIM_CLIENT = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const VICTIM_SCHEDULE = 'ssssssss-ssss-ssss-ssss-ssssssssssss'
const coreResult = (): YinezResult => ({ text: '', checklist: EMPTY_CHECKLIST })

beforeEach(() => {
  fake = createFakeSupabase()
  notifyMock.calls = []
  fake._seed('sms_conversations', [{ id: 'convo-1', client_id: CALLER_CLIENT, tenant_id: TENANT }])
  fake._seed('recurring_schedules', [
    { id: VICTIM_SCHEDULE, tenant_id: TENANT, client_id: VICTIM_CLIENT, status: 'active', paused_until: null },
  ])
})

describe('manage_recurring — client-ownership on a caller-supplied schedule_id', () => {
  it('refuses to pause a schedule belonging to a different client in the same tenant', async () => {
    const soon = new Date(Date.now() + 2 * 864e5).toISOString()
    fake._seed('bookings', [
      { id: 'bk-victim', tenant_id: TENANT, schedule_id: VICTIM_SCHEDULE, status: 'scheduled', start_time: soon },
    ])

    const out = await handleTool('manage_recurring', { action: 'pause', schedule_id: VICTIM_SCHEDULE }, 'convo-1', coreResult())
    const parsed = JSON.parse(out)

    expect(parsed.error).toBe('not_your_schedule')

    const schedule = fake._all('recurring_schedules').find((s) => s.id === VICTIM_SCHEDULE)
    expect(schedule?.status).toBe('active') // untouched

    const statuses = Object.fromEntries(fake._all('bookings').map((b) => [b.id, b.status]))
    expect(statuses['bk-victim']).toBe('scheduled') // untouched — no cascade cancel

    expect(notifyMock.calls).toHaveLength(0)
  })

  it('refuses to cancel a schedule belonging to a different client in the same tenant', async () => {
    const out = await handleTool('manage_recurring', { action: 'cancel', schedule_id: VICTIM_SCHEDULE }, 'convo-1', coreResult())
    expect(JSON.parse(out).error).toBe('not_your_schedule')
    const schedule = fake._all('recurring_schedules').find((s) => s.id === VICTIM_SCHEDULE)
    expect(schedule?.status).toBe('active')
  })

  it('refuses to resume a schedule belonging to a different client in the same tenant', async () => {
    fake._seed('recurring_schedules', [
      { id: VICTIM_SCHEDULE, tenant_id: TENANT, client_id: VICTIM_CLIENT, status: 'paused', paused_until: null },
    ])
    const out = await handleTool('manage_recurring', { action: 'resume', schedule_id: VICTIM_SCHEDULE }, 'convo-1', coreResult())
    expect(JSON.parse(out).error).toBe('not_your_schedule')
  })

  it('still allows the caller to act on their OWN explicitly-supplied schedule_id', async () => {
    const ownSchedule = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    fake._seed('recurring_schedules', [
      { id: ownSchedule, tenant_id: TENANT, client_id: CALLER_CLIENT, status: 'active', paused_until: null },
    ])
    const out = await handleTool('manage_recurring', { action: 'pause', schedule_id: ownSchedule }, 'convo-1', coreResult())
    expect(JSON.parse(out).success).toBe(true)
    const schedule = fake._all('recurring_schedules').find((s) => s.id === ownSchedule)
    expect(schedule?.status).toBe('paused')
  })
})
