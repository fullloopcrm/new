import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — admin/sms/route.ts (per-tenant GET branch).
 * Proves a superadmin looking up tenant A's SMS activity by ?tenant_id=
 * never sees tenant B's conversations/messages, even if a foreign row
 * happens to share a client_id value.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let limitN: number | undefined

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
    single: () => Promise.resolve({ data: rows()[0] || null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows(), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: async () => null,
}))

import { GET } from './route'

beforeEach(() => {
  store = {
    tenants: [
      { id: 'tenant-A', name: 'Tenant A', telnyx_api_key: 'key-a', telnyx_phone: '+1' },
      { id: 'tenant-B', name: 'Tenant B', telnyx_api_key: 'key-b', telnyx_phone: '+2' },
    ],
    sms_conversations: [
      { id: 'conv-A1', tenant_id: 'tenant-A', client_id: 'client-1', status: 'open', last_message_at: '2026-01-02' },
      { id: 'conv-B1', tenant_id: 'tenant-B', client_id: 'client-1', status: 'open', last_message_at: '2026-01-01' },
    ],
    client_sms_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', direction: 'in', message: 'hi from A', created_at: '2026-01-02' },
      { id: 'msg-B1', tenant_id: 'tenant-B', direction: 'in', message: 'hi from B', created_at: '2026-01-01' },
    ],
  }
})

function getSms(tenantId: string) {
  return GET(new NextRequest(`http://x/api/admin/sms?tenant_id=${tenantId}`))
}

describe('admin/sms GET (per-tenant branch) — tenantDb isolation', () => {
  it('tenant A\'s conversations never include tenant B\'s rows, even sharing a client_id', async () => {
    const res = await getSms('tenant-A')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.conversations.map((c: { id: string }) => c.id)).toEqual(['conv-A1'])
  })

  it('tenant A\'s recent messages never include tenant B\'s messages', async () => {
    const res = await getSms('tenant-A')
    const body = await res.json()
    expect(body.recentMessages.map((m: { id: string }) => m.id)).toEqual(['msg-A1'])
  })

  it('tenant B\'s query is symmetrically isolated from tenant A', async () => {
    const res = await getSms('tenant-B')
    const body = await res.json()
    expect(body.conversations.map((c: { id: string }) => c.id)).toEqual(['conv-B1'])
    expect(body.recentMessages.map((m: { id: string }) => m.id)).toEqual(['msg-B1'])
  })
})
