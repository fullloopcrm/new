import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/campaigns/send read campaign.status, then unconditionally wrote
 * status:'sending' with no WHERE-status guard. Two concurrent sends (a
 * double-click of "Send Campaign", or a client retry after a slow/ambiguous
 * response) both read status:'draft', both passed the check, and both built
 * the recipient list and fired real emails/SMS to the entire audience a
 * second time — the same TOCTOU class fixed for team-member Stripe payouts.
 * Fix atomically claims the campaign (UPDATE ... WHERE status='draft') and
 * only proceeds if the claim actually moved the row.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))

let notifyCalls = 0
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async () => {
    notifyCalls++
  }),
}))

const campaign = {
  id: 'camp-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  type: 'email',
  name: 'Spring Promo',
  subject: 'Hello',
  body: 'Body copy',
  recipient_filter: 'all',
}

const clients = [
  { id: 'client-1', name: 'A', email: 'a@example.com', phone: null, email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: true },
  { id: 'client-2', name: 'B', email: 'b@example.com', phone: null, email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: true },
]

let recipientInsertCalls = 0

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
            // Atomic claim chain: .eq(id).eq(tenant).eq('status','draft').select('id')
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
          // Any other update (final 'sent' stats, or rollback to 'draft') — apply and resolve.
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
            single: async () => ({ data: { resend_api_key: 'key', telnyx_api_key: null, telnyx_phone: null } }),
          }),
        }),
      }
    }
    if (table === 'campaign_recipients') {
      return {
        insert: async (rows: unknown[]) => {
          recipientInsertCalls += (rows as unknown[]).length
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

describe('POST /api/campaigns/send — double-send race', () => {
  beforeEach(() => {
    campaign.status = 'draft'
    notifyCalls = 0
    recipientInsertCalls = 0
  })

  it('sends once for a normal single call', async () => {
    const res = await POST(makeRequest())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.sent).toBe(2)
    expect(notifyCalls).toBe(2)
    expect(recipientInsertCalls).toBe(2)
  })

  it('rejects a second send once the campaign is no longer draft', async () => {
    await POST(makeRequest())
    const res2 = await POST(makeRequest())
    const json2 = await res2.json()
    expect(res2.status).toBe(400)
    expect(json2.error).toMatch(/already been sent/i)
    expect(notifyCalls).toBe(2)
    expect(recipientInsertCalls).toBe(2)
  })

  it('does not double-send when two sends race concurrently', async () => {
    const [r1, r2] = await Promise.all([POST(makeRequest()), POST(makeRequest())])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 400])
    // Only the winner's audience (2 clients) gets emailed/inserted — never 4.
    expect(notifyCalls).toBe(2)
    expect(recipientInsertCalls).toBe(2)
  })
})
