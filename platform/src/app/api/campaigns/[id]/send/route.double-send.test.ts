import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/campaigns/[id]/send had NO idempotency guard at all — it never
 * checked campaign.status before re-fetching every active client and
 * re-sending. A double-click of "Send Campaign", a client retry after a
 * slow/ambiguous response, or simply hitting the endpoint again later
 * re-sent real emails/SMS to the entire audience every single time. Fix
 * rejects an already sent/sending campaign and atomically claims it
 * (UPDATE ... WHERE status NOT IN ('sent','sending')) right before the send
 * loop, so concurrent calls can't both win either.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: {
      tenantId: 'tenant-1',
      tenant: { name: 'Acme', resend_api_key: 'key', resend_domain: null, email_from: null, telnyx_api_key: null, telnyx_phone: null },
    },
    error: null,
  })),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ campaign_approval_required: false, campaign_auto_unsubscribe: false })),
}))

let emailSends = 0
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async () => {
    emailSends++
  }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

const campaign = {
  id: 'camp-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  type: 'email',
  name: 'Spring Promo',
  subject: 'Hello',
  body: 'Hi {name}, from {business}',
}

const clients = [
  { id: 'client-1', name: 'Alice', email: 'a@example.com', phone: null, sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true },
  { id: 'client-2', name: 'Bob', email: 'b@example.com', phone: null, sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true },
]

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
            // Atomic claim chain: .eq(id).eq(tenant).neq('status','sent').neq('status','sending').select('id')
            return {
              eq: () => ({
                eq: () => ({
                  neq: (_c1: string, v1: string) => ({
                    neq: (_c2: string, v2: string) => ({
                      select: async () => {
                        if (campaign.status === v1 || campaign.status === v2) return { data: [] }
                        campaign.status = 'sending'
                        return { data: [{ id: campaign.id }] }
                      },
                    }),
                  }),
                }),
              }),
            }
          }
          // Final 'sent' update, or the catch-block revert to 'draft'.
          if (payload.status === 'draft') {
            return {
              eq: () => ({
                eq: async () => {
                  if (campaign.status === 'sending') campaign.status = 'draft'
                  return { data: null, error: null }
                },
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
      return {
        select: () => ({
          eq: () => ({
            eq: async () => ({ data: clients }),
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
  return new Request('http://localhost/api/campaigns/camp-1/send', { method: 'POST' })
}
function callRoute() {
  return POST(makeRequest(), { params: Promise.resolve({ id: 'camp-1' }) })
}

describe('POST /api/campaigns/[id]/send — double-send guard', () => {
  beforeEach(() => {
    campaign.status = 'draft'
    emailSends = 0
  })

  it('sends once for a normal single call', async () => {
    const res = await callRoute()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.sent).toBe(2)
    expect(emailSends).toBe(2)
  })

  it('rejects a second send once the campaign is already sent', async () => {
    await callRoute()
    const res2 = await callRoute()
    const json2 = await res2.json()
    expect(res2.status).toBe(400)
    expect(json2.error).toMatch(/already been sent/i)
    expect(emailSends).toBe(2)
  })

  it('does not double-send when two sends race concurrently', async () => {
    const [r1, r2] = await Promise.all([callRoute(), callRoute()])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 400])
    // Only the winner's 2 clients get emailed — never 4.
    expect(emailSends).toBe(2)
  })
})
