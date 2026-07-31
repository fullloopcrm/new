import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * ai-05 re-check (2026-07-31, docs/readiness/ledger.json): a prior pass
 * flagged `campaign_sent` (client, email+sms) as bypassing notify()'s own
 * NOTIFY_COMM_MAP comms-preference gate entirely, treating it as a real,
 * unresolved compliance risk. Deeper verification (this file) found that
 * framing was WRONG, not just incomplete: campaigns/send/route.ts enforces
 * marketing opt-out via a SEPARATE, dedicated mechanism BEFORE it ever
 * calls notify() -- it filters the audience against
 * clients.email_marketing_opt_out / sms_marketing_opt_out / sms_consent at
 * recipient-list-build time (lines ~103-119 of route.ts), so an opted-out
 * client's client_id is never even passed to notify(). The NOTIFY_COMM_MAP
 * gap is real (notify() itself has no entry for campaign_sent), but it does
 * NOT mean opted-out clients receive marketing sends -- a different, real,
 * working guard already exists.
 *
 * This had zero test coverage before this file. These tests prove the
 * actual protection, not the absence of a different one.
 */

const TENANT = 'tenant-campaign-test'

type Row = Record<string, unknown>

const h = vi.hoisted(() => ({
  notify: vi.fn(async (_args: Record<string, unknown>) => ({ success: true })),
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/notify', () => ({ notify: h.notify }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { resend_api_key: 'key', telnyx_api_key: 'key', telnyx_phone: '+15550000000' },
                error: null,
              }),
            }),
          }),
        }
      }
      throw new Error(`unexpected supabaseAdmin.from('${table}') in this test`)
    },
  },
}))

// Test fixtures: a mix of opted-in and opted-out clients, keyed by id.
const CLIENTS: Row[] = [
  { id: 'client-optin', name: 'Opted In', email: 'optin@acme-fixture.com', phone: '+15551111111', email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: true },
  { id: 'client-email-optout', name: 'Email Opted Out', email: 'emailoptout@acme-fixture.com', phone: '+15552222222', email_marketing_opt_out: true, sms_marketing_opt_out: false, sms_consent: true },
  { id: 'client-sms-optout', name: 'SMS Opted Out', email: 'smsoptout@acme-fixture.com', phone: '+15553333333', email_marketing_opt_out: false, sms_marketing_opt_out: true, sms_consent: true },
  { id: 'client-sms-no-consent', name: 'No SMS Consent', email: 'noconsent@acme-fixture.com', phone: '+15554444444', email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: false },
]

const CAMPAIGN: Row = { id: 'campaign-1', tenant_id: TENANT, status: 'draft', type: 'both', name: 'Test Campaign', subject: 'Subject', body: 'Body', recipient_filter: 'all' }

function makeTenantDbMock() {
  return () => ({
    from: (table: string) => {
      if (table === 'campaigns') {
        const c: Record<string, unknown> = {
          select: () => c,
          eq: () => c,
          single: async () => ({ data: CAMPAIGN, error: null }),
          update: () => ({ eq: async () => ({ data: null, error: null }) }),
        }
        return c
      }
      if (table === 'clients') {
        const c: Record<string, unknown> = {
          select: () => c,
          eq: () => c,
          then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: CLIENTS, error: null }),
        }
        return c
      }
      if (table === 'campaign_recipients') {
        return {
          insert: async () => ({ data: null, error: null }),
          update: () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }) }),
        }
      }
      throw new Error(`unexpected db.from('${table}') in this test`)
    },
  })
}

vi.mock('@/lib/tenant-db', () => ({ tenantDb: makeTenantDbMock() }))

import { POST } from './route'

beforeEach(() => {
  h.notify.mockClear()
})

function sendReq() {
  return new Request('http://x', { method: 'POST', body: JSON.stringify({ campaign_id: 'campaign-1' }) })
}

describe('campaigns/send — marketing opt-out enforcement (ai-05)', () => {
  it('sends email to the opted-in client', async () => {
    await POST(sendReq())
    const emailCalls = h.notify.mock.calls.filter((c) => (c[0] as Row).channel === 'email')
    const emailRecipientIds = emailCalls.map((c) => (c[0] as Row).recipientId)
    expect(emailRecipientIds).toContain('client-optin')
  })

  it('never calls notify() with channel=email for a client with email_marketing_opt_out=true', async () => {
    await POST(sendReq())
    const emailCalls = h.notify.mock.calls.filter((c) => (c[0] as Row).channel === 'email')
    const emailRecipientIds = emailCalls.map((c) => (c[0] as Row).recipientId)
    expect(emailRecipientIds).not.toContain('client-email-optout')
  })

  it('never calls notify() with channel=sms for a client with sms_marketing_opt_out=true', async () => {
    await POST(sendReq())
    const smsCalls = h.notify.mock.calls.filter((c) => (c[0] as Row).channel === 'sms')
    const smsRecipientIds = smsCalls.map((c) => (c[0] as Row).recipientId)
    expect(smsRecipientIds).not.toContain('client-sms-optout')
  })

  it('never calls notify() with channel=sms for a client with sms_consent=false, even without an explicit marketing opt-out', async () => {
    await POST(sendReq())
    const smsCalls = h.notify.mock.calls.filter((c) => (c[0] as Row).channel === 'sms')
    const smsRecipientIds = smsCalls.map((c) => (c[0] as Row).recipientId)
    expect(smsRecipientIds).not.toContain('client-sms-no-consent')
  })

  it('the opted-out-of-email client still gets the SMS side (opt-outs are per-channel, not all-or-nothing)', async () => {
    await POST(sendReq())
    const smsCalls = h.notify.mock.calls.filter((c) => (c[0] as Row).channel === 'sms')
    const smsRecipientIds = smsCalls.map((c) => (c[0] as Row).recipientId)
    expect(smsRecipientIds).toContain('client-email-optout')
  })
})
