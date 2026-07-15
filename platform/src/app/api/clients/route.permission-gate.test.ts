import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/clients and GET /api/clients/[id] called getTenantForRequest()
 * directly with zero requirePermission check -- unlike their own siblings
 * (POST/PUT/DELETE already require clients.create/edit/delete). Any
 * authenticated tenant member, regardless of the tenant's own clients.view
 * RBAC override, could list/read every client's full PII (name, phone,
 * email, address, notes) -- same bug class already fixed on a sibling
 * branch (p1-w3, commit 97f7eedb) but never ported here.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  // The shared fake has no `.range()` (GET's pagination call) — a no-op
  // pass-through is enough since the fake never paginates anyway.
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      chain.range = () => chain
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

const FORBIDDEN = { tenant: null, error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) }
const allow = () => ({ tenant: { tenantId: h.tenantId }, error: null })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => allow())
  h.store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Pat', email: 'pat@example.com', phone: '5551234567' },
    ],
  }
})

describe('GET /api/clients — clients.view permission gate', () => {
  it('returns the permission error unchanged and never reads clients when denied', async () => {
    h.requirePermission.mockResolvedValueOnce(FORBIDDEN)
    const { GET } = await import('./route')

    const res = await GET(new NextRequest('http://x'))

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('clients.view')
  })

  it('allows the call through and returns tenant-scoped clients when granted', async () => {
    const { GET } = await import('./route')

    const res = await GET(new NextRequest('http://x'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.clients).toHaveLength(1)
  })
})

describe('GET /api/clients/[id] — clients.view permission gate', () => {
  it('returns the permission error unchanged when denied', async () => {
    h.requirePermission.mockResolvedValueOnce(FORBIDDEN)
    const { GET } = await import('./[id]/route')

    const res = await GET(new Request('http://x'), { params: Promise.resolve({ id: 'client-A1' }) })

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('clients.view')
  })

  it('allows the call through when granted', async () => {
    const { GET } = await import('./[id]/route')

    const res = await GET(new Request('http://x'), { params: Promise.resolve({ id: 'client-A1' }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.client.id).toBe('client-A1')
  })
})
