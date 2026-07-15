import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/documents/[id] (converted to tenantDb).
 *
 * Reads a document by id via tenantDb + explicit `.eq('tenant_id', tenantId)`.
 * A foreign tenant's document must never surface: `.single()` matches nothing,
 * PGRST116 re-throws before any storage/signed-URL work, and the body carries no
 * document. supabaseAdmin.storage is stubbed so the positive control (which does
 * mint a signed URL) can run under the in-memory harness.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: 'https://signed/x' }, error: null }),
      }),
    },
  },
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError, getTenantForRequest: vi.fn() }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { GET } from './route'

function seed() {
  return {
    documents: [
      { id: 'doc-a', tenant_id: CTX_TENANT, status: 'draft', original_path: 'a/orig.pdf', signed_path: null },
      { id: 'doc-b', tenant_id: OTHER_TENANT, status: 'draft', original_path: 'b/orig.pdf', signed_path: null },
    ],
    document_signers: [],
    document_fields: [],
    document_activity: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('documents/[id] GET — tenant isolation', () => {
  it('positive control: tenant A can read its OWN document', async () => {
    const res = await GET(new Request('http://t/api/documents/doc-a'), ctx('doc-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.document.id).toBe('doc-a')
    expect(body.document.tenant_id).toBe(CTX_TENANT)
  })

  it("wrong-tenant probe: fetching tenant B's document never returns the row", async () => {
    const res = await GET(new Request('http://t/api/documents/doc-b'), ctx('doc-b'))
    expect(res.status).not.toBe(200)
    const body = await res.json()
    expect(body.document).toBeUndefined()
  })
})
