import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Kill switch (Settings -> Calendar -> "Pause automated recurring writes")
 * for Yinez's pause_recurring / resume_recurring / cancel_recurring tools.
 * When on, every one of these refuses before any mutation runs -- flipping
 * it back off takes effect immediately since getSettings() is read live,
 * no deploy needed.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: async () => true }))
vi.mock('@/lib/selena/core', () => ({ handleTool: vi.fn(async () => ''), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_ID) }))

let paused = false
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ recurring_writes_paused: paused }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './tools'

const TENANT_ID = 'tenant-1'
const SCHEDULE_ID = 'sched-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function stubResult() {
  return { text: '', checklist: {} } as unknown as Parameters<typeof runTool>[4]
}

beforeEach(() => {
  paused = false
  fake._store.clear()
  fake._seed('recurring_schedules', [
    { id: SCHEDULE_ID, tenant_id: TENANT_ID, status: 'active', paused_until: null },
  ])
})

describe('Yinez recurring-write kill switch', () => {
  it('pause_recurring: refuses and does not mutate when the switch is on', async () => {
    paused = true
    const out = await runTool('pause_recurring', { schedule_id: SCHEDULE_ID, until_date: '2026-12-01' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(out).error).toBe('recurring_writes_paused')
    const schedule = fake._all('recurring_schedules').find((r) => r.id === SCHEDULE_ID)!
    expect(schedule.status).toBe('active') // unchanged
  })

  it('resume_recurring: refuses and does not mutate when the switch is on', async () => {
    paused = true
    const out = await runTool('resume_recurring', { schedule_id: SCHEDULE_ID }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(out).error).toBe('recurring_writes_paused')
  })

  it('cancel_recurring: refuses and does not mutate when the switch is on', async () => {
    paused = true
    const out = await runTool('cancel_recurring', { schedule_id: SCHEDULE_ID, reason: 'test' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(out).error).toBe('recurring_writes_paused')
    const schedule = fake._all('recurring_schedules').find((r) => r.id === SCHEDULE_ID)!
    expect(schedule.status).toBe('active') // unchanged
  })

  it('CONTROL: pause_recurring works normally when the switch is off', async () => {
    paused = false
    const out = await runTool('pause_recurring', { schedule_id: SCHEDULE_ID, until_date: '2026-12-01' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(out).ok).toBe(true)
    const schedule = fake._all('recurring_schedules').find((r) => r.id === SCHEDULE_ID)!
    expect(schedule.status).toBe('paused')
  })

  it('CONTROL: cancel_recurring works normally when the switch is off', async () => {
    paused = false
    const out = await runTool('cancel_recurring', { schedule_id: SCHEDULE_ID, reason: 'test' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(out).ok).toBe(true)
    const schedule = fake._all('recurring_schedules').find((r) => r.id === SCHEDULE_ID)!
    expect(schedule.status).toBe('cancelled')
  })
})
