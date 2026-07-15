/**
 * POST/PUT /api/documents/[id]/fields — cross-tenant signer_id FK-injection.
 *
 * signer_id was inserted into document_fields verbatim from the request body
 * with no check that the signer belongs to this document/tenant.
 * document_signers.id is a bare FK with its own tenant_id, so a foreign
 * signer_id planted a field that the public sign flow's field-value UPDATE
 * (`.eq('id', field_id).eq('signer_id', signer.id)`, no document_id filter)
 * could then be used to write into cross-tenant. Fixed by verifying signer_id
 * belongs to a signer of this tenant's document before insert/replace.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    documents: [
      { id: 'doc-A', tenant_id: TENANT_A, status: 'draft' },
    ],
    document_signers: [
      { id: 'signer-A', tenant_id: TENANT_A, document_id: 'doc-A', name: 'Alice' },
      { id: 'signer-B', tenant_id: TENANT_B, document_id: 'doc-B', name: 'Bob (other tenant)' },
    ],
    document_fields: [],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST, PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = Promise.resolve({ id: 'doc-A' })
const validField = { type: 'text', page: 1, x_pct: 10, y_pct: 10, w_pct: 10, h_pct: 5 }
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  fake._store.set('document_fields', [])
})

describe('POST /api/documents/[id]/fields — cross-tenant signer_id FK-injection guard', () => {
  it('LOCK: rejects a foreign signer_id (404), no document_fields row created', async () => {
    const res = await POST(postReq({ ...validField, signer_id: 'signer-B' }), { params })
    expect(res.status).toBe(404)
    expect(fake._all('document_fields').length).toBe(0)
  })

  it('CONTROL: own-tenant signer_id on this document succeeds', async () => {
    const res = await POST(postReq({ ...validField, signer_id: 'signer-A' }), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.field.signer_id).toBe('signer-A')
  })
})

describe('PUT /api/documents/[id]/fields — cross-tenant signer_id FK-injection guard', () => {
  it('LOCK: rejects a batch containing a foreign signer_id, existing fields untouched', async () => {
    fake._all('document_fields').push({ id: 'f-existing', tenant_id: TENANT_A, document_id: 'doc-A', signer_id: 'signer-A' } as never)
    const res = await PUT(putReq({ fields: [{ ...validField, signer_id: 'signer-B' }] }), { params })
    expect(res.status).toBe(404)
    expect(fake._all('document_fields').length).toBe(1)
  })

  it('CONTROL: batch of own-tenant signer_ids replaces fields', async () => {
    const res = await PUT(putReq({ fields: [{ ...validField, signer_id: 'signer-A' }] }), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.count).toBe(1)
  })
})
