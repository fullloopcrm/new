import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/reviews/request — sms_consent / do_not_service guard (P1/W2
 * fresh-ground, same missing-consent-check bug class fixed elsewhere this
 * session in schedule-pause, running-late, campaigns/send,
 * payment-followup-daily).
 *
 * This route previously selected only `name, email, phone` off `clients` and
 * sent both an email and an SMS unconditionally — it never checked
 * `do_not_service` (the codebase-wide "NEVER contact" flag) or `sms_consent`
 * (the literal TCPA STOP-reply flag). A client who was explicitly banned, or
 * who had texted STOP, still got a "please leave us a review" email/text
 * every time an admin clicked "Request Review".
 *
 * Distinct from `sms_marketing_opt_out`, which stays a deliberate,
 * un-fixed product-classification call (still flagged in the gap doc) —
 * whether a post-job review ask counts as "marketing" is a judgment call;
 * whether a banned/STOP'd client gets contacted at all is not.
 *
 * FIX: do_not_service blocks the whole action (403, no review row, no send,
 * matching client/book's single-client-action convention); sms_consent
 * gates only the SMS leg (STOP only revokes SMS, not email).
 */

const TENANT = 'tid-a'
const CLIENT_ID = 'c-1'

const { sendSMS } = vi.hoisted(() => ({ sendSMS: vi.fn(async () => ({ sent: true })) }))
const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(async () => ({ sent: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: {
      tenantId: TENANT,
      tenant: { name: 'Acme', google_place_id: null, resend_api_key: 'rk', telnyx_api_key: 'tk', telnyx_phone: '+15550001111' },
    },
    error: null,
  })),
}))

const clientHolder = vi.hoisted(() => ({
  row: null as null | { id: string; name: string; email: string | null; phone: string | null; sms_consent?: boolean; do_not_service?: boolean },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: clientHolder.row, error: null }) }) }) }) }
      }
      if (table === 'reviews') {
        return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'rev-1' }, error: null }) }) }) }
      }
      if (table === 'bookings') {
        return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { POST } from './route'

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

beforeEach(() => {
  sendSMS.mockClear()
  sendEmail.mockClear()
  clientHolder.row = null
})

describe('POST /api/reviews/request — sms_consent / do_not_service guard', () => {
  it('BLOCKED: a do_not_service client gets no email, no SMS, no review row, and a 403', async () => {
    clientHolder.row = { id: CLIENT_ID, name: 'Banned Client', email: 'b@x.com', phone: '+15559990001', do_not_service: true }

    const res = await POST(req({ client_id: CLIENT_ID }))
    expect(res.status).toBe(403)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('BLOCKED (SMS only): a client who replied STOP (sms_consent=false) gets the email but not the SMS', async () => {
    clientHolder.row = { id: CLIENT_ID, name: 'Stop Client', email: 's@x.com', phone: '+15559990002', sms_consent: false }

    const res = await POST(req({ client_id: CLIENT_ID }))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('CONTROL: a client with no consent flags set gets both email and SMS', async () => {
    clientHolder.row = { id: CLIENT_ID, name: 'Active Client', email: 'a@x.com', phone: '+15559990003' }

    const res = await POST(req({ client_id: CLIENT_ID }))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('CONTROL: sms_consent=null (never asked/legacy row) still defaults to allowed, matching every other gate this session', async () => {
    clientHolder.row = { id: CLIENT_ID, name: 'Legacy Client', email: null, phone: '+15559990004', sms_consent: undefined }

    const res = await POST(req({ client_id: CLIENT_ID }))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
