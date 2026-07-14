import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/admin/tenant-chats?tenant_id=... marks inbound owner messages read
 * as a side effect of loading a thread. Gated by requireAdmin() (admin_token,
 * SameSite=Lax), so the same forged-cross-site-GET risk applies — see
 * route.ts and csrf-guard.ts. Proves the write is skipped cross-site and
 * still runs same-origin / when the header is absent (older client).
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requireAdmin: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requireAdmin: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))

import { GET } from './route'

const getReq = (secFetchSite: string | null) =>
  new NextRequest('http://x/api/admin/tenant-chats?tenant_id=tenant-A', {
    headers: secFetchSite !== null ? { 'sec-fetch-site': secFetchSite } : {},
  })

beforeEach(() => {
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', slug: 'acme', owner_name: 'Alice', owner_email: 'alice@x.com', owner_phone: null, status: 'active' }],
    tenant_owner_messages: [
      { id: 'm-1', tenant_id: 'tenant-A', direction: 'in', channel: 'platform', body: 'hi', sender: 'owner', read_at: null, created_at: '2026-01-01' },
    ],
  }
})

describe('admin/tenant-chats GET — cross-site mark-read guard', () => {
  it('skips the mark-read write when Sec-Fetch-Site is cross-site', async () => {
    const res = await GET(getReq('cross-site'))
    expect(res.status).toBe(200)
    expect(h.store.tenant_owner_messages.find((m) => m.id === 'm-1')?.read_at).toBeNull()
  })

  it('CONTROL: still marks read for a same-origin request', async () => {
    const res = await GET(getReq('same-origin'))
    expect(res.status).toBe(200)
    expect(h.store.tenant_owner_messages.find((m) => m.id === 'm-1')?.read_at).not.toBeNull()
  })

  it('CONTROL: still marks read when Sec-Fetch-Site is absent (older client)', async () => {
    const res = await GET(getReq(null))
    expect(res.status).toBe(200)
    expect(h.store.tenant_owner_messages.find((m) => m.id === 'm-1')?.read_at).not.toBeNull()
  })
})
