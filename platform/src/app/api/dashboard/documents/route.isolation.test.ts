import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/documents — tenantDb() wrong-tenant probe. New generic
 * client/tenant document-attachment feature. Proves a document created
 * under tenant A can never be read (GET) or deleted (DELETE) by a request
 * scoped to tenant B, even when tenant B supplies tenant A's real document
 * id (mirrors the onboarding/profile isolation test's style).
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    userId: 'user-1',
    tenantId: h.tenantId,
    tenant: { id: h.tenantId, name: 'Tenant', selena_config: {} },
    role: 'owner',
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: async () => null, // not exercised by the dashboard-session tests below
}))

import { GET, POST, DELETE } from './route'

// Route handlers are typed against NextRequest but only use .nextUrl and
// .json() -- a plain Request with .nextUrl bolted on is enough here.
class NextRequestLike extends Request {
  get nextUrl() {
    return new URL(this.url)
  }
}

const getReq = (qs = '') => new NextRequestLike(`http://x/api/dashboard/documents${qs}`)
const deleteReq = (qs: string) => new NextRequestLike(`http://x/api/dashboard/documents${qs}`, { method: 'DELETE' })
const postReq = (body: unknown) =>
  new NextRequestLike('http://x/api/dashboard/documents', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    clients: [
      { id: 'cli-A1', tenant_id: 'tenant-A', name: 'Client A' },
      { id: 'cli-B1', tenant_id: 'tenant-B', name: 'Client B' },
    ],
    client_documents: [
      { id: 'doc-A1', tenant_id: 'tenant-A', client_id: null, file_name: 'tenant-a-proposal.pdf', file_url: 'https://x/a-proposal.pdf', created_at: '2026-01-01T00:00:00Z' },
      { id: 'doc-A2', tenant_id: 'tenant-A', client_id: 'cli-A1', file_name: 'a-client-doc.pdf', file_url: 'https://x/a-client-doc.pdf', created_at: '2026-01-02T00:00:00Z' },
      { id: 'doc-B1', tenant_id: 'tenant-B', client_id: null, file_name: 'secret-tenant-b.pdf', file_url: 'https://x/secret.pdf', created_at: '2026-01-01T00:00:00Z' },
    ],
  }
})

describe('GET /api/dashboard/documents — tenant isolation', () => {
  it("tenant A's tenant-level list contains its own doc, not tenant B's", async () => {
    const res = await GET(getReq() as never)
    const json = await res.json()
    expect(json.documents.map((d: { id: string }) => d.id)).toEqual(['doc-A1'])
  })

  it("tenant B's tenant-level list never contains tenant A's document", async () => {
    h.tenantId = 'tenant-B'
    const res = await GET(getReq() as never)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('doc-A1')
    expect(JSON.stringify(json)).not.toContain('tenant-a-proposal')
  })

  it("tenant B querying with tenant A's real client_id still returns nothing (tenant_id scoping wins over a forged client_id match)", async () => {
    h.tenantId = 'tenant-B'
    const res = await GET(getReq('?client_id=cli-A1') as never)
    const json = await res.json()
    expect(json.documents).toEqual([])
  })

  it("tenant A's client-scoped list returns its own client's document", async () => {
    const res = await GET(getReq('?client_id=cli-A1') as never)
    const json = await res.json()
    expect(json.documents.map((d: { id: string }) => d.id)).toEqual(['doc-A2'])
  })
})

describe('POST /api/dashboard/documents — tenant isolation', () => {
  it("a document created by tenant B is stamped with tenant B's tenant_id, never tenant A's", async () => {
    h.tenantId = 'tenant-B'
    const res = await POST(postReq({ file_name: 'b-file.pdf', file_url: 'https://x/b-file.pdf' }) as never)
    expect(res.status).toBe(200)
    const created = h.store.client_documents.find((d) => d.file_name === 'b-file.pdf')
    expect(created?.tenant_id).toBe('tenant-B')
  })

  it("tenant B cannot attach a document to tenant A's client_id (forged client_id is rejected as not found)", async () => {
    h.tenantId = 'tenant-B'
    const res = await POST(postReq({ client_id: 'cli-A1', file_name: 'x.pdf', file_url: 'https://x/x.pdf' }) as never)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/dashboard/documents — tenant isolation', () => {
  it("tenant B cannot delete tenant A's document via a forged id", async () => {
    h.tenantId = 'tenant-B'
    const before = h.store.client_documents.length
    await DELETE(deleteReq('?id=doc-A1') as never)
    // The row must still exist -- tenantDb's auto tenant_id scoping must have
    // blocked the delete regardless of what the response body/status says.
    expect(h.store.client_documents.length).toBe(before)
    expect(h.store.client_documents.find((d) => d.id === 'doc-A1')).toBeTruthy()
  })

  it("tenant A can delete its own document", async () => {
    await DELETE(deleteReq('?id=doc-A1') as never)
    expect(h.store.client_documents.find((d) => d.id === 'doc-A1')).toBeUndefined()
  })
})
