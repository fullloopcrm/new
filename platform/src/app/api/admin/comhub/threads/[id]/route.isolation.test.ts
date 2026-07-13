import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — admin/comhub/threads/[id]/route.ts.
 * Proves an admin currently scoped to tenant A can't read, mark-read, or
 * PATCH a thread (or its messages) that belongs to tenant B, even when
 * the caller supplies tenant B's own thread id.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let inFilter: { col: string; vals: unknown[] } | null = null
  let limitN: number | undefined
  let pendingUpdate: Row | null = null

  const rows = (): Row[] => {
    let r = (store[table] || []).filter((row) => matchesEq(row, eqs))
    if (inFilter) r = r.filter((row) => inFilter!.vals.includes(row[inFilter!.col]))
    if (limitN != null) r = r.slice(0, limitN)
    return r
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    is: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      inFilter = { col, vals }
      return chain
    },
    order: () => chain,
    limit: (n: number) => {
      limitN = n
      return chain
    },
    update: (values: Row) => {
      pendingUpdate = values
      return chain
    },
    single: () => {
      if (pendingUpdate) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).map((r) => (ids.has(r.id) ? { ...r, ...pendingUpdate } : r))
        const updated = store[table].filter((r) => ids.has(r.id))
        return Promise.resolve({ data: updated[0] || null, error: updated.length ? null : { message: 'not found' } })
      }
      const r = rows()
      return Promise.resolve({ data: r[0] || null, error: r.length ? null : { message: 'not found' } })
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      if (pendingUpdate) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).map((r) => (ids.has(r.id) ? { ...r, ...pendingUpdate } : r))
        return resolve({ data: store[table].filter((r) => ids.has(r.id)), error: null })
      }
      return resolve({ data: rows(), error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: async () => null,
}))

vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: async () => currentTenant,
}))

import { GET, PATCH } from './route'

beforeEach(() => {
  store = {
    comhub_threads: [
      { id: 'thread-A1', tenant_id: 'tenant-A', contact_id: 'c-A1', status: 'open', unread_count: 3 },
      { id: 'thread-B1', tenant_id: 'tenant-B', contact_id: 'c-B1', status: 'open', unread_count: 5 },
    ],
    comhub_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', thread_id: 'thread-A1', direction: 'in', read_at: null },
      { id: 'msg-B1', tenant_id: 'tenant-B', thread_id: 'thread-B1', direction: 'in', read_at: null },
    ],
    tenant_members: [
      { id: 'member-A', tenant_id: 'tenant-A', name: 'Alice', email: 'a@x.com' },
      { id: 'member-B', tenant_id: 'tenant-B', name: 'Bob', email: 'b@x.com' },
    ],
  }
})

function getThread(tenantId: string, threadId: string) {
  currentTenant = tenantId
  return GET(new NextRequest(`http://x/api/admin/comhub/threads/${threadId}`), { params: Promise.resolve({ id: threadId }) })
}

function patchThread(tenantId: string, threadId: string, body: Record<string, unknown>) {
  currentTenant = tenantId
  return PATCH(
    new NextRequest(`http://x/api/admin/comhub/threads/${threadId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: threadId }) }
  )
}

describe('admin/comhub/threads/[id] GET — tenantDb isolation', () => {
  it('an admin scoped to tenant A gets 404 when requesting tenant B\'s thread by forged id', async () => {
    const res = await getThread('tenant-A', 'thread-B1')
    expect(res.status).toBe(404)
  })

  it('an admin scoped to tenant A can read its own thread', async () => {
    const res = await getThread('tenant-A', 'thread-A1')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.thread.id).toBe('thread-A1')
  })
})

describe('admin/comhub/threads/[id] PATCH — tenantDb isolation', () => {
  it('an admin scoped to tenant A cannot mutate tenant B\'s thread via a forged id', async () => {
    const res = await patchThread('tenant-A', 'thread-B1', { status: 'closed' })
    expect(res.status).toBe(500)

    const tenantBThread = store.comhub_threads.find((r) => r.id === 'thread-B1')
    expect(tenantBThread?.status).toBe('open')
  })

  it('mark_read on a forged tenant B thread id never flips tenant B\'s message read_at', async () => {
    await patchThread('tenant-A', 'thread-B1', { mark_read: true })

    const tenantBMsg = store.comhub_messages.find((r) => r.id === 'msg-B1')
    expect(tenantBMsg?.read_at).toBeNull()
  })

  it('an admin scoped to tenant A CAN update and mark-read its own thread', async () => {
    const res = await patchThread('tenant-A', 'thread-A1', { status: 'closed', mark_read: true })
    expect(res.status).toBe(200)

    const tenantAThread = store.comhub_threads.find((r) => r.id === 'thread-A1')
    expect(tenantAThread?.status).toBe('closed')

    const tenantAMsg = store.comhub_messages.find((r) => r.id === 'msg-A1')
    expect(tenantAMsg?.read_at).not.toBeNull()
  })
})
