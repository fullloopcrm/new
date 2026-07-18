import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The invoice.payment_failed handler emails Full Loop's own internal
 * ADMIN_NOTIFICATION_EMAIL with tenant.name/owner_email spliced raw into an
 * HTML body. tenant.name is tenant-owner-controlled (dashboard onboarding),
 * and a subscription payment failure is trivially self-triggerable by any
 * paying tenant (e.g. a declined test card) — so this is a live vector for
 * a malicious tenant to inject HTML into the platform operator's own inbox.
 * Same unescaped-tenant.name-in-HTML class already fixed elsewhere this
 * session — this internal alert path was missed.
 */

const maliciousTenantName = '<img src=x onerror=alert(1)>'

const h = vi.hoisted(() => {
  type Row = Record<string, any>
  const store: Record<string, Row[]> = {
    tenants: [
      {
        id: 'tenant-1',
        name: '<img src=x onerror=alert(1)>',
        owner_email: 'owner@example.com',
        billing_status: 'active',
      },
    ],
  }
  const chain = (table: string) => {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      maybeSingle: async () => ({ data: (store[table] || []).find(match) ?? null, error: null }),
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'update') {
          store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...payload } : r))
          return res({ data: null, error: null })
        }
        return res({ data: (store[table] || []).filter(match), error: null })
      },
    }
    return c
  }
  return { store, chain }
})

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
  }
  return { default: MockStripe }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => h.chain(t) } }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger: vi.fn(async () => ({ posted: true })),
  postRefundToLedger: vi.fn(async () => ({ posted: true })),
  postChargebackToLedger: vi.fn(async () => ({ posted: true })),
  tenantFromPaymentIntent: vi.fn(async () => null),
  syncBookingRefundStatus: vi.fn(async () => {}),
}))

let lastHtml = ''
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async (args: { html: string }) => {
    lastHtml = args.html
  }),
}))

import { POST } from './route'

function paymentFailedEvent(customerEmail: string) {
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({
      type: 'invoice.payment_failed',
      data: { object: { customer_email: customerEmail } },
    }),
  })
}

beforeEach(() => {
  lastHtml = ''
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
  process.env.ADMIN_NOTIFICATION_EMAIL = 'ops@fullloop.example'
  h.store.tenants[0].billing_status = 'active'
})

describe('POST /api/webhooks/stripe invoice.payment_failed — HTML injection via tenant.name', () => {
  it('escapes an HTML-bearing tenant.name in the internal admin-alert email', async () => {
    const res = await POST(paymentFailedEvent('owner@example.com'))
    expect(res.status).toBe(200)

    expect(lastHtml).not.toContain(maliciousTenantName)
    expect(lastHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
