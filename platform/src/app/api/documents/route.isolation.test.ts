import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/documents (list, converted to tenantDb).
 *
 * The list read carries NO explicit tenant filter in the route; the only guard
 * is tenantDb.select injecting `.eq('tenant_id', ctx)`. So a document seeded for
 * another tenant must be ABSENT from the returned list. Positive control proves
 * rows do come back for the ctx tenant; the probe proves the foreign one does not.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t) },
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
      { id: 'doc-a', tenant_id: CTX_TENANT, title: 'A doc', status: 'draft', created_at: '2026-01-02' },
      { id: 'doc-b', tenant_id: OTHER_TENANT, title: 'B doc', status: 'draft', created_at: '2026-01-01' },
    ],
    document_signers: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('documents GET (list) — tenant isolation', () => {
  it('positive control: tenant A sees its OWN document in the list', async () => {
    const res = await GET(new Request('http://t/api/documents'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.documents.map((d: { id: string }) => d.id)
    expect(ids).toContain('doc-a')
  })

  it("wrong-tenant probe: tenant B's document is absent from the list", async () => {
    const res = await GET(new Request('http://t/api/documents'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.documents.map((d: { id: string }) => d.id)
    expect(ids).not.toContain('doc-b')
    expect(body.documents.every((d: { tenant_id: string }) => d.tenant_id === CTX_TENANT)).toBe(true)
  })
})
