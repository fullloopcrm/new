import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/campaigns/send built its recipient_rows on email_marketing_opt_out
 * / sms_marketing_opt_out / sms_consent but never checked do_not_service — the
 * stronger, channel-agnostic kill-switch getClientContacts() treats as an
 * absolute account-level gate. A DNS-flagged client was still enrolled as a
 * campaign_recipients row and sent both marketing email and SMS from this
 * route, even though the outreach cron (cron/outreach/route.ts) already
 * excludes do_not_service clients from the same kind of send.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))

let notifyRecipients: string[] = []
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async ({ recipientId }: { recipientId: string }) => {
    notifyRecipients.push(recipientId)
  }),
}))

const campaign = {
  id: 'camp-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  type: 'both',
  name: 'Spring Promo',
  subject: 'Hello',
  body: 'Body copy',
  recipient_filter: 'all',
}

const clients = [
  { id: 'client-1', name: 'A', email: 'a@example.com', phone: '+15551110001', email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: true, do_not_service: false },
  { id: 'client-2', name: 'B (DNS)', email: 'b@example.com', phone: '+15551110002', email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: true, do_not_service: true },
]

let recipientInsertRows: Array<{ client_id: string; channel: string }> = []

function listChain(data: unknown) {
  const obj: { eq: () => typeof obj; in: () => typeof obj; then: (res: (v: { data: unknown }) => unknown, rej?: (e: unknown) => unknown) => unknown } = {
    eq: () => obj,
    in: () => obj,
    then: (res, rej) => Promise.resolve({ data }).then(res, rej),
  }
  return obj
}

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'campaigns') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: { ...campaign } }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          if (payload.status === 'sending') {
            return {
              eq: () => ({
                eq: () => ({
                  eq: (_col: string, val: string) => ({
                    select: async () => {
                      if (campaign.status !== val) return { data: [] }
                      campaign.status = 'sending'
                      return { data: [{ id: campaign.id }] }
                    },
                  }),
                }),
              }),
            }
          }
          return {
            eq: async () => {
              Object.assign(campaign, payload)
              return { data: null, error: null }
            },
          }
        },
      }
    }
    if (table === 'clients') {
      return { select: () => listChain(clients) }
    }
    if (table === 'tenants') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { resend_api_key: 'key', telnyx_api_key: 'tk', telnyx_phone: '+15551234567' } }),
          }),
        }),
      }
    }
    if (table === 'campaign_recipients') {
      return {
        insert: async (rows: Array<{ client_id: string; channel: string }>) => {
          recipientInsertRows.push(...rows)
          return { data: null, error: null }
        },
        update: () => ({
          eq: () => ({
            eq: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function makeRequest(): Request {
  return new Request('http://localhost/api/campaigns/send', {
    method: 'POST',
    body: JSON.stringify({ campaign_id: 'camp-1' }),
  })
}

describe('POST /api/campaigns/send — do_not_service gate', () => {
  beforeEach(() => {
    campaign.status = 'draft'
    notifyRecipients = []
    recipientInsertRows = []
  })

  it('excludes a do_not_service client from campaign_recipients on both channels', async () => {
    await POST(makeRequest())
    const dnsRows = recipientInsertRows.filter((r) => r.client_id === 'client-2')
    expect(dnsRows).toEqual([])
  })

  it('never calls notify() for the do_not_service client', async () => {
    await POST(makeRequest())
    expect(notifyRecipients).not.toContain('client-2')
  })

  it('still sends to the non-DNS client on both channels', async () => {
    const res = await POST(makeRequest())
    const json = await res.json()
    expect(json.sent).toBe(2)
    expect(notifyRecipients.filter((id) => id === 'client-1')).toHaveLength(2)
  })
})
