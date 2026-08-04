import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/admin/tenant-chats/alerts — polled by the platform admin's
 * top-drop alert popup (TenantChatAlerts). Cross-tenant by design: an admin
 * needs to hear about ANY tenant owner messaging Loop Connect, not just
 * whichever tenant happens to be in view.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requireAdmin: vi.fn(),
})) as unknown as FakeStoreHandle & {
  requireAdmin: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))

import { GET } from './route'

const getReq = (qs = '') => new NextRequest(`http://x/api/test${qs}`)

beforeEach(() => {
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  h.store = {
    tenants: [
      { id: 'tenant-A', name: 'Acme Cleaning' },
      { id: 'tenant-B', name: 'Bright Homes' },
    ],
    tenant_owner_messages: [],
  }
})

describe('GET /api/admin/tenant-chats/alerts — permission gate', () => {
  it('returns the admin-gate error unchanged', async () => {
    h.requireAdmin.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }))
    const res = await GET(getReq('?since=2026-01-01T00:00:00.000Z'))
    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/tenant-chats/alerts', () => {
  it('requires since', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(400)
  })

  it('returns inbound owner->admin messages after since, across tenants, with tenant names attached', async () => {
    h.store.tenant_owner_messages = [
      { id: 'm1', tenant_id: 'tenant-A', direction: 'in', channel: 'platform', body: 'raw', body_en: 'Need help with a job', created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'm2', tenant_id: 'tenant-B', direction: 'in', channel: 'platform', body: 'Question about billing', body_en: null, created_at: '2026-01-02T01:00:00.000Z' },
    ]
    const res = await GET(getReq('?since=2026-01-01T00:00:00.000Z'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.alerts).toHaveLength(2)
    const byTenant = Object.fromEntries(data.alerts.map((a: { tenant_name: string; body: string }) => [a.tenant_name, a.body]))
    expect(byTenant['Acme Cleaning']).toBe('Need help with a job')
    // Falls back to raw body when no translated body_en exists yet.
    expect(byTenant['Bright Homes']).toBe('Question about billing')
  })

  it('excludes admin->owner messages (direction=out) and non-platform channels', async () => {
    h.store.tenant_owner_messages = [
      { id: 'm1', tenant_id: 'tenant-A', direction: 'out', channel: 'platform', body: 'Admin reply', body_en: null, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'm2', tenant_id: 'tenant-A', direction: 'in', channel: 'sms', body: 'Wrong channel', body_en: null, created_at: '2026-01-02T00:00:00.000Z' },
    ]
    const res = await GET(getReq('?since=2026-01-01T00:00:00.000Z'))
    const data = await res.json()
    expect(data.alerts).toHaveLength(0)
  })

  it('excludes messages at or before since', async () => {
    h.store.tenant_owner_messages = [
      { id: 'm1', tenant_id: 'tenant-A', direction: 'in', channel: 'platform', body: 'Old message', body_en: null, created_at: '2026-01-01T00:00:00.000Z' },
    ]
    const res = await GET(getReq('?since=2026-01-01T00:00:00.000Z'))
    const data = await res.json()
    expect(data.alerts).toHaveLength(0)
  })
})
