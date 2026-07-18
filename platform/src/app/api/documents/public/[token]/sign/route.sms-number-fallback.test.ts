import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/documents/public/[token]/sign — sendSigningInviteToSigner
 * sms_number carry-forward fix. Same bug/fix shape as the sibling
 * invoices/quotes/documents send routes: the next-signer SMS invite read
 * tenant.telnyx_api_key/telnyx_phone directly, bypassing
 * resolveTenantSmsCredentials()'s telnyx_phone||sms_number precedence.
 */

type SendSmsArgs = { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }
const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async (_args: SendSmsArgs) => ({})) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({})), tenantSender: () => 'docs@acme.example.com' }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 9 })) }))
vi.mock('@/lib/documents', () => ({
  canSignerAct: vi.fn(() => true),
  documentSignedPath: vi.fn(() => 'tenant-a/doc-1/signed.pdf'),
  DOCUMENTS_BUCKET: 'documents',
  logDocEvent: vi.fn(async () => {}),
  sha256Hex: vi.fn(() => 'deadbeef'),
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: vi.fn((v: string) => v) }))
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

const SIGNER = {
  id: 'sig-1', document_id: 'doc-1', order_index: 0, status: 'sent',
  consent_accepted_at: '2026-07-17T00:00:00Z', name: 'Sig One', email: null,
  phone: '+15550001111', public_token: 'tok-1', signature_png: null,
}

function buildDoc(tenant: { telnyx_api_key: string | null; telnyx_phone: string | null; sms_number: string | null }) {
  return {
    id: 'doc-1', tenant_id: 'tid-a', title: 'Service Agreement',
    original_path: 'tenant-a/doc-1/original.pdf', original_sha256: null,
    consent_text: '', sign_order: 'sequential', status: 'sent',
    tenants: {
      name: 'Acme', domain: 'acme.example.com', slug: 'acme',
      telnyx_api_key: tenant.telnyx_api_key, telnyx_phone: tenant.telnyx_phone,
      sms_number: tenant.sms_number, resend_api_key: null, email_from: 'docs@acme.example.com',
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
        case 3: // atomic claim
          return chainable({ data: { id: 'sig-1' }, error: null })
        case 4: // sequential post-claim guard
          return chainable({ data: [], error: null })
        case 5: // freshSigners after claim — sig-2 still pending, has a phone
          return chainable({
            data: [
              { id: 'sig-1', order_index: 0, status: 'signed', name: 'Sig One', email: null, phone: '+15550001111' },
              { id: 'sig-2', order_index: 1, status: 'pending', name: 'Sig Two', email: null, phone: '+15559990002' },
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
      return chainable({ data: null, error: null })
    }
    if (table === 'document_fields') {
      return chainable({ data: [], error: null })
    }
    if (table === 'tenant_domains') {
      return chainable({ data: [], error: null })
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
  spies.sendSMS.mockClear()
  supabaseFromImpl = buildSupabaseFrom()
})

describe('POST /api/documents/public/[token]/sign — sendSigningInviteToSigner sms_number fallback', () => {
  it('telnyx_phone is null but sms_number is set — next-signer SMS still sends via the legacy-column fallback', async () => {
    doc = buildDoc({ telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15551110001' })
    const res = await sign()
    expect(res.status).toBe(200)
    expect(spies.sendSMS).toHaveBeenCalledTimes(1)
    const call = spies.sendSMS.mock.calls[0][0]
    expect(call.to).toBe('+15559990002')
    expect(call.telnyxPhone).toBe('+15551110001')
  })

  it('neither telnyx_phone nor sms_number set — SMS invite is skipped, not sent with an empty phone', async () => {
    doc = buildDoc({ telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: null })
    const res = await sign()
    expect(res.status).toBe(200)
    expect(spies.sendSMS).not.toHaveBeenCalled()
  })
})
