import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST /api/admin/tenant-chats — first route-level regression test
 * (P1/W1 O13 sweep). Platform-admin <-> tenant-owner chat: a thread-list view
 * (cross-tenant by design, admin-only) plus a per-tenant thread view/send
 * that's tenantDb-scoped by a caller-supplied ?tenant_id / body.tenant_id.
 * Zero prior coverage of the triage sort, unread counting, mark-as-read
 * scoping (only inbound + unread), or that one tenant's thread never leaks
 * into another's.
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

import { GET, POST } from './route'

const getReq = (qs = '') => new NextRequest(`http://x/api/test${qs}`)
const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })
const postReqRaw = (raw: string) => new NextRequest('http://x', { method: 'POST', body: raw })

beforeEach(() => {
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  h.store = {
    tenants: [
      { id: 'tenant-A', name: 'Acme Cleaning', slug: 'acme', owner_name: 'Alice', owner_email: 'alice@x.com', owner_phone: null, status: 'active' },
      { id: 'tenant-B', name: 'Bright Homes', slug: 'bright', owner_name: 'Bob', owner_email: null, owner_phone: null, status: 'active' },
      { id: 'tenant-D', name: 'Deleted Co', slug: 'deleted', owner_name: 'Dana', owner_email: 'd@x.com', owner_phone: null, status: 'deleted' },
    ],
    tenant_owner_messages: [],
  }
})

describe('GET /api/admin/tenant-chats — permission gate', () => {
  it('returns the admin-gate error unchanged', async () => {
    h.requireAdmin.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }))

    const res = await GET(getReq())

    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/tenant-chats — thread list', () => {
  it('excludes deleted tenants and reports has_contact from owner_email/owner_phone', async () => {
    const res = await GET(getReq())
    const json = await res.json()

    const ids = json.threads.map((t: { tenant_id: string }) => t.tenant_id)
    expect(ids).not.toContain('tenant-D')
    const acme = json.threads.find((t: { tenant_id: string }) => t.tenant_id === 'tenant-A')
    expect(acme.has_contact).toBe(true)
    const bright = json.threads.find((t: { tenant_id: string }) => t.tenant_id === 'tenant-B')
    expect(bright.has_contact).toBe(false)
  })

  it('surfaces the last message + truncates to 120 chars, and counts unread inbound messages', async () => {
    h.store.tenant_owner_messages.push(
      { id: 'm1', tenant_id: 'tenant-A', direction: 'in', body: 'x'.repeat(200), read_at: null, created_at: '2026-07-01T00:00:00.000Z' },
      { id: 'm2', tenant_id: 'tenant-A', direction: 'in', body: 'older unread', read_at: null, created_at: '2026-06-01T00:00:00.000Z' }
    )

    const res = await GET(getReq())
    const json = await res.json()

    const acme = json.threads.find((t: { tenant_id: string }) => t.tenant_id === 'tenant-A')
    expect(acme.last_message).toHaveLength(120)
    expect(acme.last_at).toBe('2026-07-01T00:00:00.000Z')
    expect(acme.unread).toBe(2)
    expect(acme.needs_reply).toBe(true)
    expect(json.total_unread).toBe(2)
  })

  it('does not count already-read or outbound messages as unread, and needs_reply is false when the last message is outbound', async () => {
    h.store.tenant_owner_messages.push(
      // Pushed most-recent-first: the fake doesn't implement `.order()`, so it
      // returns rows in store/array order — the route relies on the real DB's
      // `.order('created_at', { ascending: false })` to see the latest message
      // first per tenant, so fixtures here have to already be in that order.
      { id: 'm2', tenant_id: 'tenant-B', direction: 'out', body: 'admin reply', read_at: '2026-07-02T00:00:00.000Z', created_at: '2026-07-02T00:00:00.000Z' },
      { id: 'm1', tenant_id: 'tenant-B', direction: 'in', body: 'read already', read_at: '2026-07-01T00:00:00.000Z', created_at: '2026-06-01T00:00:00.000Z' }
    )

    const res = await GET(getReq())
    const json = await res.json()

    const bright = json.threads.find((t: { tenant_id: string }) => t.tenant_id === 'tenant-B')
    expect(bright.unread).toBe(0)
    expect(bright.needs_reply).toBe(false)
  })

  it('sorts needs-reply threads first, then most-recent activity, then alphabetically for threads with no messages', async () => {
    h.store.tenants.push({ id: 'tenant-C', name: 'Cozy Homes', slug: 'cozy', owner_name: null, owner_email: null, owner_phone: null, status: 'active' })
    h.store.tenant_owner_messages.push(
      { id: 'm1', tenant_id: 'tenant-B', direction: 'out', body: 'hi', read_at: '2026-07-01T00:00:00.000Z', created_at: '2026-07-05T00:00:00.000Z' },
      { id: 'm2', tenant_id: 'tenant-A', direction: 'in', body: 'help please', read_at: null, created_at: '2026-07-06T00:00:00.000Z' }
    )

    const res = await GET(getReq())
    const json = await res.json()

    const order = json.threads.map((t: { tenant_id: string }) => t.tenant_id)
    // tenant-A needs a reply -> first. Then tenant-B (has recent activity, no messages needed).
    // Then tenant-C (no messages at all) alphabetically last among the no-activity/no-reply-needed set.
    expect(order[0]).toBe('tenant-A')
    expect(order.indexOf('tenant-B')).toBeLessThan(order.indexOf('tenant-C'))
  })
})

describe('GET /api/admin/tenant-chats — single thread', () => {
  it("returns only the requested tenant's messages, ordered oldest-first, never another tenant's", async () => {
    h.store.tenant_owner_messages.push(
      { id: 'a1', tenant_id: 'tenant-A', direction: 'in', body: 'first', read_at: null, created_at: '2026-07-01T00:00:00.000Z' },
      { id: 'a2', tenant_id: 'tenant-A', direction: 'out', body: 'second', read_at: '2026-07-02T00:00:00.000Z', created_at: '2026-07-02T00:00:00.000Z' },
      { id: 'b1', tenant_id: 'tenant-B', direction: 'in', body: 'not mine', read_at: null, created_at: '2026-07-03T00:00:00.000Z' }
    )

    const res = await GET(getReq('?tenant_id=tenant-A'))
    const json = await res.json()

    expect(json.messages.map((m: { id: string }) => m.id)).toEqual(['a1', 'a2'])
  })

  it('marks unread inbound messages as read, leaving already-read and outbound messages untouched', async () => {
    h.store.tenant_owner_messages.push(
      { id: 'a1', tenant_id: 'tenant-A', direction: 'in', body: 'unread', read_at: null, created_at: '2026-07-01T00:00:00.000Z' },
      { id: 'a2', tenant_id: 'tenant-A', direction: 'in', body: 'already read', read_at: '2026-06-01T00:00:00.000Z', created_at: '2026-06-01T00:00:00.000Z' },
      { id: 'a3', tenant_id: 'tenant-A', direction: 'out', body: 'admin msg', read_at: null, created_at: '2026-07-02T00:00:00.000Z' }
    )

    await GET(getReq('?tenant_id=tenant-A'))

    const a1 = h.store.tenant_owner_messages.find((m) => m.id === 'a1')!
    const a2 = h.store.tenant_owner_messages.find((m) => m.id === 'a2')!
    const a3 = h.store.tenant_owner_messages.find((m) => m.id === 'a3')!
    expect(a1.read_at).toBeTruthy()
    expect(a2.read_at).toBe('2026-06-01T00:00:00.000Z')
    expect(a3.read_at).toBeNull()
  })

  it("marking tenant A's thread read never marks tenant B's unread inbound messages as read", async () => {
    h.store.tenant_owner_messages.push({ id: 'b1', tenant_id: 'tenant-B', direction: 'in', body: 'unread', read_at: null, created_at: '2026-07-01T00:00:00.000Z' })

    await GET(getReq('?tenant_id=tenant-A'))

    expect(h.store.tenant_owner_messages.find((m) => m.id === 'b1')?.read_at).toBeNull()
  })
})

describe('POST /api/admin/tenant-chats — sending', () => {
  it('returns the admin-gate error unchanged', async () => {
    h.requireAdmin.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }))

    const res = await POST(postReq({ tenant_id: 'tenant-A', body: 'hi' }))

    expect(res.status).toBe(403)
    expect(h.store.tenant_owner_messages.length).toBe(0)
  })

  it('rejects invalid JSON with 400', async () => {
    const res = await POST(postReqRaw('not json'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'invalid json' })
  })

  it('rejects a missing tenant_id or blank body with 400', async () => {
    const res = await POST(postReq({ tenant_id: 'tenant-A', body: '   ' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'tenant_id and body required' })
  })

  it('returns 404 when the tenant does not exist', async () => {
    const res = await POST(postReq({ tenant_id: 'does-not-exist', body: 'hi' }))

    expect(res.status).toBe(404)
  })

  it('inserts an outbound platform message stamped with the tenant_id, from admin jeff, pre-read', async () => {
    const res = await POST(postReq({ tenant_id: 'tenant-A', body: 'We fixed it!' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message.direction).toBe('out')
    expect(json.message.channel).toBe('platform')
    expect(json.message.sender).toBe('jeff')
    expect(json.message.sender_role).toBe('admin')

    const stored = h.store.tenant_owner_messages[0]
    expect(stored.tenant_id).toBe('tenant-A')
    expect(stored.body).toBe('We fixed it!')
    expect(stored.read_at).toBeTruthy()
  })

  it("never inserts the message against another tenant's row set", async () => {
    await POST(postReq({ tenant_id: 'tenant-A', body: 'hi Acme' }))

    expect(h.store.tenant_owner_messages.every((m) => m.tenant_id === 'tenant-A')).toBe(true)
  })
})
