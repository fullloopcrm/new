import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/notifications?mark_read=true marks admin notifications read as a
 * side effect of loading the list. Gated by cookie-based tenant auth
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn() }))

import { GET } from './route'

const getReq = (secFetchSite: string | null) =>
  new NextRequest('http://x/api/notifications?mark_read=true', {
    headers: secFetchSite !== null ? { 'sec-fetch-site': secFetchSite } : {},
  })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    notifications: [
      { id: 'nA1', tenant_id: 'tenant-A', recipient_type: 'admin', metadata: {}, created_at: '2026-01-02' },
    ],
  }
})

describe('GET /api/notifications — cross-site mark-read guard', () => {
  it('skips the mark-read write when Sec-Fetch-Site is cross-site', async () => {
    const res = await GET(getReq('cross-site'))
    expect(res.status).toBe(200)
    const n = h.store.notifications.find((x) => x.id === 'nA1')!
    expect((n.metadata as Record<string, unknown>).read).toBeUndefined()
  })

  it('CONTROL: still marks read for a same-origin request', async () => {
    const res = await GET(getReq('same-origin'))
    expect(res.status).toBe(200)
    const n = h.store.notifications.find((x) => x.id === 'nA1')!
    expect((n.metadata as Record<string, unknown>).read).toBe(true)
  })

  it('CONTROL: still marks read when Sec-Fetch-Site is absent (older client)', async () => {
    const res = await GET(getReq(null))
    expect(res.status).toBe(200)
    const n = h.store.notifications.find((x) => x.id === 'nA1')!
    expect((n.metadata as Record<string, unknown>).read).toBe(true)
  })
})
