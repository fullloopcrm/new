import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

/**
 * handleManageRecurring (the `manage_recurring` SMS tool) used to flip
 * recurring_schedules.status to 'paused'/'cancelled' and tell the client via
 * Selena's reply that it worked, but never touched the `bookings` table.
 * Every already-generated future booking on the series survived untouched —
 * the cleaner still showed up (and the client could still get billed)
 * despite being told the schedule was paused or cancelled. The two API
 * routes that do the same thing (/api/schedules/[id]/pause,
 * admin/recurring-schedules/[id] DELETE) always cancel the in-window/future
 * bookings alongside the schedule status flip; this locks that same
 * behavior into the SMS path.
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
const CLIENT = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const SCHEDULE = 'ssssssss-ssss-ssss-ssss-ssssssssssss'
const coreResult = (): YinezResult => ({ text: '', checklist: EMPTY_CHECKLIST })

function seedConvoAndSchedule() {
  fake._seed('sms_conversations', [{ id: 'convo-1', client_id: CLIENT, tenant_id: TENANT }])
  fake._seed('recurring_schedules', [{ id: SCHEDULE, tenant_id: TENANT, client_id: CLIENT, status: 'active', paused_until: null }])
}

beforeEach(() => {
  fake = createFakeSupabase()
  notifyMock.calls = []
  seedConvoAndSchedule()
})

describe('manage_recurring — pause cancels in-window bookings', () => {
  it('cancels scheduled/pending/confirmed bookings inside [now, pause_until], leaves later ones alone', async () => {
    const past = new Date(Date.now() - 864e5).toISOString() // yesterday — must stay untouched
    const soon = new Date(Date.now() + 2 * 864e5).toISOString() // inside window
    const later = new Date(Date.now() + 60 * 864e5).toISOString() // outside window
    fake._seed('bookings', [
      { id: 'bk-past', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'scheduled', start_time: past },
      { id: 'bk-scheduled', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'scheduled', start_time: soon },
      { id: 'bk-pending', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'pending', start_time: soon },
      { id: 'bk-confirmed', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'confirmed', start_time: soon },
      { id: 'bk-already-cancelled', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'cancelled', start_time: soon },
      { id: 'bk-later', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'scheduled', start_time: later },
    ])

    const pauseUntil = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10)
    const out = await handleTool('manage_recurring', { action: 'pause', schedule_id: SCHEDULE, pause_until: pauseUntil }, 'convo-1', coreResult())
    const parsed = JSON.parse(out)

    expect(parsed.success).toBe(true)
    expect(parsed.message).toContain('3 upcoming visits cancelled')

    const statuses = Object.fromEntries(fake._all('bookings').map((b) => [b.id, b.status]))
    expect(statuses['bk-scheduled']).toBe('cancelled')
    expect(statuses['bk-pending']).toBe('cancelled')
    expect(statuses['bk-confirmed']).toBe('cancelled')
    // Out-of-window / already-terminal rows must NOT be touched.
    expect(statuses['bk-past']).toBe('scheduled')
    expect(statuses['bk-later']).toBe('scheduled')
    expect(statuses['bk-already-cancelled']).toBe('cancelled')

    const schedule = fake._all('recurring_schedules').find((s) => s.id === SCHEDULE)
    expect(schedule?.status).toBe('paused')

    expect(notifyMock.calls).toHaveLength(1)
    expect(notifyMock.calls[0].message).toContain('3 upcoming visit')
  })

  it('cancels ALL future bookings when pause_until is omitted (indefinite pause)', async () => {
    const soon = new Date(Date.now() + 2 * 864e5).toISOString()
    const farOut = new Date(Date.now() + 400 * 864e5).toISOString()
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'scheduled', start_time: soon },
      { id: 'bk-2', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'scheduled', start_time: farOut },
    ])

    const out = await handleTool('manage_recurring', { action: 'pause', schedule_id: SCHEDULE }, 'convo-1', coreResult())
    expect(JSON.parse(out).success).toBe(true)

    const statuses = Object.fromEntries(fake._all('bookings').map((b) => [b.id, b.status]))
    expect(statuses['bk-1']).toBe('cancelled')
    expect(statuses['bk-2']).toBe('cancelled')
  })

  it('does not touch another tenant/schedule\'s bookings', async () => {
    const soon = new Date(Date.now() + 2 * 864e5).toISOString()
    fake._seed('bookings', [
      { id: 'bk-other-schedule', tenant_id: TENANT, schedule_id: 'other-schedule', status: 'scheduled', start_time: soon },
      { id: 'bk-other-tenant', tenant_id: 'other-tenant', schedule_id: SCHEDULE, status: 'scheduled', start_time: soon },
    ])
    await handleTool('manage_recurring', { action: 'pause', schedule_id: SCHEDULE }, 'convo-1', coreResult())
    const statuses = Object.fromEntries(fake._all('bookings').map((b) => [b.id, b.status]))
    expect(statuses['bk-other-schedule']).toBe('scheduled')
    expect(statuses['bk-other-tenant']).toBe('scheduled')
  })
})

describe('manage_recurring — cancel cancels all future bookings', () => {
  it('cancels every scheduled/pending/confirmed future booking on the series', async () => {
    const soon = new Date(Date.now() + 2 * 864e5).toISOString()
    const farOut = new Date(Date.now() + 400 * 864e5).toISOString()
    const past = new Date(Date.now() - 864e5).toISOString()
    fake._seed('bookings', [
      { id: 'bk-soon', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'scheduled', start_time: soon },
      { id: 'bk-far', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'confirmed', start_time: farOut },
      { id: 'bk-past', tenant_id: TENANT, schedule_id: SCHEDULE, status: 'scheduled', start_time: past },
    ])

    const out = await handleTool('manage_recurring', { action: 'cancel', schedule_id: SCHEDULE }, 'convo-1', coreResult())
    const parsed = JSON.parse(out)
    expect(parsed.success).toBe(true)
    expect(parsed.message).toContain('2 upcoming visits cancelled')

    const statuses = Object.fromEntries(fake._all('bookings').map((b) => [b.id, b.status]))
    expect(statuses['bk-soon']).toBe('cancelled')
    expect(statuses['bk-far']).toBe('cancelled')
    expect(statuses['bk-past']).toBe('scheduled') // past visit, not this series' problem

    const schedule = fake._all('recurring_schedules').find((s) => s.id === SCHEDULE)
    expect(schedule?.status).toBe('cancelled')

    expect(notifyMock.calls).toHaveLength(1)
    expect(notifyMock.calls[0].message).toContain('2 upcoming visit')
  })
})

describe('manage_recurring — resume', () => {
  it('reactivates the schedule without touching bookings', async () => {
    fake._seed('bookings', [])
    const out = await handleTool('manage_recurring', { action: 'resume', schedule_id: SCHEDULE }, 'convo-1', coreResult())
    expect(JSON.parse(out).success).toBe(true)
    const schedule = fake._all('recurring_schedules').find((s) => s.id === SCHEDULE)
    expect(schedule?.status).toBe('active')
    expect(schedule?.paused_until).toBeNull()
  })
})
