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
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }))
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
})
