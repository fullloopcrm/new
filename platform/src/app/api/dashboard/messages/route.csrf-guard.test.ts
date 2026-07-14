import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/dashboard/messages marks admin→owner messages read as a side
 * effect of loading the thread. Gated by cookie-based tenant auth
 * (SameSite=Lax), so a forged cross-site GET navigation could silently flip
 * read-state — see csrf-guard.ts. Proves the write is skipped cross-site and
 * still runs same-origin / when the header is absent (older client).
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' }, userId: 'user-A' }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

const getReq = (secFetchSite: string | null) =>
  new NextRequest('http://x/api/dashboard/messages', {
    headers: secFetchSite !== null ? { 'sec-fetch-site': secFetchSite } : {},
  })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    tenant_owner_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', direction: 'out', channel: 'platform', body: 'hi A', sender: 'admin', sender_role: 'admin', created_at: '2026-01-01', read_at: null },
    ],
  }
})

describe('GET /api/dashboard/messages — cross-site mark-read guard', () => {
  it('skips the mark-read write when Sec-Fetch-Site is cross-site', async () => {
    const res = await GET(getReq('cross-site'))
    expect(res.status).toBe(200)
    expect(h.store.tenant_owner_messages.find((m) => m.id === 'msg-A1')?.read_at).toBeNull()
  })

  it('CONTROL: still marks read for a same-origin request', async () => {
    const res = await GET(getReq('same-origin'))
    expect(res.status).toBe(200)
    expect(h.store.tenant_owner_messages.find((m) => m.id === 'msg-A1')?.read_at).not.toBeNull()
  })

  it('CONTROL: still marks read when Sec-Fetch-Site is absent (older client)', async () => {
    const res = await GET(getReq(null))
    expect(res.status).toBe(200)
    expect(h.store.tenant_owner_messages.find((m) => m.id === 'msg-A1')?.read_at).not.toBeNull()
  })
})
