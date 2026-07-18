import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * `notify()` (src/lib/notify.ts) is the single fan-out point every
 * lead/booking/reminder signal routes through — including cron/reminders,
 * cron/follow-up, and the 15-min-warning client SMS in
 * api/notifications/route.ts. Unlike the direct sendSMS() call sites already
 * fixed for sms_consent (89c2cdd9) and do_not_service (14fa0888), notify()
 * itself never checked either flag: it fetched a client's email/phone
 * straight off the row and dispatched. A client who'd replied STOP
 * (sms_consent=false) still got booking_reminder/follow_up/15-min-warning
 * texts through notify(), and a DNS-flagged client (do_not_service=true, the
 * stronger channel-agnostic kill-switch getClientContacts() treats as
 * absolute) still got both emails and texts. Same gap existed for
 * team_members' sms_consent. Fix nulls out email/phone before the send
 * ladder runs, so the existing "no recipient" → 'skipped' classification
 * does the rest with no new branches.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const NOTIF_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const CLIENT_ID = 'client-1'
const TEAM_MEMBER_ID = 'tm-1'

let tenantRow: Record<string, unknown>
let clientRow: Record<string, unknown>
let teamMemberRow: Record<string, unknown>

type Row = Record<string, unknown>
const reads: Array<{ table: string; eqs: Row }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        if (kind === 'insert') {
          if (table === 'notifications') return { data: { id: NOTIF_ID }, error: null }
          return { data: { id: NOTIF_ID, ...payload }, error: null }
        }
        reads.push({ table, eqs: { ...eqs } })
        if (table === 'tenants') return { data: tenantRow, error: null }
        if (table === 'clients') return { data: clientRow, error: null }
        if (table === 'team_members') return { data: teamMemberRow, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => res({ data: null, error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

const sendEmail = vi.fn(async (_args: unknown) => ({}))
const sendSMS = vi.fn(async (_args: unknown) => ({}))
vi.mock('@/lib/email', () => ({
  sendEmail: (args: unknown) => sendEmail(args as never),
  tenantSender: () => 'Canary <noreply@canary.test>',
}))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args as never) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => true }))
vi.mock('@/lib/email-templates', () => ({
  bookingReminderEmail: () => '<p>x</p>',
  bookingConfirmationEmail: () => '<p>x</p>',
  bookingReceivedEmail: () => '<p>x</p>',
  followUpEmail: () => '<p>x</p>',
  dailySummaryEmail: () => '<p>x</p>',
  dailyOpsRecapEmail: () => '<p>x</p>',
  notificationDigestEmail: () => '<p>x</p>',
  reviewRequestEmail: () => '<p>x</p>',
  paymentReceiptEmail: () => '<p>x</p>',
}))

import { notify } from '@/lib/notify'

function resetTenant() {
  tenantRow = {
    resend_api_key: 're_live_canarytestkey',
    telnyx_api_key: 'tk_live_canary',
    telnyx_phone: '+15551234567',
    name: 'Canary Cleaning',
    slug: 'canary',
    email_from: null,
    primary_color: null,
    logo_url: null,
    address: null,
  }
}

describe('notify() — client/team_member consent gating', () => {
  beforeEach(() => {
    reads.length = 0
    sendEmail.mockClear()
    sendSMS.mockClear()
    resetTenant()
    clientRow = { email: 'client@example.com', phone: '+15550001111', sms_consent: true, do_not_service: false }
    teamMemberRow = { email: 'tm@example.com', phone: '+15550002222', sms_consent: true }
  })

  it('does not text a client who replied STOP (sms_consent=false)', async () => {
    clientRow.sms_consent = false
    const res = await notify({
      tenantId: TENANT,
      type: 'booking_reminder',
      title: 'Reminder',
      message: 'Your appointment is tomorrow',
      channel: 'sms',
      recipientType: 'client',
      recipientId: CLIENT_ID,
    })
    expect(sendSMS).not.toHaveBeenCalled()
    // Falls back to email since only SMS consent was denied, not do_not_service.
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(res.success).toBe(true)
  })

  it('does not email or text a do_not_service client on either channel', async () => {
    clientRow.do_not_service = true
    const smsRes = await notify({
      tenantId: TENANT,
      type: 'booking_reminder',
      title: 'Reminder',
      message: 'Your appointment is tomorrow',
      channel: 'sms',
      recipientType: 'client',
      recipientId: CLIENT_ID,
    })
    expect(sendSMS).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(smsRes.success).toBe(false)

    const emailRes = await notify({
      tenantId: TENANT,
      type: 'follow_up',
      title: 'Thanks!',
      message: 'Thanks for booking',
      channel: 'email',
      recipientType: 'client',
      recipientId: CLIENT_ID,
    })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(sendSMS).not.toHaveBeenCalled()
    expect(emailRes.success).toBe(false)
  })

  it('still sends to a consenting, non-DNS client', async () => {
    const res = await notify({
      tenantId: TENANT,
      type: 'booking_reminder',
      title: 'Reminder',
      message: 'Your appointment is tomorrow',
      channel: 'sms',
      recipientType: 'client',
      recipientId: CLIENT_ID,
    })
    expect(sendSMS).toHaveBeenCalledTimes(1)
    const smsArg = sendSMS.mock.calls[0][0] as { to: string }
    expect(smsArg.to).toBe('+15550001111')
    expect(res.success).toBe(true)
  })

  it('does not text a team member who replied STOP (sms_consent=false)', async () => {
    teamMemberRow.sms_consent = false
    const res = await notify({
      tenantId: TENANT,
      type: 'team_confirm_request',
      title: 'Confirm your job',
      message: 'Please confirm',
      channel: 'sms',
      recipientType: 'team_member',
      recipientId: TEAM_MEMBER_ID,
    })
    expect(sendSMS).not.toHaveBeenCalled()
    // Team member's email is untouched by SMS consent — fallback still fires.
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(res.success).toBe(true)
  })

  it('still texts a consenting team member', async () => {
    const res = await notify({
      tenantId: TENANT,
      type: 'team_confirm_request',
      title: 'Confirm your job',
      message: 'Please confirm',
      channel: 'sms',
      recipientType: 'team_member',
      recipientId: TEAM_MEMBER_ID,
    })
    expect(sendSMS).toHaveBeenCalledTimes(1)
    const smsArg = sendSMS.mock.calls[0][0] as { to: string }
    expect(smsArg.to).toBe('+15550002222')
    expect(res.success).toBe(true)
  })
})
