import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * lib/notify.ts's SMS send path previously read tenant.telnyx_phone directly
 * with no fallback — same resolver-precedence gap fixed via
 * sms-credentials.ts's resolveTenantSmsCredentials() (telnyx_phone ||
 * sms_number, matching the precedence lib/jefe/actions.ts already applied).
 * A tenant with only the legacy sms_number column populated silently looked
 * "SMS not configured" here even though jefe/actions.ts could already text
 * that same tenant's owner.
 */

type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }
let insertCalls: Array<{ table: string; row: Record<string, unknown> }>

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => resolve(table, eqs),
    update: () => chain,
    insert: (row: Record<string, unknown>) => {
      insertCalls.push({ table, row })
      return chain
    },
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const sendEmail = vi.fn(async (_args: unknown) => {})
const sendSMS = vi.fn(async (_args: unknown) => {})
vi.mock('./email', () => ({
  sendEmail: (args: unknown) => sendEmail(args),
  tenantSender: () => 'test@example.com',
}))
vi.mock('./sms', () => ({
  sendSMS: (args: unknown) => sendSMS(args),
}))
vi.mock('./comms-prefs', () => ({
  isCommEnabled: async () => true,
}))
vi.mock('./comms-registry', () => ({
  NOTIFY_COMM_MAP: {},
}))
vi.mock('./email-templates', () => ({
  bookingReminderEmail: () => '',
  bookingConfirmationEmail: () => '',
  bookingReceivedEmail: () => '',
  followUpEmail: () => '',
  dailySummaryEmail: () => '',
  dailyOpsRecapEmail: () => '',
  notificationDigestEmail: () => '',
  reviewRequestEmail: () => '',
  paymentReceiptEmail: () => '',
}))

import { notify } from './notify'

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

describe('notify() SMS — telnyx_phone/sms_number fallback precedence', () => {
  beforeEach(() => {
    insertCalls = []
    sendEmail.mockClear()
    sendSMS.mockClear()
    // These tests probe tenant-column precedence specifically — clear the
    // platform TELNYX_API_KEY/TELNYX_PHONE fallback (sms-credentials.ts) so
    // results stay deterministic regardless of the ambient shell/CI env.
    vi.stubEnv('TELNYX_API_KEY', '')
    vi.stubEnv('TELNYX_PHONE', '')
  })

  function tenantRow(id: string, fields: Record<string, unknown>) {
    return { id, name: 'Test Co', slug: 'test-co', email_from: null, primary_color: '#111', logo_url: null, address: null, ...fields }
  }

  it('BUG-CLASS PROBE: sends SMS using sms_number when telnyx_phone is unset', async () => {
    resolve = (table) => {
      if (table === 'tenants') {
        return { data: tenantRow(TENANT_A, { telnyx_api_key: 'key-a', telnyx_phone: null, sms_number: '+15551110000' }), error: null }
      }
      if (table === 'clients') {
        return { data: { email: null, phone: '+15559990000' }, error: null }
      }
      return { data: { id: 'notif-1' }, error: null }
    }

    const result = await notify({
      tenantId: TENANT_A,
      type: 'booking_confirmed',
      title: 'Confirmed',
      message: 'Your booking is confirmed',
      channel: 'sms',
      recipientType: 'client',
      recipientId: 'client-1',
    })

    expect(result.success).toBe(true)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(sendSMS.mock.calls[0][0]).toMatchObject({ telnyxApiKey: 'key-a', telnyxPhone: '+15551110000' })
  })

  it('prefers telnyx_phone over sms_number when both are set', async () => {
    resolve = (table) => {
      if (table === 'tenants') {
        return { data: tenantRow(TENANT_A, { telnyx_api_key: 'key-a', telnyx_phone: '+15552220000', sms_number: '+15551110000' }), error: null }
      }
      if (table === 'clients') {
        return { data: { email: null, phone: '+15559990000' }, error: null }
      }
      return { data: { id: 'notif-1' }, error: null }
    }

    await notify({
      tenantId: TENANT_A,
      type: 'booking_confirmed',
      title: 'Confirmed',
      message: 'Your booking is confirmed',
      channel: 'sms',
      recipientType: 'client',
      recipientId: 'client-1',
    })

    expect(sendSMS.mock.calls[0][0]).toMatchObject({ telnyxPhone: '+15552220000' })
  })

  it('WRONG-TENANT PROBE: tenant B\'s sms_number never leaks into tenant A\'s send when A has neither column set', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenants') {
        if (eqs.id === TENANT_A) {
          return { data: tenantRow(TENANT_A, { telnyx_api_key: 'key-a', telnyx_phone: null, sms_number: null }), error: null }
        }
        return { data: tenantRow(TENANT_B, { telnyx_api_key: 'key-b', telnyx_phone: null, sms_number: '+15551110000' }), error: null }
      }
      if (table === 'clients') {
        return { data: { email: null, phone: '+15559990000' }, error: null }
      }
      return { data: { id: 'notif-1' }, error: null }
    }

    const result = await notify({
      tenantId: TENANT_A,
      type: 'booking_confirmed',
      title: 'Confirmed',
      message: 'Your booking is confirmed',
      channel: 'sms',
      recipientType: 'client',
      recipientId: 'client-1',
    })

    expect(sendSMS).not.toHaveBeenCalled()
    expect(result).toEqual({ success: false, error: 'SMS not configured — no Telnyx API key' })
  })

  it('GATE PROBE: does NOT fall back to the platform Telnyx account, even when one is configured', async () => {
    // sms-credentials.ts's resolveTenantSmsCredentials() supports an opt-in
    // platformFallback, but notify() does not (and must not) pass it —
    // whether texting a tenant's customers from the shared platform number
    // is even compliant without that tenant's own 10DLC registration is an
    // open, gated question (JEFF-MORNING-QUEUE.md, 15:17 2026-07-17,
    // "Compliance question — shared-platform-Telnyx-number fallback"),
    // still awaiting Jeff's answer as of this writing. If this test goes
    // red, notify() started using the platform fallback without that
    // sign-off landing first — fix notify.ts, don't just update this test.
    vi.stubEnv('TELNYX_API_KEY', 'platform-key')
    vi.stubEnv('TELNYX_PHONE', '+18885550000')

    resolve = (table) => {
      if (table === 'tenants') {
        return { data: tenantRow(TENANT_A, { telnyx_api_key: null, telnyx_phone: null, sms_number: null }), error: null }
      }
      if (table === 'clients') {
        return { data: { email: null, phone: '+15559990000' }, error: null }
      }
      return { data: { id: 'notif-1' }, error: null }
    }

    const result = await notify({
      tenantId: TENANT_A,
      type: 'booking_confirmed',
      title: 'Confirmed',
      message: 'Your booking is confirmed',
      channel: 'sms',
      recipientType: 'client',
      recipientId: 'client-1',
    })

    expect(sendSMS).not.toHaveBeenCalled()
    expect(result).toEqual({ success: false, error: 'SMS not configured — no Telnyx API key' })
  })
})
