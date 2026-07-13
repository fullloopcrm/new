import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — admin-chat/route.ts.
 * Converts the sms_conversations lookup-or-create (both genuinely tenant-owned)
 * to tenantDb(tenantId). Proves that two tenants sharing the same owner phone
 * (OWNER_PHONES is process-wide config, so collisions are plausible) never
 * reuse each other's active admin-dashboard conversation.
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
    is: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: (n: number) => {
      limitN = n
      return chain
    },
    insert: (payload: Row) => {
      const withId = { id: `convo-${(store[table]?.length || 0) + 1}`, ...payload }
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

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenant }, error: null }),
}))

vi.mock('@/lib/selena/agent', () => ({
  askSelena: async () => ({ text: 'reply', toolsCalled: [] }),
}))

process.env.OWNER_PHONES = '+12122029220'

import { POST } from './route'

beforeEach(() => {
  store = {
    sms_conversations: [
      {
        id: 'convo-tenant-A', tenant_id: 'tenant-A', phone: '+12122029220',
        state: 'admin-dashboard', completed_at: null,
      },
      {
        id: 'convo-tenant-B', tenant_id: 'tenant-B', phone: '+12122029220',
        state: 'admin-dashboard', completed_at: null,
      },
    ],
    sms_conversation_messages: [],
  }
})

function postChat(tenantId: string, body: Record<string, unknown>) {
  currentTenant = tenantId
  return POST(new NextRequest('http://x/api/admin-chat', { method: 'POST', body: JSON.stringify(body) }))
}

describe('admin-chat POST — tenantDb isolation (sms_conversations lookup-or-create)', () => {
  it('tenant A reuses its own active conversation, never tenant B\'s, despite sharing the owner phone', async () => {
    const res = await postChat('tenant-A', { message: 'hi' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.sessionId).toBe('convo-tenant-A')
  })

  it('tenant B reuses its own active conversation, never tenant A\'s, despite sharing the owner phone', async () => {
    const res = await postChat('tenant-B', { message: 'hi' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.sessionId).toBe('convo-tenant-B')
  })
})
