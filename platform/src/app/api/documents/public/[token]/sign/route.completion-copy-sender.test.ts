import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/documents/public/[token]/sign — fresh-ground find, a new bug
 * class (tenant email-credential scoping, distinct from the sms_consent/
 * secret-redaction/write-scope classes closed earlier this session).
 *
 * On-completion "here's your signed copy" receipt (sendCompletionCopies)
 * called sendEmail() with no `from`/`resendApiKey` at all, silently falling
 * back to sendEmail()'s platform-wide default (RESEND_API_KEY + "Full Loop
 * CRM <hello@...>") instead of the tenant's own resend_api_key/email_from —
 * even though this SAME file's sendSigningInviteToSigner (the sequential
 * next-signer notify) and documents/[id]/send/route.ts (the initial invite)
 * both already decrypt and pass the tenant's own credentials for every other
 * email on this document. The final receipt — the single highest-stakes
 * email in the whole flow, carrying the legally-signed PDF attachment — was
 * the one send that un-white-labeled itself and routed cost/volume through
 * the platform's own shared Resend account instead of the tenant's.
 *
 * Fixed: sendCompletionCopies now takes the same doc.tenants object already
 * loaded earlier in this route and decrypts/passes resend_api_key +
 * email_from, matching sendSigningInviteToSigner's established pattern
 * exactly.
 */

type SendEmailArgs = { to: string; from?: string; resendApiKey?: string | null; attachments?: unknown[] }
const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(async (_args: SendEmailArgs) => ({})) }))
vi.mock('@/lib/email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email')>('@/lib/email')
  return { ...actual, sendEmail }
})
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 9 })) }))
vi.mock('@/lib/documents', () => ({
  canSignerAct: vi.fn(() => true),
  documentSignedPath: vi.fn(() => 'tenant-a/doc-1/signed.pdf'),
  DOCUMENTS_BUCKET: 'documents',
  logDocEvent: vi.fn(async () => {}),
  sha256Hex: vi.fn(() => 'deadbeef'),
}))
vi.mock('@/lib/secret-crypto', () => ({
  decryptSecret: vi.fn((v: string) => `decrypted:${v}`),
}))
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

// Generic Supabase query-builder stub: chainable AND thenable, resolving to
// a pre-set result no matter which/how many methods were chained onto it —
// this route's calls terminate at different points (.single(), .maybeSingle(),
// or bare .order()/.eq()), all of which need to resolve correctly.
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

const TENANT: {
  name: string
  slug: string
  domain: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  resend_api_key: string | null
  email_from: string | null
} = {
  name: 'Acme Cleaning',
  slug: 'acme-cleaning',
  domain: 'acme.example.com',
  telnyx_api_key: null,
  telnyx_phone: null,
  resend_api_key: 'enc-resend-key-acme',
  email_from: 'docs@acme.example.com',
}

const DOC = {
  id: 'doc-1',
  tenant_id: 'tid-a',
  title: 'Service Agreement',
  original_path: 'tenant-a/doc-1/original.pdf',
  original_sha256: null,
  consent_text: '',
  sign_order: 'parallel',
  status: 'sent',
  tenants: TENANT,
}

const SIGNER = {
  id: 'sig-1',
  document_id: 'doc-1',
  order_index: 0,
  status: 'sent',
  consent_accepted_at: '2026-07-17T00:00:00Z',
  name: 'Sig One',
  email: 'sig@x.com',
  phone: null,
  public_token: 'tok-1',
  signature_png: null,
}

const fakeBlob = { arrayBuffer: async () => new ArrayBuffer(8) }

let documentSignersCallCount = 0
let documentFieldsCallCount = 0
let documentsCallCount = 0
let tenantDomainsRows: Array<{ tenant_id: string; domain: string; is_primary: boolean; active: boolean }> = []
let currentDoc: typeof DOC = DOC
let supabaseFromImpl: (table: string) => ReturnType<typeof chainable>

function buildSupabaseFrom() {
  documentSignersCallCount = 0
  documentFieldsCallCount = 0
  documentsCallCount = 0
  return (table: string) => {
    if (table === 'document_signers') {
      documentSignersCallCount++
      switch (documentSignersCallCount) {
        case 1: // lookup by public_token
          return chainable({ data: SIGNER, error: null })
        case 2: // allSigners for canSignerAct's pre-check
          return chainable({ data: [{ id: 'sig-1', order_index: 0, status: 'sent' }], error: null })
        case 3: // atomic claim (pending/sent/viewed -> signed)
          return chainable({ data: { id: 'sig-1' }, error: null })
        case 4: // freshSigners after claim
          return chainable({
            data: [{ id: 'sig-1', order_index: 0, status: 'signed', name: 'Sig One', email: 'sig@x.com', phone: null }],
            error: null,
          })
        case 5: // finalizeDocument's own signers(*) select
          return chainable({ data: [{ id: 'sig-1', signature_png: null }], error: null })
        default:
          return chainable({ data: null, error: null })
      }
    }
    if (table === 'documents') {
      documentsCallCount++
      if (documentsCallCount === 1) return chainable({ data: currentDoc, error: null })
      return chainable({ data: null, error: null }) // finalizeDocument's status update
    }
    if (table === 'document_fields') {
      documentFieldsCallCount++
      return chainable({ data: [], error: null }) // no unfilled required fields / nothing to stamp
    }
    if (table === 'tenant_domains') {
      return chainable({ data: tenantDomainsRows, error: null })
    }
    throw new Error(`unexpected table: ${table}`)
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => supabaseFromImpl(table),
    storage: {
      from: () => ({
        download: vi.fn(async () => ({ data: fakeBlob })),
        upload: vi.fn(async () => ({ data: {}, error: null })),
      }),
    },
  },
}))

function fakeRequest(body: Record<string, unknown>): Request {
  return {
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  sendEmail.mockClear()
  tenantDomainsRows = []
  currentDoc = DOC
  supabaseFromImpl = buildSupabaseFrom()
})

describe("POST /api/documents/public/[token]/sign — completion-copy receipt uses the TENANT's own email credentials", () => {
  it("sends the final signed-copy receipt with the tenant's resend_api_key + email_from, not the platform default", async () => {
    const { POST } = await import('./route')
    const res = await POST(
      fakeRequest({
        signature_png: 'data:image/png;base64,' + 'a'.repeat(120),
        signature_name: 'Sig One',
        field_values: [],
      }),
      { params: Promise.resolve({ token: 'tok-1' }) }
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.all_done).toBe(true)

    expect(sendEmail).toHaveBeenCalledTimes(1)
    const call = sendEmail.mock.calls[0][0]
    expect(call.to).toBe('sig@x.com')
    expect(call.from).toBe(TENANT.email_from)
    expect(call.resendApiKey).toBe(`decrypted:${TENANT.resend_api_key}`)
  })
})

/**
 * fromEmail bug-class probe: sendCompletionCopies's fromEmail fallback
 * (fires only when email_from is unset) was built from `docs@${tenant.domain
 * || 'fullloopcrm.com'}` — NOT a tenant_domains-resolver-precedence gap, a
 * distinct bug: a tenant's site domain is never verified with Resend for
 * SENDING (only tenants.email_from, paired with the admin-configured
 * tenants.resend_domain verification flow, is). Using any resolved site
 * domain here would break deliverability on the single highest-stakes email
 * in the whole signing flow. Fixed via tenantSender(), the established
 * helper every other notify path already routes through.
 */
describe('POST /api/documents/public/[token]/sign — sendCompletionCopies fromEmail bug-class probe', () => {
  it('fromEmail uses tenantSender(): no email_from set — falls back to the tenant-identified platform apex, NOT any tenant_domains/tenants.domain value', async () => {
    currentDoc = { ...DOC, tenants: { ...TENANT, domain: null, email_from: null } }
    tenantDomainsRows = [{ tenant_id: 'tid-a', domain: 'custom.example.com', is_primary: true, active: true }]
    const { POST } = await import('./route')
    const res = await POST(
      fakeRequest({ signature_png: 'data:image/png;base64,' + 'a'.repeat(120), signature_name: 'Sig One', field_values: [] }),
      { params: Promise.resolve({ token: 'tok-1' }) }
    )
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0]
    expect(call.from).toBe('Acme Cleaning <acme-cleaning@fullloopcrm.com>')
  })

  it('fromEmail uses tenant.email_from when set, ignoring tenant_domains/tenants.domain entirely', async () => {
    currentDoc = { ...DOC, tenants: { ...TENANT, domain: null, email_from: 'docs@acme-verified.com' } }
    tenantDomainsRows = [{ tenant_id: 'tid-a', domain: 'custom.example.com', is_primary: true, active: true }]
    const { POST } = await import('./route')
    const res = await POST(
      fakeRequest({ signature_png: 'data:image/png;base64,' + 'a'.repeat(120), signature_name: 'Sig One', field_values: [] }),
      { params: Promise.resolve({ token: 'tok-1' }) }
    )
    expect(res.status).toBe(200)
    const call = sendEmail.mock.calls[0][0]
    expect(call.from).toBe('docs@acme-verified.com')
  })
})
