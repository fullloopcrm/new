/**
 * POST /api/documents/public/[token]/sign — the decline/consent routes on
 * this same doc both re-check the PARENT document's status before acting
 * ("Prevent re-opening a terminal-state document" — decline/route.ts), but
 * sign/route.ts never did. Voiding/expiring a document only updates the
 * `documents` row, not `document_signers` — so a signer whose link was
 * still open could sign a voided document, and finalizeDocument() would
 * then stamp it 'completed', silently reviving a document the tenant
 * explicitly voided.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/documents', async () => {
  const actual = await vi.importActual<typeof import('@/lib/documents')>('@/lib/documents')
  return { ...actual, logDocEvent: vi.fn(async () => {}) }
})
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: vi.fn(() => 'decrypted') }))

import { POST } from './route'
import { logDocEvent } from '@/lib/documents'

const TOKEN = 'tok-signer-1'
const SIGNATURE_PNG = `data:image/png;base64,${'A'.repeat(120)}`

const signReq = (body: unknown) =>
  new Request(`http://acme.example.com/api/documents/public/${TOKEN}/sign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  })
const params = { params: Promise.resolve({ token: TOKEN }) }
const validBody = { signature_png: SIGNATURE_PNG, signature_name: 'Jane Signer', field_values: [] }

beforeEach(() => {
  vi.mocked(logDocEvent).mockClear()
  h.seq = 0
  h.store = {
    document_signers: [
      { id: 'sig-1', document_id: 'doc-1', public_token: TOKEN, order_index: 0, status: 'sent', consent_accepted_at: '2026-01-01T00:00:00.000Z' },
      { id: 'sig-2', document_id: 'doc-1', order_index: 1, status: 'sent', consent_accepted_at: '2026-01-01T00:00:00.000Z' },
    ],
    documents: [{ id: 'doc-1', tenant_id: 'tenant-A', title: 'Test Doc', sign_order: 'parallel', status: 'sent', tenants: null }],
    document_fields: [],
  }
})

describe('POST /api/documents/public/[token]/sign', () => {
  it.each(['voided', 'declined', 'expired', 'completed'])(
    'rejects signing when the parent document is %s',
    async (status) => {
      h.store.documents[0].status = status
      const res = await POST(signReq(validBody), params)

      expect(res.status).toBe(400)
      expect(h.store.document_signers[0].status).toBe('sent')
      expect(logDocEvent).not.toHaveBeenCalled()
    },
  )

  it('still allows signing a live (non-terminal) document', async () => {
    const res = await POST(signReq(validBody), params)

    expect(res.status).toBe(200)
    expect(h.store.document_signers[0].status).toBe('signed')
    await expect(res.json()).resolves.toMatchObject({ ok: true, all_done: false })
  })
})
