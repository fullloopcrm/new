import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-document/cross-tenant signer_id FK injection on
 * POST + PUT /api/documents/[id]/fields.
 *
 * UNCONVERTED route (raw `supabaseAdmin`). `signer_id` is a caller-supplied
 * FK into `document_signers` with NO ownership check before insert —
 * `document_signers` has no cross-document FK constraint, so any signer_id
 * (including one from a completely different tenant's document) was accepted
 * verbatim. This isn't just a dangling reference: `sign/route.ts` resolves
 * and updates field VALUES by `.eq('id', field_id).eq('signer_id', signer.id)`
 * with no document_id scope, so a planted field whose signer_id matches a
 * real signer would let that signer's own sign submission silently write a
 * value into a field row that lives on someone else's document.
 *
 * FIXED: both POST (single field) and PUT (bulk replace) now verify every
 * signer_id belongs to THIS document (and tenant) before any row is written;
 * a miss 404s before the insert/delete+insert runs.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { POST, PUT } from './route'

function seed() {
  return {
    documents: [
      { id: 'doc-a', tenant_id: CTX_TENANT, status: 'draft' },
    ],
    document_signers: [
      { id: 'signer-a', tenant_id: CTX_TENANT, document_id: 'doc-a', name: 'Alpha Signer' },
      { id: 'signer-b', tenant_id: OTHER_TENANT, document_id: 'doc-b', name: 'Victim Signer' },
    ],
    document_fields: [] as Record<string, unknown>[],
  }
}

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

const validField = {
  type: 'text' as const,
  page: 1,
  x_pct: 10,
  y_pct: 10,
  w_pct: 20,
  h_pct: 5,
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('documents/[id]/fields POST — signer_id FK injection WITNESS', () => {
  it('LOCK: a foreign signer_id (another tenant\'s document) is rejected (404), no field inserted', async () => {
    const res = await POST(req({ ...validField, signer_id: 'signer-b' }), ctx('doc-a'))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find(i => i.table === 'document_fields')).toBeUndefined()
  })

  it('LOCK: an unknown/garbage signer_id is rejected (404), no field inserted', async () => {
    const res = await POST(req({ ...validField, signer_id: 'does-not-exist' }), ctx('doc-a'))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find(i => i.table === 'document_fields')).toBeUndefined()
  })

  it('CONTROL: an own-document signer_id still creates the field', async () => {
    const res = await POST(req({ ...validField, signer_id: 'signer-a' }), ctx('doc-a'))
    expect(res.status).toBe(200)
    const row = h.capture.inserts.find(i => i.table === 'document_fields')!.rows[0]
    expect(row.signer_id).toBe('signer-a')
    expect(row.document_id).toBe('doc-a')
    expect(row.tenant_id).toBe(CTX_TENANT)
  })
})

describe('documents/[id]/fields PUT — signer_id FK injection WITNESS', () => {
  it('LOCK: a batch containing one foreign signer_id is rejected wholesale (404), no delete/insert happens', async () => {
    const res = await PUT(
      req({ fields: [{ ...validField, signer_id: 'signer-a' }, { ...validField, signer_id: 'signer-b' }] }),
      ctx('doc-a'),
    )
    expect(res.status).toBe(404)
    expect(h.capture.deletes.find(d => d.table === 'document_fields')).toBeUndefined()
    expect(h.capture.inserts.find(i => i.table === 'document_fields')).toBeUndefined()
  })

  it('CONTROL: a batch of only own-document signer_ids replaces the fields', async () => {
    const res = await PUT(req({ fields: [{ ...validField, signer_id: 'signer-a' }] }), ctx('doc-a'))
    expect(res.status).toBe(200)
    const row = h.capture.inserts.find(i => i.table === 'document_fields')!.rows[0]
    expect(row.signer_id).toBe('signer-a')
  })
})
