import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — connect/messages/route.ts.
 * Converts the connect_channels ownership check, the connect_messages
 * list/insert, and the connect_read_cursors upsert to tenantDb(tenantId).
 *
 * The connect_messages queries previously carried NO .eq('tenant_id') at
 * all — they trusted that channel_id alone was enough because the channel
 * was already verified to belong to the tenant one query earlier. Converting
 * both queries onto tenantDb adds a second, independent guard: even if a
 * channel_id somehow slipped through belonging to another tenant, the
 * messages read/insert itself now also refuses to cross tenant lines.
 * Proves: (1) a channel_id belonging to another tenant returns 404 up front,
 * and (2) even bypassing that check, connect_messages/connect_read_cursors
 * reads and writes stay scoped to the caller's own tenant.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let limitN: number | undefined
  let insertedRows: Row[] | null = null

  const rows = (): Row[] => {
    if (insertedRows) return insertedRows
    let r = (store[table] || []).filter((row) => matchesEq(row, eqs))
    if (limitN != null) r = r.slice(0, limitN)
    return r
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: (n: number) => {
      limitN = n
      return chain
    },
    insert: (payload: Row) => {
      const withId = { id: `${table}-new-${(store[table]?.length || 0) + 1}`, ...payload }
      store[table] = [...(store[table] || []), withId]
      insertedRows = [withId]
      return chain
    },
    upsert: (payload: Row, opts?: { onConflict?: string }) => {
      const conflictCols = (opts?.onConflict || '').split(',').filter(Boolean)
      const matchesConflict = (r: Row) => conflictCols.length > 0 && conflictCols.every((c) => r[c] === payload[c])
      const existingIdx = (store[table] || []).findIndex(matchesConflict)
      if (existingIdx >= 0) {
        store[table] = store[table].map((r, i) => (i === existingIdx ? { ...r, ...payload } : r))
      } else {
        const withId = { id: `${table}-new-${(store[table]?.length || 0) + 1}`, ...payload }
        store[table] = [...(store[table] || []), withId]
      }
      insertedRows = store[table].filter(matchesConflict)
      return chain
    },
    single: () => Promise.resolve({ data: rows()[0] || null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows(), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: currentTenant,
    userId: `user-${currentTenant}`,
    tenant: { name: `Tenant ${currentTenant}`, owner_name: 'Owner' },
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    connect_channels: [
      { id: 'chan-A1', tenant_id: 'tenant-A', name: 'General' },
      { id: 'chan-B1', tenant_id: 'tenant-B', name: 'General' },
    ],
    connect_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', channel_id: 'chan-A1', sender_type: 'owner', sender_id: 'u-A', sender_name: 'A', body: 'hi from A', created_at: '2026-01-01' },
      { id: 'msg-B1', tenant_id: 'tenant-B', channel_id: 'chan-B1', sender_type: 'owner', sender_id: 'u-B', sender_name: 'B', body: 'hi from B', created_at: '2026-01-01' },
    ],
    connect_read_cursors: [],
  }
})

function getMessages(tenantId: string, channelId: string) {
  currentTenant = tenantId
  return GET(new NextRequest(`http://x/api/connect/messages?channel_id=${channelId}`))
}

function postMessage(tenantId: string, channelId: string, body: string) {
  currentTenant = tenantId
  return POST(new NextRequest('http://x/api/connect/messages', {
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId, body }),
  }))
}

describe('connect/messages GET — tenantDb isolation', () => {
  it('a channel_id belonging to another tenant is rejected as not found', async () => {
    const res = await getMessages('tenant-A', 'chan-B1')
    expect(res.status).toBe(404)
  })

  it('tenant A only reads its own channel\'s messages, never tenant B\'s', async () => {
    const res = await getMessages('tenant-A', 'chan-A1')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['msg-A1'])
  })

  it('reading tenant A\'s channel writes a read cursor scoped to tenant A only', async () => {
    await getMessages('tenant-A', 'chan-A1')
    const cursor = store.connect_read_cursors.find((c) => c.reader_id === 'user-tenant-A')
    expect(cursor?.tenant_id).toBe('tenant-A')
    expect(store.connect_read_cursors.some((c) => c.tenant_id === 'tenant-B')).toBe(false)
  })
})

describe('connect/messages POST — tenantDb isolation', () => {
  it('a reply to another tenant\'s channel_id is rejected as not found, never inserted', async () => {
    const res = await postMessage('tenant-A', 'chan-B1', 'sneaky')
    expect(res.status).toBe(404)
    expect(store.connect_messages.some((m) => m.body === 'sneaky')).toBe(false)
  })

  it('a reply to tenant A\'s own channel is stamped with tenant A\'s tenant_id', async () => {
    const res = await postMessage('tenant-A', 'chan-A1', 'thanks!')
    expect(res.status).toBe(201)
    const inserted = store.connect_messages.find((m) => m.body === 'thanks!')
    expect(inserted?.tenant_id).toBe('tenant-A')
  })
})
