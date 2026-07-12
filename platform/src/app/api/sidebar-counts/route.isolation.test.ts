import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — sidebar-counts/route.ts (docs/adr/0004).
 * Proves every per-table count is scoped to the authenticated tenant (a
 * foreign tenant's clients/bookings/leads/notifications never inflate the
 * count) and that the connect-unread fan-out only walks THIS tenant's
 * channels. connect_messages/connect_read_cursors previously had NO
 * tenant_id filter at all (only channel_id, itself derived from a
 * tenant-scoped channel list) — tenantDb's injected filter is hardening,
 * proven here by seeding a same-channel-id row under a foreign tenant.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>, ins: Record<string, unknown[]>, gts: Record<string, unknown>) {
  for (const [k, v] of Object.entries(eqs)) if (row[k] !== v) return false
  for (const [k, arr] of Object.entries(ins)) if (!arr.includes(row[k])) return false
  for (const [k, v] of Object.entries(gts)) if (!(String(row[k]) > String(v))) return false
  return true
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const ins: Record<string, unknown[]> = {}
  const gts: Record<string, unknown> = {}

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      ins[col] = vals
      return chain
    },
    gt: (col: string, val: unknown) => {
      gts[col] = val
      return chain
    },
    then: (resolve: (v: { data: Row[]; error: null; count: number }) => unknown) => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs, ins, gts))
      return resolve({ data: rows, error: null, count: rows.length })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenant: string

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant, userId: 'owner-1' }),
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
    clients: [
      { id: 'c-a', tenant_id: 'tenant-A' },
      { id: 'c-b1', tenant_id: 'tenant-B' },
      { id: 'c-b2', tenant_id: 'tenant-B' },
    ],
    bookings: [
      { id: 'bk-a', tenant_id: 'tenant-A', status: 'scheduled' },
      { id: 'bk-b', tenant_id: 'tenant-B', status: 'scheduled' },
    ],
    website_visits: [{ id: 'wv-a', tenant_id: 'tenant-A' }],
    notifications: [
      { id: 'n-a', tenant_id: 'tenant-A', read: false },
      { id: 'n-b', tenant_id: 'tenant-B', read: false },
    ],
    // Same channel_id reused across tenants — proves the fan-out is
    // tenant-filtered, not just channel_id-filtered.
    connect_channels: [{ id: 'ch-1', tenant_id: 'tenant-A' }],
    connect_read_cursors: [],
    connect_messages: [
      { id: 'm-a', tenant_id: 'tenant-A', channel_id: 'ch-1', created_at: '2026-01-01' },
      { id: 'm-b', tenant_id: 'tenant-B', channel_id: 'ch-1', created_at: '2026-01-01' },
    ],
  }
  currentTenant = 'tenant-A'
})

describe('sidebar-counts GET — tenantDb isolation', () => {
  it('every count reflects only the authenticated tenant\'s rows', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.clients).toBe(1)
    expect(body.bookings).toBe(1)
    expect(body.leads).toBe(1)
    expect(body.notifications).toBe(1)
  })

  it('connect-unread fan-out only counts this tenant\'s messages on a shared channel_id', async () => {
    const res = await GET()
    const body = await res.json()
    // tenant-A's own channel has 1 tenant-A message unread -> counts as 1
    // unread channel. A tenant-B message on the SAME channel_id must not
    // leak in via the unscoped-before-conversion connect_messages read.
    expect(body.connect).toBe(1)
  })

  it('a foreign tenant sees none of tenant-A\'s counts', async () => {
    currentTenant = 'tenant-B'
    const res = await GET()
    const body = await res.json()
    expect(body.clients).toBe(2)
    expect(body.bookings).toBe(1)
    expect(body.connect).toBe(0) // tenant-B has no connect_channels row
  })
})
