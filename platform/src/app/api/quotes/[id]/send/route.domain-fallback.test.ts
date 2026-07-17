import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/quotes/[id]/send — resolver-precedence bug-class probe.
 *
 * Same bug/fix as invoices/[id]/send/route.ts's sibling probe: the "Review &
 * Accept" link was built from `tenant.domain ? https://${tenant.domain} :
 * appUrl` — legacy column only, never consulting tenant_domains. Fixed by
 * routing through tenantSiteUrl() (tenant_domains PRIMARY -> tenants.domain
 * -> slug subdomain).
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
type SendEmailArgs = { to: string; from?: string; html: string; subject: string; resendApiKey?: string | null }
const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(async (_args: SendEmailArgs) => ({ ok: true })) }))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: vi.fn((s: string) => s) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    quotes: [
      {
        id: 'quote-1', tenant_id: A, status: 'draft', deal_id: null,
        contact_email: 'client@example.com', contact_phone: null,
        contact_name: 'Jane Client', quote_number: 'Q-1', title: 'Reno',
        total_cents: 10000, deposit_cents: 0, public_token: 'tok-a',
      },
    ],
    tenants: [
      {
        id: A, name: 'Acme', slug: 'acme', domain: null,
        phone: null, email: null, address: null, logo_url: null, primary_color: null,
        telnyx_api_key: null, telnyx_phone: null,
        resend_api_key: 'enc:resend', email_from: null, selena_config: null,
      },
    ],
    tenant_domains: [] as Record<string, any>[],
    quote_activity: [],
    deal_activities: [],
    deals: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  sendEmail.mockClear()
})

function post(id: string) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify({ via: 'email' }) }), {
    params: Promise.resolve({ id }),
  })
}

describe('POST /api/quotes/[id]/send — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — quote_url uses it, not appUrl/slug', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true },
    ]
    const res = await post('quote-1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quote_url).toBe('https://custom.example.com/quote/tok-a')
  })

  it('falls back to the tenant slug subdomain when neither tenant_domains nor tenants.domain resolve', async () => {
    const res = await post('quote-1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quote_url).toBe('https://acme.homeservicesbusinesscrm.com/quote/tok-a')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's quote link", async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'acme-real.example.com', is_primary: true, active: true },
      { tenant_id: B, domain: 'other-tenant.example.com', is_primary: true, active: true },
    ]
    const res = await post('quote-1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quote_url).toContain('acme-real.example.com')
    expect(body.quote_url).not.toContain('other-tenant.example.com')
  })

  it('fromEmail domain-fallback: no email_from, tenants.domain null, tenant_domains has PRIMARY — from uses it, not fullloopcrm.com', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true },
    ]
    const res = await post('quote-1')
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0]
    expect(call.from).toBe('quotes@custom.example.com')
  })

  it('fromEmail falls back to the generic domain only when neither tenant_domains nor tenants.domain resolve', async () => {
    const res = await post('quote-1')
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0]
    expect(call.from).toBe('quotes@fullloopcrm.com')
  })

  it("fromEmail wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's from address", async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'acme-real.example.com', is_primary: true, active: true },
      { tenant_id: B, domain: 'other-tenant.example.com', is_primary: true, active: true },
    ]
    const res = await post('quote-1')
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0]
    expect(call.from).toBe('quotes@acme-real.example.com')
  })
})
