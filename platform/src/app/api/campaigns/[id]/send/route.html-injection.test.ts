import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * campaigns/[id]/send spliced client.name/tenant.name/tenant.address
 * unescaped into the {name}/{business} merge fields of every campaign HTML
 * email. client.name in particular is public-form-writable via the
 * unauthenticated /api/client/book endpoint, so a booking name like
 * `<img src=x onerror=alert(1)>` would execute in every recipient's mail
 * client once that "customer" got swept into a campaign send. SMS is plain
 * text and stays unescaped intentionally.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: {
      tenantId: 'tenant-1',
      tenant: {
        name: 'Acme',
        resend_api_key: 'key',
        resend_domain: null,
        email_from: null,
        telnyx_api_key: 'telnyx-key',
        telnyx_phone: '+15555550000',
      },
    },
    error: null,
  })),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ campaign_approval_required: false, campaign_auto_unsubscribe: false })),
}))

let lastEmailHtml = ''
let lastSmsBody = ''
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async (args: { html: string }) => {
    lastEmailHtml = args.html
  }),
}))
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async (args: { body: string }) => {
    lastSmsBody = args.body
  }),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

const campaign = {
  id: 'camp-1',
  tenant_id: 'tenant-1',
  status: 'draft',
  type: 'both',
  name: 'Spring Promo',
  subject: 'Hello',
  body: 'Hi {name}, from {business}',
}

const maliciousName = '<img src=x onerror=alert(1)>'

const clients = [
  {
    id: 'client-1',
    name: maliciousName,
    email: 'a@example.com',
    phone: '+15555550100',
    sms_marketing_opt_out: false,
    email_marketing_opt_out: false,
    sms_consent: true,
  },
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
            return {
              eq: () => ({
                eq: () => ({
                  neq: () => ({
                    neq: () => ({
                      select: async () => {
                        campaign.status = 'sending'
                        return { data: [{ id: campaign.id }] }
                      },
                    }),
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

function callRoute() {
  const req = new Request('http://localhost/api/campaigns/camp-1/send', { method: 'POST' })
  return POST(req, { params: Promise.resolve({ id: 'camp-1' }) })
}

describe('POST /api/campaigns/[id]/send — HTML injection via client.name', () => {
  beforeEach(() => {
    campaign.status = 'draft'
    lastEmailHtml = ''
    lastSmsBody = ''
  })

  it('escapes an HTML-bearing client.name in the emailed HTML body', async () => {
    const res = await callRoute()
    expect(res.status).toBe(200)
    expect(lastEmailHtml).not.toContain('<img src=x onerror=alert(1)>')
    expect(lastEmailHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('leaves the SMS body as plain text, unescaped', async () => {
    await callRoute()
    expect(lastSmsBody).toContain(maliciousName)
  })
})
