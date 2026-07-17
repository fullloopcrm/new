/**
 * notify()'s `channel: 'push'` was declared in its own type signature but had
 * zero implementation in the send switch — every push attempt (team-member
 * job-assignment pushes for extra crew on emergency jobs, admin pushes,
 * client pushes) silently matched none of the primary-channel branches,
 * fell through the fallback (which only covers email<->sms), and landed on
 * the final `finalStatus = 'failed'` branch even though nothing was ever
 * attempted — polluting `cron/system-check`'s "Notification delivery rate"
 * health metric with false failures, and (via notify-team-member.ts's
 * `notifyTeamMember()`) silently misreporting `DeliveryReport.push = true`
 * to every caller regardless of outcome.
 *
 * Fixed by routing `channel: 'push'` through the real, already-working
 * web-push functions in lib/push.ts (the same ones cron/reminders.ts already
 * uses directly for clients), keyed off `recipientType` the same way
 * email/sms already are. A genuine "no subscription on file" now resolves to
 * `status: 'skipped'` (added to the UNROUTABLE set), not `'failed'`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { sendPushToTeamMemberMock, sendPushToClientMock, sendPushToTenantAdminsMock } = vi.hoisted(() => ({
  sendPushToTeamMemberMock: vi.fn(async (..._args: unknown[]) => true),
  sendPushToClientMock: vi.fn(async (..._args: unknown[]) => true),
  sendPushToTenantAdminsMock: vi.fn(async (..._args: unknown[]) => true),
}))
vi.mock('@/lib/push', () => ({
  sendPushToTeamMember: sendPushToTeamMemberMock,
  sendPushToClient: sendPushToClientMock,
  sendPushToTenantAdmins: sendPushToTenantAdminsMock,
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/email', () => ({ sendEmail: async () => {}, tenantSender: () => 'Test <noreply@test.com>' }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'
const MEMBER_ID = 'tm-1'
const CLIENT_ID = 'client-1'

function lastNotification() {
  const rows = fake._store.get('notifications') || []
  return rows[rows.length - 1] as { status: string; metadata?: { _error?: string } }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Acme Plumbing', resend_api_key: null, telnyx_api_key: null, telnyx_phone: null },
  ])
  fake._seed('team_members', [{ id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Sam Tech', email: null, phone: null }])
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Jo Client', email: null, phone: null }])
  sendPushToTeamMemberMock.mockClear()
  sendPushToClientMock.mockClear()
  sendPushToTenantAdminsMock.mockClear()
})

describe("notify() channel: 'push'", () => {
  it('delivers to a team member via the real push function and marks the notification sent', async () => {
    const result = await notify({
      tenantId: TENANT_ID,
      type: 'job_assignment' as never,
      title: '🚨 Added to Emergency Team Job',
      message: 'Burst pipe on Thu at 2pm',
      channel: 'push',
      recipientType: 'team_member',
      recipientId: MEMBER_ID,
    })

    expect(result.success).toBe(true)
    expect(sendPushToTeamMemberMock).toHaveBeenCalledWith(MEMBER_ID, '🚨 Added to Emergency Team Job', 'Burst pipe on Thu at 2pm')
    expect(lastNotification().status).toBe('sent')
  })

  it('marks skipped, not failed, when the team member has no push subscription on file', async () => {
    sendPushToTeamMemberMock.mockResolvedValueOnce(false)

    const result = await notify({
      tenantId: TENANT_ID,
      type: 'job_assignment' as never,
      title: 'New Job',
      message: 'Routine job Tuesday',
      channel: 'push',
      recipientType: 'team_member',
      recipientId: MEMBER_ID,
    })

    expect(result.success).toBe(false)
    // The old bug's fingerprint: this used to always be 'failed', which
    // pollutes system-check's delivery-rate health metric for a case where
    // nothing was ever actually attempted.
    expect(lastNotification().status).toBe('skipped')
  })

  it('delivers to a client via sendPushToClient', async () => {
    const result = await notify({
      tenantId: TENANT_ID,
      type: 'booking_reminder',
      title: 'Reminder',
      message: 'Your cleaning is tomorrow',
      channel: 'push',
      recipientType: 'client',
      recipientId: CLIENT_ID,
    })

    expect(result.success).toBe(true)
    expect(sendPushToClientMock).toHaveBeenCalledWith(CLIENT_ID, 'Reminder', 'Your cleaning is tomorrow')
  })

  it('delivers to tenant admins via sendPushToTenantAdmins when recipientType is admin', async () => {
    const result = await notify({
      tenantId: TENANT_ID,
      type: 'new_booking',
      title: 'New Booking',
      message: 'A new booking just landed',
      channel: 'push',
      recipientType: 'admin',
    })

    expect(result.success).toBe(true)
    expect(sendPushToTenantAdminsMock).toHaveBeenCalledWith(TENANT_ID, 'New Booking', 'A new booking just landed')
  })

  it('skips (not fails) a team-member/client push with no recipientId', async () => {
    const result = await notify({
      tenantId: TENANT_ID,
      type: 'job_assignment' as never,
      title: 'New Job',
      message: 'Routine job',
      channel: 'push',
      recipientType: 'team_member',
    })

    expect(result.success).toBe(false)
    expect(lastNotification().status).toBe('skipped')
    expect(sendPushToTeamMemberMock).not.toHaveBeenCalled()
  })
})
