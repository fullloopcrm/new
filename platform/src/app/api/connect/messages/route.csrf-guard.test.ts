import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/connect/messages upserts a read cursor as a side effect of
 * loading a channel's messages. Gated by cookie-based tenant auth
 * (SameSite=Lax), so a forged cross-site GET navigation could silently flip
 * read-cursor state — see csrf-guard.ts. Proves the write is skipped
 * cross-site and still runs same-origin / when the header is absent (older
 * client).
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  userId: 'user-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string; userId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A', owner_name: null }, userId: h.userId }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

const getReq = (secFetchSite: string | null) =>
  new NextRequest('http://x/api/connect/messages?channel_id=chA', {
    headers: secFetchSite !== null ? { 'sec-fetch-site': secFetchSite } : {},
  })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    connect_channels: [{ id: 'chA', tenant_id: 'tenant-A', name: 'A General' }],
    connect_messages: [],
    connect_read_cursors: [],
  }
})

describe('GET /api/connect/messages — cross-site read-cursor guard', () => {
  it('skips the read-cursor write when Sec-Fetch-Site is cross-site', async () => {
    const res = await GET(getReq('cross-site'))
    expect(res.status).toBe(200)
    expect(h.store.connect_read_cursors).toHaveLength(0)
  })

  it('CONTROL: still upserts the read cursor for a same-origin request', async () => {
    const res = await GET(getReq('same-origin'))
    expect(res.status).toBe(200)
    expect(h.store.connect_read_cursors).toHaveLength(1)
  })

  it('CONTROL: still upserts the read cursor when Sec-Fetch-Site is absent (older client)', async () => {
    const res = await GET(getReq(null))
    expect(res.status).toBe(200)
    expect(h.store.connect_read_cursors).toHaveLength(1)
  })
})
