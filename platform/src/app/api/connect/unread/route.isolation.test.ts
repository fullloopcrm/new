import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — connect/unread/route.ts.
 * Converts the connect_channels list, connect_read_cursors lookup, and the
 * per-channel connect_messages unread count to tenantDb(tenantId). The
 * connect_messages count previously carried NO .eq('tenant_id') at all —
 * it trusted the channel id list built one query earlier. Proves a tenant's
 * unread badge count is built only from its own channels/messages, even
 * when another tenant has channels/messages that would inflate the count
 * if the scoping were dropped.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string
let currentUser: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => {
    if (v && typeof v === 'object' && '__in' in (v as object)) {
      return (v as { __in: unknown[] }).__in.includes(row[k])
    }
    return row[k] === v
  })
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let countMode = false

  const rows = (): Row[] => (store[table] || []).filter((row) => matchesEq(row, eqs))

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
      eqs[`__gt_${col}`] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      eqs[col] = { __in: vals }
      return chain
    },
    then: (resolve: (v: { data: Row[] | null; error: null; count?: number }) => unknown) => {
      let r = rows()
      const gtEntry = Object.entries(eqs).find(([k]) => k.startsWith('__gt_'))
      if (gtEntry) {
        const col = gtEntry[0].replace('__gt_', '')
        r = r.filter((row) => (row[col] as string) > (gtEntry[1] as string))
      }
      if (countMode) return resolve({ data: null, error: null, count: r.length })
      return resolve({ data: r, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant, userId: currentUser }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET } from './route'

beforeEach(() => {
  store = {
    connect_channels: [
      { id: 'chan-A1', tenant_id: 'tenant-A' },
      { id: 'chan-B1', tenant_id: 'tenant-B' },
    ],
    connect_read_cursors: [],
    connect_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', channel_id: 'chan-A1', created_at: '2026-01-01T00:00:00Z' },
      { id: 'msg-A2', tenant_id: 'tenant-A', channel_id: 'chan-A1', created_at: '2026-01-02T00:00:00Z' },
      { id: 'msg-B1', tenant_id: 'tenant-B', channel_id: 'chan-B1', created_at: '2026-01-01T00:00:00Z' },
      { id: 'msg-B2', tenant_id: 'tenant-B', channel_id: 'chan-B1', created_at: '2026-01-02T00:00:00Z' },
      { id: 'msg-B3', tenant_id: 'tenant-B', channel_id: 'chan-B1', created_at: '2026-01-03T00:00:00Z' },
    ],
  }
})

function getUnread(tenantId: string, userId: string) {
  currentTenant = tenantId
  currentUser = userId
  return GET()
}

describe('connect/unread GET — tenantDb isolation', () => {
  it('tenant A\'s unread count reflects only its own channel, never tenant B\'s extra messages', async () => {
    const res = await getUnread('tenant-A', 'user-A')
    const body = await res.json()
    expect(res.status).toBe(200)
    // tenant A has exactly one channel with unread messages -> unread count is 1
    // (per-channel boolean), NOT inflated by tenant B's 3-message channel.
    expect(body.unread).toBe(1)
  })

  it('tenant B\'s unread count reflects only its own channel, never tenant A\'s', async () => {
    const res = await getUnread('tenant-B', 'user-B')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.unread).toBe(1)
  })
})
