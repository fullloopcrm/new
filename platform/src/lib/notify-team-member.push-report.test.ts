/**
 * notifyTeamMember()'s push leg called notify({ channel: 'push', ... }) and
 * then unconditionally set `sentPush = true` on no-throw — but notify()
 * never throws on a failed/skipped send (it catches internally and returns
 * `{ success: false }`), so DeliveryReport.push was always `true` regardless
 * of whether a push notification (or even a subscription) existed. Now that
 * notify()'s push channel is actually wired to lib/push.ts (see
 * notify.push-channel.test.ts), the report has to reflect its real result or
 * it goes back to being a silent lie the moment a member has no push
 * subscription on file.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    // quiet_start === quiet_end -> isQuietHours() is always false, so these
    // tests aren't sensitive to what wall-clock time they happen to run at.
    { id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Sam Tech', email: null, phone: null, sms_consent: true, notification_preferences: { quiet_start: '00:00', quiet_end: '00:00' } },
  ])
  sendPushToTeamMemberMock.mockClear()
})

describe('notifyTeamMember() push delivery report', () => {
  it('reports push: true when a subscription exists and the push actually sends', async () => {
    const report = await notifyTeamMember({
      tenantId: TENANT_ID,
      teamMemberId: MEMBER_ID,
      type: 'job_assignment',
      title: '🚨 Added to Emergency Team Job',
      message: 'Burst pipe today',
    })

    expect(report.push).toBe(true)
  })

  it('reports push: false, not a false positive, when the member has no push subscription on file', async () => {
    sendPushToTeamMemberMock.mockResolvedValueOnce(false)

    const report = await notifyTeamMember({
      tenantId: TENANT_ID,
      teamMemberId: MEMBER_ID,
      type: 'job_assignment',
      title: 'New Job',
      message: 'Routine job Tuesday',
    })

    // Old bug's fingerprint: this was hardcoded `true` any time notify()
    // didn't throw, even though nothing was ever delivered.
    expect(report.push).toBe(false)
  })
})
