import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — portal/connect/route.ts (client-portal side of
 * platform Connect chat). Converts connect_channels/connect_messages/
 * connect_read_cursors to tenantDb(auth.tid). Also adds a channel-ownership
 * check on POST when a caller supplies channel_id directly — previously a
 * client with a valid portal token for tenant A could pass another tenant's
 * channel_id in the request body and connect_messages.insert() would accept
 * it with zero verification. Proves: (1) that forged cross-tenant channel_id
 * is now rejected before insert, and (2) reads/writes stay scoped per tenant.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let limitN: number | undefined
  let insertedRow: Row | null = null

  const rows = (): Row[] => {
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
      insertedRow = withId
      return chain
    },
    upsert: (payload: Row, opts?: { onConflict?: string }) => {
      const conflictCols = (opts?.onConflict || '').split(',').filter(Boolean)
      const matchesConflict = (r: Row) => conflictCols.length > 0 && conflictCols.every((c) => r[c] === payload[c])
      const existingIdx = (store[table] || []).findIndex(matchesConflict)
      if (existingIdx >= 0) {
        store[table] = store[table].map((r, i) => (i === existingIdx ? { ...r, ...payload } : r))
      } else {
        store[table] = [...(store[table] || []), { id: `${table}-new-${(store[table]?.length || 0) + 1}`, ...payload }]
      }
      return chain
    },
    single: () => Promise.resolve({ data: rows()[0] || insertedRow || null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows(), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return builder(table)
      return builder(table)
    },
  },
}))

vi.mock('../auth/token', () => ({
  verifyPortalToken: (token: string) => {
    try {
      return JSON.parse(token)
    } catch {
      return null
    }
  },
}))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    clients: [
      { id: 'client-A', name: 'Alice' },
      { id: 'client-B', name: 'Bob' },
    ],
    connect_channels: [
      { id: 'chan-A1', tenant_id: 'tenant-A', type: 'client', client_id: 'client-A' },
      { id: 'chan-B1', tenant_id: 'tenant-B', type: 'client', client_id: 'client-B' },
    ],
    connect_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', channel_id: 'chan-A1', sender_type: 'owner', sender_id: 'u-A', sender_name: 'A', body: 'hi A', created_at: '2026-01-01' },
      { id: 'msg-B1', tenant_id: 'tenant-B', channel_id: 'chan-B1', sender_type: 'owner', sender_id: 'u-B', sender_name: 'B', body: 'hi B', created_at: '2026-01-01' },
    ],
    connect_read_cursors: [],
  }
})

function authHeader(tid: string, id: string) {
  return { authorization: `Bearer ${JSON.stringify({ tid, id })}` }
}

function getMessages(tid: string, id: string) {
  return GET(new NextRequest('http://x/api/portal/connect', { headers: authHeader(tid, id) }))
}

function postMessage(tid: string, id: string, body: string, channel_id?: string) {
  return POST(new NextRequest('http://x/api/portal/connect', {
    method: 'POST',
    headers: authHeader(tid, id),
    body: JSON.stringify({ body, channel_id }),
  }))
}

describe('portal/connect GET — tenantDb isolation', () => {
  it('client A only ever reads its own tenant\'s channel/messages', async () => {
    const res = await getMessages('tenant-A', 'client-A')
    const body = await res.json()
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['msg-A1'])
  })
})

describe('portal/connect POST — tenantDb isolation', () => {
  it('a forged cross-tenant channel_id is rejected, never inserted', async () => {
    const res = await postMessage('tenant-A', 'client-A', 'sneaky', 'chan-B1')
    expect(res.status).toBe(404)
    expect(store.connect_messages.some((m) => m.body === 'sneaky')).toBe(false)
  })

  it('a reply to the caller\'s own channel is stamped with its own tenant_id', async () => {
    const res = await postMessage('tenant-A', 'client-A', 'thanks!', 'chan-A1')
    expect(res.status).toBe(201)
    const inserted = store.connect_messages.find((m) => m.body === 'thanks!')
    expect(inserted?.tenant_id).toBe('tenant-A')
  })
})
