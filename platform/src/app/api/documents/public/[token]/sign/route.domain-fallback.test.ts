import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/documents/public/[token]/sign — resolver-precedence bug-class
 * probe for sendSigningInviteToSigner (the sequential-flow "you're up next"
 * notify, fired when one signer completes and a lower-order signer is still
 * pending). Same bug/fix as the other 5 mirrors this session: the sign link
 * was built from `tenant.domain ? https://${tenant.domain} : appUrl` —
 * legacy column only, never consulting tenant_domains. Fixed by routing
 * through tenantSiteUrl(). (sendCompletionCopies's OWN fromEmail-fallback
 * mirror of this same bug is covered separately, in
 * route.completion-copy-sender.test.ts.)
 */

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(async (_args: unknown) => ({})) }))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 9 })) }))
vi.mock('@/lib/documents', () => ({
  canSignerAct: vi.fn(() => true),
  documentSignedPath: vi.fn(() => 'tenant-a/doc-1/signed.pdf'),
  DOCUMENTS_BUCKET: 'documents',
  logDocEvent: vi.fn(async () => {}),
  sha256Hex: vi.fn(() => 'deadbeef'),
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: vi.fn((v: string) => `decrypted:${v}`) }))
vi.mock('pdf-lib', () => {
  const mockFont = { widthOfTextAtSize: () => 5 }
  const mockPage = { getWidth: () => 600, getHeight: () => 800, drawImage: vi.fn(), drawText: vi.fn() }
  const mockPdf = {
    embedFont: vi.fn(async () => mockFont),
    getPages: vi.fn(() => [mockPage]),
    addPage: vi.fn(() => mockPage),
    embedPng: vi.fn(async () => ({ scaleToFit: () => ({ width: 10, height: 10 }) })),
    embedJpg: vi.fn(async () => ({ scaleToFit: () => ({ width: 10, height: 10 }) })),
    save: vi.fn(async () => new Uint8Array([1, 2, 3])),
  }
  return {
    PDFDocument: { load: vi.fn(async () => mockPdf) },
    StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'HelveticaBold' },
    rgb: vi.fn(),
  }
})

function chainable(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'not', 'lt', 'order', 'limit', 'update', 'insert', 'is']
  for (const m of methods) obj[m] = vi.fn(() => obj)
  obj.single = vi.fn(async () => result)
  obj.maybeSingle = vi.fn(async () => result)
  obj.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return obj
}

let tenantDomainsRows: Array<{ tenant_id: string; domain: string; is_primary: boolean; active: boolean }>

const SIGNER = {
  id: 'sig-1', document_id: 'doc-1', order_index: 0, status: 'sent',
  consent_accepted_at: '2026-07-17T00:00:00Z', name: 'Sig One', email: 'sig1@x.com',
  phone: null, public_token: 'tok-1', signature_png: null,
}

function buildDoc(tenant: { domain: string | null; slug: string | null; email_from?: string | null }) {
  return {
    id: 'doc-1', tenant_id: 'tid-a', title: 'Service Agreement',
    original_path: 'tenant-a/doc-1/original.pdf', original_sha256: null,
    consent_text: '', sign_order: 'sequential', status: 'sent',
    tenants: {
      name: 'Acme', domain: tenant.domain, slug: tenant.slug,
      telnyx_api_key: null, telnyx_phone: null,
      resend_api_key: 'enc-resend-key-acme',
      email_from: tenant.email_from === undefined ? 'docs@acme.example.com' : tenant.email_from,
    },
  }
}

let doc: ReturnType<typeof buildDoc>
let documentSignersCallCount = 0
let documentsCallCount = 0

function buildSupabaseFrom() {
  documentSignersCallCount = 0
  documentsCallCount = 0
  return (table: string) => {
    if (table === 'document_signers') {
      documentSignersCallCount++
      switch (documentSignersCallCount) {
        case 1: // lookup by public_token
          return chainable({ data: SIGNER, error: null })
        case 2: // allSigners for canSignerAct's pre-check
          return chainable({
            data: [
              { id: 'sig-1', order_index: 0, status: 'sent' },
              { id: 'sig-2', order_index: 1, status: 'pending' },
            ],
            error: null,
          })
        case 3: // atomic claim (pending/sent/viewed -> signed)
          return chainable({ data: { id: 'sig-1' }, error: null })
        case 4: // sequential post-claim guard (no prior unfinished — order_index 0)
          return chainable({ data: [], error: null })
        case 5: // freshSigners after claim — sig-2 still pending, NOT all done
          return chainable({
            data: [
              { id: 'sig-1', order_index: 0, status: 'signed', name: 'Sig One', email: 'sig1@x.com', phone: null },
              { id: 'sig-2', order_index: 1, status: 'pending', name: 'Sig Two', email: 'sig2@x.com', phone: null },
            ],
            error: null,
          })
        case 6: // sendSigningInviteToSigner's tokenRow lookup for the next signer
          return chainable({ data: { public_token: 'tok-2' }, error: null })
        default:
          return chainable({ data: null, error: null })
      }
    }
    if (table === 'documents') {
      documentsCallCount++
      if (documentsCallCount === 1) return chainable({ data: doc, error: null })
      return chainable({ data: null, error: null }) // status -> in_progress update
    }
    if (table === 'document_fields') {
      return chainable({ data: [], error: null }) // no unfilled required fields
    }
    if (table === 'tenant_domains') {
      return chainable({ data: tenantDomainsRows.filter(r => r.tenant_id === doc.tenant_id && r.active), error: null })
    }
    throw new Error(`unexpected table: ${table}`)
  }
}

let supabaseFromImpl: (table: string) => ReturnType<typeof chainable>

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => supabaseFromImpl(table),
    storage: { from: () => ({ download: vi.fn(), upload: vi.fn() }) },
  },
}))

function fakeRequest(body: Record<string, unknown>): Request {
  return { headers: { get: () => null }, json: async () => body } as unknown as Request
}

async function sign() {
  const { POST } = await import('./route')
  return POST(
    fakeRequest({ signature_png: 'data:image/png;base64,' + 'a'.repeat(120), signature_name: 'Sig One', field_values: [] }),
    { params: Promise.resolve({ token: 'tok-1' }) },
  )
}

beforeEach(() => {
  sendEmail.mockClear()
  tenantDomainsRows = []
  supabaseFromImpl = buildSupabaseFrom()
})

describe('POST /api/documents/public/[token]/sign — sendSigningInviteToSigner domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — next-signer invite link uses it, not appUrl/slug', async () => {
    doc = buildDoc({ domain: null, slug: 'acme' })
    tenantDomainsRows = [{ tenant_id: 'tid-a', domain: 'custom.example.com', is_primary: true, active: true }]
    const res = await sign()
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const call = sendEmail.mock.calls[0][0] as { to: string; html: string }
    expect(call.to).toBe('sig2@x.com')
    expect(call.html).toContain('https://custom.example.com/sign/tok-2')
  })

  it('falls back to the tenant slug subdomain when neither tenant_domains nor tenants.domain resolve', async () => {
    doc = buildDoc({ domain: null, slug: 'acme' })
    tenantDomainsRows = []
    const res = await sign()
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0] as { html: string }
    expect(call.html).toContain('https://acme.homeservicesbusinesscrm.com/sign/tok-2')
  })

  it("wrong-tenant probe: another tenant's tenant_domains row never leaks into this tenant's next-signer invite", async () => {
    doc = buildDoc({ domain: null, slug: 'acme' })
    tenantDomainsRows = [
      { tenant_id: 'tid-a', domain: 'acme-real.example.com', is_primary: true, active: true },
      { tenant_id: 'tid-b', domain: 'other-tenant.example.com', is_primary: true, active: true },
    ]
    const res = await sign()
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0] as { html: string }
    expect(call.html).toContain('acme-real.example.com')
    expect(call.html).not.toContain('other-tenant.example.com')
  })

  it('fromEmail domain-fallback: no email_from, tenants.domain null, tenant_domains has PRIMARY — from uses it, not fullloopcrm.com', async () => {
    doc = buildDoc({ domain: null, slug: 'acme', email_from: null })
    tenantDomainsRows = [{ tenant_id: 'tid-a', domain: 'custom.example.com', is_primary: true, active: true }]
    const res = await sign()
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0] as { from?: string }
    expect(call.from).toBe('docs@custom.example.com')
  })

  it('fromEmail falls back to the generic domain only when neither tenant_domains nor tenants.domain resolve', async () => {
    doc = buildDoc({ domain: null, slug: 'acme', email_from: null })
    tenantDomainsRows = []
    const res = await sign()
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0] as { from?: string }
    expect(call.from).toBe('docs@fullloopcrm.com')
  })

  it("fromEmail wrong-tenant probe: another tenant's tenant_domains row never leaks into this tenant's next-signer invite from-address", async () => {
    doc = buildDoc({ domain: null, slug: 'acme', email_from: null })
    tenantDomainsRows = [
      { tenant_id: 'tid-a', domain: 'acme-real.example.com', is_primary: true, active: true },
      { tenant_id: 'tid-b', domain: 'other-tenant.example.com', is_primary: true, active: true },
    ]
    const res = await sign()
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0] as { from?: string }
    expect(call.from).toBe('docs@acme-real.example.com')
  })
})
