import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/campaigns/[id]/send gated its email/SMS sends on
 * email_marketing_opt_out / sms_marketing_opt_out / sms_consent but never on
 * do_not_service — the stronger, channel-agnostic kill-switch that
 * getClientContacts() (the nycmaid-legacy fan-out helper) treats as an
 * absolute account-level gate, and that BookingsAdmin.tsx warns admins about
 * before letting them proceed. A DNS-flagged client (often flagged for a
 * safety/harassment reason) was still sent marketing campaign emails and SMS
 * from this route, same bug class already fixed for booking-lifecycle SMS.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: {
      tenantId: 'tenant-1',
      tenant: { name: 'Acme', resend_api_key: 'key', resend_domain: null, email_from: null, telnyx_api_key: 'tk', telnyx_phone: '+15551234567' },
    },
    error: null,
  })),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ campaign_approval_required: false, campaign_auto_unsubscribe: false })),
}))

let emailSends: string[] = []
let smsSends: string[] = []
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async ({ to }: { to: string }) => {
    emailSends.push(to)
  }),
}))
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async ({ to }: { to: string }) => {
    smsSends.push(to)
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

const clients = [
  { id: 'client-1', name: 'Alice', email: 'a@example.com', phone: '+15551110001', sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true, do_not_service: false },
  { id: 'client-2', name: 'Bob (DNS)', email: 'b@example.com', phone: '+15551110002', sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true, do_not_service: true },
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

describe('POST /api/campaigns/[id]/send — do_not_service gate', () => {
  beforeEach(() => {
    campaign.status = 'draft'
    emailSends = []
    smsSends = []
  })

  it('does not email a do_not_service client', async () => {
    await callRoute()
    expect(emailSends).toEqual(['a@example.com'])
  })

  it('does not text a do_not_service client', async () => {
    await callRoute()
    expect(smsSends).toEqual(['+15551110001'])
  })

  it('still sends to the non-DNS client on both channels', async () => {
    const res = await callRoute()
    const json = await res.json()
    expect(json.sent).toBe(2)
  })
})
