import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/documents/[id]/duplicate (converted to tenantDb).
 *
 * The source document is read through tenantDb (`.eq('tenant_id', ctx)`), so a
 * document owned by ANOTHER tenant is invisible and duplication 404s before any
 * copy work — no title/PII/PDF of a foreign document can be cloned into the
 * caller's tenant. Positive control duplicates the caller's OWN document and
 * asserts the new draft row is stamped with the acting tenant.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({
  from: null as null | Harness['from'],
  storage: {
    from: () => ({
      download: async () => ({ data: null }),
      upload: async () => ({ data: null, error: null }),
    }),
  },
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t), storage: holder.storage },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/documents', () => ({
  DOCUMENTS_BUCKET: 'documents',
  documentOriginalPath: (tenantId: string, docId: string) => `docs/${tenantId}/${docId}`,
  generateSignerToken: () => 'signer-tok',
  logDocEvent: vi.fn(async () => {}),
}))

import { POST } from './route'

function seed() {
  return {
    documents: [
      { id: 'doc-a', tenant_id: A, title: 'Contract A', message: 'm', status: 'sent', original_path: 'docs/a/doc-a', page_count: 1 },
      { id: 'doc-b', tenant_id: B, title: 'SECRET B', message: 'm', status: 'sent', original_path: 'docs/b/doc-b', page_count: 1 },
    ],
    document_signers: [] as Record<string, unknown>[],
    document_fields: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function dup(id: string) {
  return POST(new Request('http://t/api/documents/dup', { method: 'POST' }), { params: Promise.resolve({ id }) })
}

describe('documents/[id]/duplicate POST — tenant isolation', () => {
  it("positive control: duplicating the caller's own document creates a stamped copy", async () => {
    const res = await dup('doc-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.document.title).toBe('Contract A (copy)')
    const ins = h.capture.inserts.find((i) => i.table === 'documents')
    expect(ins).toBeDefined()
    expect(ins!.rows.every((r) => r.tenant_id === A)).toBe(true)
  })

  it("wrong-tenant probe: a foreign tenant's document 404s — nothing is cloned", async () => {
    const res = await dup('doc-b')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Not found')
    // No document was inserted for the acting tenant off of tenant B's source.
    expect(h.capture.inserts.find((i) => i.table === 'documents')).toBeUndefined()
  })
})
