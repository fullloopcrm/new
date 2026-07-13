import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — portal/connect/route.ts (docs/adr/0004).
 * REAL GAP CLOSED: connect_messages reads/writes and connect_read_cursors
 * upserts previously carried NO tenant_id filter at all — only channel_id.
 * Proves a portal token for tenant A resolves ONLY tenant A's channel (even
 * against an identical type+client_id row under tenant B) and that its
 * message list/insert never cross into tenant B's channel of the same id.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_CLIENT_ID = 'client-shared'
const SHARED_CHANNEL_ID = 'chan-shared'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(method = 'GET', body?: unknown): Request {
  return new Request('http://x/api/portal/connect', {
    method,
    headers: { authorization: 'Bearer whatever' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: SHARED_CLIENT_ID, tid: A_ID }
  // Both channels share type + client_id + id — only tenant_id tells them apart.
  fake._seed('connect_channels', [
    { id: SHARED_CHANNEL_ID, tenant_id: A_ID, type: 'client', client_id: SHARED_CLIENT_ID },
    { id: SHARED_CHANNEL_ID, tenant_id: B_ID, type: 'client', client_id: SHARED_CLIENT_ID },
  ])
  fake._seed('connect_messages', [
    { id: 'msg-a1', channel_id: SHARED_CHANNEL_ID, tenant_id: A_ID, body: 'A message', created_at: '2026-01-01' },
    { id: 'msg-b1', channel_id: SHARED_CHANNEL_ID, tenant_id: B_ID, body: 'B message', created_at: '2026-01-02' },
  ])
  fake._seed('clients', [{ id: SHARED_CLIENT_ID, name: 'Shared Client', tenant_id: A_ID }])
})

describe('portal/connect GET — tenantDb isolation', () => {
  it("tenant A's portal token reads ONLY tenant A's messages on the same-id channel", async () => {
    const res = await GET(req() as never)
    const body = await res.json()
    const bodies = body.messages.map((m: { body: string }) => m.body)
    expect(bodies).toContain('A message')
    expect(bodies).not.toContain('B message')
  })
})

describe('portal/connect POST — tenantDb isolation', () => {
  it("tenant A's new message is inserted under tenant A's channel row, never leaking into tenant B's", async () => {
    const res = await POST(req('POST', { body: 'new from A' }) as never)
    expect(res.status).toBe(201)

    const bMessages = fake._all('connect_messages').filter((r) => r.tenant_id === B_ID)
    expect(bMessages).toHaveLength(1)
    expect(bMessages[0].body).toBe('B message')

    const aMessages = fake._all('connect_messages').filter((r) => r.tenant_id === A_ID)
    expect(aMessages.some((m) => m.body === 'new from A')).toBe(true)
  })
})
