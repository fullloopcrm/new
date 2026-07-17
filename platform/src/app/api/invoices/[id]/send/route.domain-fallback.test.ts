import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/invoices/[id]/send — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): the "View & Pay" link mailed/texted to the customer was
 * built from `tenant.domain ? https://${tenant.domain} : appUrl` — the legacy
 * column only, falling all the way back to the PLATFORM's own generic app URL
 * (not even the tenant's slug subdomain) whenever the tenant's real domain
 * lived only in tenant_domains (e.g. added via admin/websites, which never
 * writes tenants.domain). Fifth mirror of the resolver-precedence class fixed
 * this session (site-readiness.ts, brand.ts, selena/agent.ts, tenantSiteUrl's
 * own call sites). Fixed by routing through the already-tested
 * tenantSiteUrl() helper (tenant_domains PRIMARY -> tenants.domain -> slug
 * subdomain) instead of duplicating ad-hoc resolution inline.
 *
 * fromEmail's fallback (fires when email_from is unset) is a DIFFERENT bug
 * shape, not a tenant_domains-resolver-precedence gap: `invoices@${tenant
 * .domain || 'fullloopcrm.com'}` was already wrong even with a resolved
 * domain, because a tenant's site domain is never verified with Resend for
 * SENDING -- only tenants.email_from (paired with the admin-configured
 * tenants.resend_domain verification flow) is. The fix is tenantSender(),
 * the established helper every other notify path already routes through,
 * NOT adding a tenant_domains lookup to the ad-hoc fallback.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({ AuthError: class AuthError extends Error { status = 401 } }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
type SendEmailArgs = { to: string; from?: string; html: string; subject: string; resendApiKey?: string | null }
const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(async (_args: SendEmailArgs) => ({ ok: true })) }))
vi.mock('@/lib/email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email')>('@/lib/email')
  return { ...actual, sendEmail }
})
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => s }))
vi.mock('@/lib/invoice', () => ({
  logInvoiceEvent: vi.fn(async () => {}),
  formatInvoiceCents: (c: number) => `$${(c / 100).toFixed(2)}`,
}))

import { POST } from './route'

function seed() {
  return {
    invoices: [
      {
        id: 'inv-a', tenant_id: A, public_token: 'tok-a', status: 'sent',
        total_cents: 10000, amount_paid_cents: 0, contact_email: 'payer@x.com',
        contact_phone: null, invoice_number: 'INV-1', title: 'Deep clean',
      },
    ],
    tenants: [
      {
        id: A, name: 'Acme', slug: 'acme', domain: null,
        telnyx_api_key: null, telnyx_phone: null,
        resend_api_key: 'enc:resend', email_from: 'invoices@acme.example.com',
      },
    ],
    tenant_domains: [] as Record<string, any>[],
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

describe('POST /api/invoices/[id]/send — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — invoice_url uses it, not appUrl/slug', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true },
    ]
    const res = await post('inv-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invoice_url).toBe('https://custom.example.com/invoice/tok-a')
  })

  it('falls back to the tenant slug subdomain when neither tenant_domains nor tenants.domain resolve', async () => {
    const res = await post('inv-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invoice_url).toBe('https://acme.homeservicesbusinesscrm.com/invoice/tok-a')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's invoice link", async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'acme-real.example.com', is_primary: true, active: true },
      { tenant_id: B, domain: 'other-tenant.example.com', is_primary: true, active: true },
    ]
    const res = await post('inv-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invoice_url).toContain('acme-real.example.com')
    expect(body.invoice_url).not.toContain('other-tenant.example.com')
  })

  it('fromEmail uses tenantSender(): no email_from set — falls back to the tenant-identified platform apex, NOT any tenant_domains/tenants.domain value', async () => {
    h.seed.tenants[0].email_from = null
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true },
    ]
    const res = await post('inv-a')
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0]
    // Resend requires a verified sending domain -- a tenant's SITE domain
    // (tenant_domains/tenants.domain) is never verified for sending, so using
    // it as the from-address domain would break deliverability. tenantSender()
    // falls back to the platform's own verified fullloopcrm.com apex instead.
    expect(call.from).toBe('Acme <acme@fullloopcrm.com>')
  })

  it('fromEmail uses tenant.email_from when set, ignoring tenant_domains/tenants.domain entirely', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true },
    ]
    const res = await post('inv-a')
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0]
    expect(call.from).toBe('invoices@acme.example.com')
  })
})
