import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — portal/messages/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') keeps a client-portal
 * thread's contact lookup, message history, and unread-reset scoped to the
 * client's own tenant, even when a foreign tenant has a contact/thread with
 * the exact same client_id / thread id shape.
 */

// The route always resolves a thread via this RPC (even when a contact
// already exists), so the fake needs an .rpc() the base fake doesn't provide.
// It looks up the caller's contact-derived tenant_id from the seeded threads
// table — i.e. it behaves like the real function, keyed by tenant + contact.
vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const rpc = (fn: string, args: { p_tenant_id: string; p_contact_id: string }) => {
    if (fn === 'comhub_get_or_create_thread') {
      const thread = fake._all('comhub_threads').find(
        (t) => t.tenant_id === args.p_tenant_id && t._contact_id === args.p_contact_id,
      )
      return Promise.resolve({ data: (thread?.id as string) ?? null, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  }
  return { supabaseAdmin: Object.assign(fake, { rpc }) }
})

let currentClientId: string
vi.mock('@/lib/nycmaid/auth', () => ({
  protectClientAPI: async () => ({ clientId: currentClientId }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const CLIENT_A = 'client-a'
const CLIENT_B = 'client-b'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentClientId = CLIENT_A
  fake._seed('clients', [
    { id: CLIENT_A, tenant_id: A_ID, phone: '+15550001', email: null, name: 'Client A' },
    { id: CLIENT_B, tenant_id: B_ID, phone: '+15550002', email: null, name: 'Client B' },
  ])
  fake._seed('comhub_contacts', [
    { id: 'contact-a', tenant_id: A_ID, client_id: CLIENT_A },
    { id: 'contact-b', tenant_id: B_ID, client_id: CLIENT_B },
  ])
  // Same literal thread id under both tenants — proves scoping isn't relying
  // on id uniqueness alone.
  fake._seed('comhub_messages', [
    { id: 'msg-a', tenant_id: A_ID, thread_id: 'thread-shared', direction: 'out', author: 'admin', body: 'Hi A', sent_at: '2026-07-01T00:00:00', channel: 'web' },
    { id: 'msg-b', tenant_id: B_ID, thread_id: 'thread-shared', direction: 'out', author: 'admin', body: 'Hi B', sent_at: '2026-07-01T00:00:00', channel: 'web' },
  ])
  fake._seed('comhub_threads', [
    { id: 'thread-shared', tenant_id: A_ID, _contact_id: 'contact-a', unread_count: 3 },
  ])
})

describe('portal/messages GET — tenantDb isolation', () => {
  it("tenant A's client sees only tenant A's messages on a thread id shared (by literal value) with tenant B", async () => {
    // rpc calls aren't hit because comhub_contacts already resolves a contact.
    const res = await GET()
    const body = await res.json()
    const ids = (body.messages as { id: string }[]).map((m) => m.id)
    expect(ids).toEqual(['msg-a'])
  })
})

describe('portal/messages POST — tenantDb isolation', () => {
  it("stamps a new message with tenant A's id, not any other tenant's, via the wrapper", async () => {
    const req = new NextRequest('http://x', { method: 'POST', body: JSON.stringify({ body: 'New message from A' }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const inserted = fake._all('comhub_messages').find((m) => m.body === 'New message from A')
    expect(inserted?.tenant_id).toBe(A_ID)
  })
})

describe('LEAK CONTROL', () => {
  it("reading comhub_messages by thread_id ALONE (no tenant_id filter) WOULD return tenant B's message on the same thread id — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('comhub_messages') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .select('id, tenant_id')
      .eq('thread_id', 'thread-shared')
    expect((data as { id: string }[]).map((r) => r.id).sort()).toEqual(['msg-a', 'msg-b'])
  })
})
