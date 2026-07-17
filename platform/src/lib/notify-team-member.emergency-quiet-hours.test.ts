/**
 * notifyTeamMember()'s push leg was suppressed during quiet hours
 * unconditionally, with no exception for urgency — unlike the sibling
 * notify-team.ts (used by the extra-crew assignment path), whose own SMS/
 * email legs are explicitly commented "still delivered during quiet hours
 * for urgent notifications." An emergency job landing overnight (exactly
 * when a real burst-pipe/no-heat emergency is most likely) got its push
 * leg silently dropped on the one channel most likely to actually wake
 * someone up. Proves the fix: routine pushes still respect quiet hours,
 * emergency pushes (isEmergency:true) bypass the suppression.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { sendPushToTeamMemberMock } = vi.hoisted(() => ({
  sendPushToTeamMemberMock: vi.fn(async (..._args: unknown[]) => true),
}))
vi.mock('@/lib/push', () => ({
  sendPushToTeamMember: sendPushToTeamMemberMock,
  sendPushToClient: vi.fn(async () => true),
  sendPushToTenantAdmins: vi.fn(async () => true),
}))
vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/email', () => ({ sendEmail: async () => {}, tenantSender: () => 'Test <noreply@test.com>' }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { notifyTeamMember } from '@/lib/notify-team-member'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'
const MEMBER_ID = 'tm-1'

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing', resend_api_key: null, telnyx_api_key: null, telnyx_phone: null }])
  fake._seed('team_members', [
    // Default quiet hours (22:00-07:00) apply since no override is seeded.
    { id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Sam Tech', email: null, phone: null, sms_consent: true, notification_preferences: {} },
  ])
  sendPushToTeamMemberMock.mockClear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-10T02:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('notifyTeamMember() push during quiet hours', () => {
  it('suppresses a routine push at 2am (inside the default 22:00-07:00 quiet window)', async () => {
    const report = await notifyTeamMember({
      tenantId: TENANT_ID,
      teamMemberId: MEMBER_ID,
      type: 'job_rescheduled',
      title: 'Job Rescheduled',
      message: 'Client moved to tomorrow',
    })

    expect(report.push).toBe(false)
    expect(report.quietHours).toBe(true)
    expect(sendPushToTeamMemberMock).not.toHaveBeenCalled()
  })

  it('still delivers the push at 2am when isEmergency is true — quiet hours no longer swallow it', async () => {
    const report = await notifyTeamMember({
      tenantId: TENANT_ID,
      teamMemberId: MEMBER_ID,
      type: 'job_rescheduled',
      title: '🚨 Job Rescheduled — Now Urgent',
      message: 'Client moved to today — now same-day/urgent',
      isEmergency: true,
    })

    expect(report.push).toBe(true)
    expect(report.quietHours).toBe(true)
    expect(sendPushToTeamMemberMock).toHaveBeenCalledTimes(1)
  })
})
