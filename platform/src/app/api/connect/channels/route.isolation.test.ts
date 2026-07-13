import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — connect/channels/route.ts.
 * Converts the connect_channels list/insert and the connect_messages
 * "last message per channel" enrichment lookup to tenantDb(tenantId). The
 * connect_messages enrichment query previously carried NO .eq('tenant_id')
 * at all — it trusted the channel id list built one query earlier. Proves
 * a tenant's channel list (and each channel's last-message preview) never
 * surfaces another tenant's channels or messages.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

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
  let insertedRows: Row[] | null = null

  const rows = (): Row[] => {
    if (insertedRows) return insertedRows
    return (store[table] || []).filter((row) => matchesEq(row, eqs))
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      eqs[col] = { __in: vals }
      return chain
    },
    order: () => chain,
    insert: (payload: Row) => {
      const withId = { id: `chan-new-${(store[table]?.length || 0) + 1}`, ...payload }
      store[table] = [...(store[table] || []), withId]
      insertedRows = [withId]
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
  getTenantForRequest: async () => ({ tenantId: currentTenant }),
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
      { id: 'chan-A1', tenant_id: 'tenant-A', name: 'General', type: 'general', created_at: '2026-01-01' },
      { id: 'chan-B1', tenant_id: 'tenant-B', name: 'General', type: 'general', created_at: '2026-01-01' },
    ],
    connect_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', channel_id: 'chan-A1', body: 'from A', sender_name: 'A', created_at: '2026-01-02' },
      { id: 'msg-B1', tenant_id: 'tenant-B', channel_id: 'chan-B1', body: 'from B', sender_name: 'B', created_at: '2026-01-02' },
    ],
  }
})

function getChannels(tenantId: string) {
  currentTenant = tenantId
  return GET()
}

function postChannel(tenantId: string, body: Record<string, unknown>) {
  currentTenant = tenantId
  return POST(new NextRequest('http://x/api/connect/channels', { method: 'POST', body: JSON.stringify(body) }))
}

describe('connect/channels GET — tenantDb isolation', () => {
  it('tenant A only sees its own channel, with its own last message, never tenant B\'s', async () => {
    const res = await getChannels('tenant-A')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.channels).toHaveLength(1)
    expect(body.channels[0].id).toBe('chan-A1')
    expect(body.channels[0].last_message.body).toBe('from A')
  })

  it('tenant B only sees its own channel, with its own last message, never tenant A\'s', async () => {
    const res = await getChannels('tenant-B')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.channels).toHaveLength(1)
    expect(body.channels[0].id).toBe('chan-B1')
    expect(body.channels[0].last_message.body).toBe('from B')
  })
})

describe('connect/channels POST — tenantDb isolation', () => {
  it('a new channel for tenant A is stamped with tenant A\'s tenant_id, never tenant B\'s', async () => {
    const res = await postChannel('tenant-A', { name: 'Support', type: 'custom' })
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.channel.tenant_id).toBe('tenant-A')
  })

  it('the "general" auto-create lookup for tenant A never returns tenant B\'s general channel', async () => {
    // Only tenant B has a pre-existing 'general' channel in this scenario;
    // tenant A must NOT find it and must create its own.
    store.connect_channels = [{ id: 'chan-B1', tenant_id: 'tenant-B', name: 'General', type: 'general', created_at: '2026-01-01' }]
    const res = await postChannel('tenant-A', { name: 'General', type: 'general' })
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.channel.id).not.toBe('chan-B1')
    expect(body.channel.tenant_id).toBe('tenant-A')
  })
})
