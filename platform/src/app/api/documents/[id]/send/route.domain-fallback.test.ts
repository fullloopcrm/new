import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/documents/[id]/send — resolver-precedence bug-class probe.
 *
 * Same bug/fix as invoices/[id]/send and quotes/[id]/send: the "Review &
 * Sign" link mailed to each signer was built from `tenant?.domain ?
 * https://${tenant.domain} : appUrl` — legacy column only. Fixed by routing
 * through tenantSiteUrl().
 *
 * fromEmail's fallback (fires when email_from is unset) is a DIFFERENT bug
 * shape, not a tenant_domains-resolver-precedence gap: `docs@${tenant.domain
 * || 'fullloopcrm.com'}` was already wrong even with a resolved domain,
 * because a tenant's site domain is never verified with Resend for SENDING
 * -- only tenants.email_from (paired with the admin-configured
 * tenants.resend_domain verification flow) is. The fix is tenantSender(),
 * the established helper every other notify path already routes through,
 * NOT adding a tenant_domains lookup to the ad-hoc fallback.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    storage: {
      from: () => ({
        download: vi.fn(async () => ({ data: { arrayBuffer: async () => new ArrayBuffer(8) } })),
      }),
    },
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({ AuthError: class AuthError extends Error { status = 401 } }))
type SendEmailArgs = { to: string; from?: string; html: string; subject: string; resendApiKey?: string | null }
const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(async (_args: SendEmailArgs) => ({ ok: true })) }))
vi.mock('@/lib/email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email')>('@/lib/email')
  return { ...actual, sendEmail }
})
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => s }))
vi.mock('@/lib/documents', () => ({
  DOCUMENTS_BUCKET: 'docs',
  isEditableStatus: (s: string) => s === 'draft',
  logDocEvent: vi.fn(async () => {}),
  sha256Hex: () => 'hash',
}))

import { POST } from './route'

function seed() {
  return {
    documents: [
      { id: 'd-a', tenant_id: A, status: 'draft', original_path: 'p/a.pdf', title: 'Agreement A', message: null, sign_order: 'parallel' },
    ],
    document_signers: [
      { id: 'sig-1', tenant_id: A, document_id: 'd-a', order_index: 0, status: 'pending', name: 'Sig One', email: 'sig@x.com', phone: null, public_token: 'tok-sig-1' },
    ],
    document_fields: [{ id: 'f-1', tenant_id: A, document_id: 'd-a' }],
    tenants: [
      { id: A, name: 'Acme', slug: 'acme', domain: null, telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'enc:resend', email_from: null },
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
  return POST(new Request('http://t', { method: 'POST' }), { params: Promise.resolve({ id }) })
}

describe('POST /api/documents/[id]/send — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — the sign link uses it, not appUrl/slug', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true },
    ]
    const res = await post('d-a')
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const call = sendEmail.mock.calls[0][0] as { html: string }
    expect(call.html).toContain('https://custom.example.com/sign/tok-sig-1')
  })

  it('falls back to the tenant slug subdomain when neither tenant_domains nor tenants.domain resolve', async () => {
    const res = await post('d-a')
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0] as { html: string }
    expect(call.html).toContain('https://acme.homeservicesbusinesscrm.com/sign/tok-sig-1')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's sign link", async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'acme-real.example.com', is_primary: true, active: true },
      { tenant_id: B, domain: 'other-tenant.example.com', is_primary: true, active: true },
    ]
    const res = await post('d-a')
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0] as { html: string }
    expect(call.html).toContain('acme-real.example.com')
    expect(call.html).not.toContain('other-tenant.example.com')
  })

  it('fromEmail uses tenantSender(): no email_from set — falls back to the tenant-identified platform apex, NOT any tenant_domains/tenants.domain value', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true },
    ]
    const res = await post('d-a')
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0] as { from?: string }
    // Resend requires a verified sending domain -- tenant_domains/tenants.domain
    // are the tenant's SITE domain, never verified for sending. Using either as
    // the from-address domain would break deliverability. tenantSender() falls
    // back to the platform's own verified fullloopcrm.com apex instead.
    expect(call.from).toBe('Acme <acme@fullloopcrm.com>')
  })

  it('fromEmail uses tenant.email_from when set, ignoring tenant_domains/tenants.domain entirely', async () => {
    h.seed.tenants[0].email_from = 'docs@acme-verified.com'
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true },
    ]
    const res = await post('d-a')
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0] as { from?: string }
    expect(call.from).toBe('docs@acme-verified.com')
  })
})
