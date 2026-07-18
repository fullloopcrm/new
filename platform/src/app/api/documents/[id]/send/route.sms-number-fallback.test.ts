import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/documents/[id]/send — sms_number carry-forward fix.
 *
 * BUG (fixed here): the signer SMS invite read tenant.telnyx_api_key/
 * telnyx_phone directly, bypassing resolveTenantSmsCredentials()'s
 * telnyx_phone||sms_number precedence — same shape as invoices/quotes send.
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
type SendSmsArgs = { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }
const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async (_args: SendSmsArgs) => ({ ok: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ ok: true })), tenantSender: () => 'docs@acme.example.com' }))
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
      { id: 'sig-1', tenant_id: A, document_id: 'd-a', order_index: 0, status: 'pending', name: 'Sig One', email: null, phone: '+15559990001', public_token: 'tok-sig-1' },
    ],
    document_fields: [{ id: 'f-1', tenant_id: A, document_id: 'd-a' }],
    tenants: [
      {
        id: A, name: 'Acme', slug: 'acme', domain: null,
        telnyx_api_key: 'enc:acme-key', telnyx_phone: null, sms_number: '+15551110001',
        resend_api_key: null, email_from: null,
      },
      {
        id: B, name: 'Other', slug: 'other', domain: null,
        telnyx_api_key: 'enc:other-key', telnyx_phone: '+15552220002', sms_number: null,
        resend_api_key: null, email_from: null,
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.sendSMS.mockClear()
})

function post(id: string) {
  return POST(new Request('http://t', { method: 'POST' }), { params: Promise.resolve({ id }) })
}

describe('POST /api/documents/[id]/send — sms_number fallback', () => {
  it('telnyx_phone is null but sms_number is set — signer SMS still sends via the legacy-column fallback', async () => {
    const res = await post('d-a')
    expect(res.status).toBe(200)
    expect(spies.sendSMS).toHaveBeenCalledTimes(1)
    expect(spies.sendSMS.mock.calls[0][0].telnyxPhone).toBe('+15551110001')
  })

  it("wrong-tenant probe: tenant B's telnyx_phone never leaks into tenant A's sms_number-fallback send", async () => {
    await post('d-a')
    const call = spies.sendSMS.mock.calls[0][0]
    expect(call.telnyxPhone).not.toBe('+15552220002')
    expect(call.telnyxApiKey).not.toBe('other-key')
  })
})
