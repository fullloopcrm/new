import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — portal/connect/unread/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') actually excludes a foreign
 * tenant's connect_channels row, even when that row shares the SAME
 * type + client_id combination as the requesting tenant's channel.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let wantCount = false
  let gtCol: string | null = null
  let gtVal: unknown = null

  const chain: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count) wantCount = true
      return chain
    },
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    gt: (col: string, val: unknown) => {
      gtCol = col
      gtVal = val
      return chain
    },
    single: async () => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs))
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}` } }
      return { data: rows[0], error: null }
    },
    then: (resolve: (v: { data: Row[]; count: number | null; error: null }) => unknown) => {
      let rows = (store[table] || []).filter((r) => matches(r, eqs))
      if (gtCol) rows = rows.filter((r) => (r[gtCol as string] as string) > (gtVal as string))
      return resolve({ data: rows, count: wantCount ? rows.length : null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentAuth: { id: string; tid: string } | null

vi.mock('../../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

import { GET } from './route'

beforeEach(() => {
  store = {
    // Both channels share type + client_id — only tenant_id tells them apart.
    connect_channels: [
      { id: 'chan-a', tenant_id: 'tenant-A', type: 'client', client_id: 'client-x' },
      { id: 'chan-b', tenant_id: 'tenant-B', type: 'client', client_id: 'client-x' },
    ],
    connect_read_cursors: [],
    connect_messages: [
      { id: 'msg-a1', channel_id: 'chan-a', created_at: '2026-01-01' },
      { id: 'msg-a2', channel_id: 'chan-a', created_at: '2026-01-02' },
      { id: 'msg-b1', channel_id: 'chan-b', created_at: '2026-01-01' },
      { id: 'msg-b2', channel_id: 'chan-b', created_at: '2026-01-02' },
      { id: 'msg-b3', channel_id: 'chan-b', created_at: '2026-01-03' },
    ],
  }
  currentAuth = { id: 'client-x', tid: 'tenant-A' }
})

function req(): Request {
  return new Request('http://x/api/portal/connect/unread', { headers: { authorization: 'Bearer whatever' } })
}

describe('portal/connect/unread GET — tenantDb isolation', () => {
  it("resolves ONLY the requesting tenant's channel and counts ONLY its own messages, despite an identical type+client_id row existing under a foreign tenant", async () => {
    const res = await GET(req() as unknown as import('next/server').NextRequest)
    const body = await res.json()
    expect(body.unread).toBe(2) // chan-a's 2 messages, never chan-b's 3
  })

  it("the OTHER tenant sees its OWN 3 unread, not tenant A's 2 (symmetric proof)", async () => {
    currentAuth = { id: 'client-x', tid: 'tenant-B' }
    const res = await GET(req() as unknown as import('next/server').NextRequest)
    const body = await res.json()
    expect(body.unread).toBe(3)
  })
})
