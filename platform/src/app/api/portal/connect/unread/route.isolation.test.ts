import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — portal/connect/unread/route.ts.
 * Converts the connect_channels lookup, connect_read_cursors lookup, and
 * the connect_messages unread count to tenantDb(auth.tid). The
 * connect_messages count previously carried NO .eq('tenant_id') at all —
 * it trusted the channel id resolved one query earlier. Proves a client's
 * unread badge count is built only from its own tenant's channel/messages,
 * even when another tenant has messages that would inflate the count if
 * the scoping were dropped.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let countMode = false
  let gtCol: string | null = null
  let gtVal: string | null = null

  const rows = (): Row[] => {
    let r = (store[table] || []).filter((row) => matchesEq(row, eqs))
    if (gtCol) r = r.filter((row) => (row[gtCol as string] as string) > (gtVal as string))
    return r
  }

  const chain: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      countMode = !!opts?.count
      return chain
    },
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    gt: (col: string, val: unknown) => {
      gtCol = col
      gtVal = val as string
      return chain
    },
    single: () => Promise.resolve({ data: rows()[0] || null, error: null }),
    then: (resolve: (v: { data: Row[] | null; error: null; count?: number }) => unknown) => {
      const r = rows()
      if (countMode) return resolve({ data: null, error: null, count: r.length })
      return resolve({ data: r, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('../../auth/token', () => ({
  verifyPortalToken: (token: string) => {
    try {
      return JSON.parse(token)
    } catch {
      return null
    }
  },
}))

import { GET } from './route'

beforeEach(() => {
  store = {
    connect_channels: [
      { id: 'chan-A1', tenant_id: 'tenant-A', type: 'client', client_id: 'client-A' },
      { id: 'chan-B1', tenant_id: 'tenant-B', type: 'client', client_id: 'client-B' },
    ],
    connect_read_cursors: [],
    connect_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', channel_id: 'chan-A1', created_at: '2026-01-01T00:00:00Z' },
      { id: 'msg-B1', tenant_id: 'tenant-B', channel_id: 'chan-B1', created_at: '2026-01-01T00:00:00Z' },
      { id: 'msg-B2', tenant_id: 'tenant-B', channel_id: 'chan-B1', created_at: '2026-01-02T00:00:00Z' },
      { id: 'msg-B3', tenant_id: 'tenant-B', channel_id: 'chan-B1', created_at: '2026-01-03T00:00:00Z' },
    ],
  }
})

function getUnread(tid: string, id: string) {
  const header = { authorization: `Bearer ${JSON.stringify({ tid, id })}` }
  return GET(new NextRequest('http://x/api/portal/connect/unread', { headers: header }))
}

describe('portal/connect/unread GET — tenantDb isolation', () => {
  it('client A\'s unread count never includes tenant B\'s messages', async () => {
    const res = await getUnread('tenant-A', 'client-A')
    const body = await res.json()
    expect(body.unread).toBe(1)
  })

  it('a token for tenant B sees its own (larger) unread count, unaffected by tenant A', async () => {
    const res = await getUnread('tenant-B', 'client-B')
    const body = await res.json()
    expect(body.unread).toBe(3)
  })
})
