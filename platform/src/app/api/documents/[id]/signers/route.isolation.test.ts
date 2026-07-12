import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/documents/[id]/signers (converted to tenantDb).
 *
 * Signers carry PII (name/email/phone) and a `public_token`. The list read goes
 * through tenantDb, which injects `.eq('tenant_id', ctx)`. Listing signers for
 * ANOTHER tenant's document id must return an EMPTY list — the foreign signer
 * rows (and their tokens) must never appear. That is the wrong-tenant probe.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { GET } from './route'

function seed() {
  return {
    document_signers: [
      { id: 'sig-a', tenant_id: CTX_TENANT, document_id: 'doc-a', name: 'A Signer', email: 'a@a.com', order_index: 1, public_token: 'tok-a' },
      { id: 'sig-b', tenant_id: OTHER_TENANT, document_id: 'doc-b', name: 'B Signer', email: 'b@b.com', order_index: 1, public_token: 'tok-b' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function list(id: string) {
  return GET(new Request('http://t/api/documents/' + id + '/signers'), { params: Promise.resolve({ id }) })
}

describe('documents/[id]/signers GET — tenant isolation', () => {
  it('positive control: tenant A lists signers for its OWN document', async () => {
    const res = await list('doc-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signers.map((s: { id: string }) => s.id)).toEqual(['sig-a'])
  })

  it("wrong-tenant probe: listing tenant B's document id returns no signers, never B's tokens", async () => {
    const res = await list('doc-b')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signers).toEqual([])
    // Belt-and-braces: tenant B's PII/token never appears in the response.
    expect(JSON.stringify(body)).not.toContain('tok-b')
    expect(JSON.stringify(body)).not.toContain('b@b.com')
  })
})
