import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/documents/[id]/send (converted to tenantDb).
 *
 * Sends a document out to its signers (PII egress + locks the doc). The document
 * is read through tenantDb (`.eq('tenant_id', ctx)`), so sending ANOTHER tenant's
 * document id must 404 before the status is flipped to `sent` or any invite goes
 * out. The contrast proves the read gate:
 *   • own doc (no signers yet)  → 400 "Add at least one signer" (doc WAS found)
 *   • foreign doc               → 404 "Not found" (doc filtered out)
 * In neither case is the doc status mutated.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({ AuthError: class AuthError extends Error { status = 401 } }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}), tenantSender: vi.fn() }))
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
      { id: 'd-b', tenant_id: B, status: 'draft', original_path: 'p/b.pdf', title: 'Agreement B', message: null, sign_order: 'parallel' },
    ],
    document_signers: [] as Record<string, any>[],
    document_fields: [] as Record<string, any>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(id: string) {
  return POST(new Request('http://t/api/documents/x/send', { method: 'POST' }), { params: Promise.resolve({ id }) })
}

describe('documents/[id]/send POST — tenant isolation', () => {
  it("positive control: own doc is FOUND (400 add-signer), status not flipped", async () => {
    const res = await post('d-a')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Add at least one signer before sending')
    expect(h.seed.documents.find((d) => d.id === 'd-a')!.status).toBe('draft')
  })

  it("wrong-tenant probe: sending tenant B's doc 404s — never marked sent", async () => {
    const res = await post('d-b')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Not found')
    expect(h.seed.documents.find((d) => d.id === 'd-b')!.status).toBe('draft')
    expect(h.capture.updates).toHaveLength(0)
  })
})
