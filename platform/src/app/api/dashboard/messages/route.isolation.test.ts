import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — dashboard/messages/route.ts.
 * Converts the tenant-owner side of the Level-1 platform messaging thread
 * (tenant_owner_messages: GET list + mark-read, POST reply + admin notification)
 * to tenantDb(tenantId). Proves: (1) the owner's thread never surfaces another
 * tenant's messages, (2) the "mark admin→owner messages read" update never
 * touches another tenant's rows, and (3) a reply insert is stamped with the
 * caller's own tenant_id even though the payload no longer sets it explicitly.
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
  let pendingUpdate: Row | null = null

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
    update: (values: Row) => {
      pendingUpdate = values
      return chain
    },
    insert: (payload: Row) => {
      const withId = { id: `${table}-new-${(store[table]?.length || 0) + 1}`, ...payload }
      store[table] = [...(store[table] || []), withId]
      insertedRows = [withId]
      return chain
    },
    single: () => Promise.resolve({ data: rows()[0] || null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      // Filters (.eq/.is) chained AFTER .update() have already run by the time
      // this resolves, since chaining is synchronous — apply the mutation now,
      // using the FINAL eqs, not the ones present when .update() was called.
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

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant, tenant: { name: `Tenant ${currentTenant}` } }),
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
    tenant_owner_messages: [
      {
        id: 'msg-A1', tenant_id: 'tenant-A', direction: 'out', channel: 'platform',
        body: 'Hi tenant A', sender: 'admin', sender_role: 'admin', created_at: '2026-01-01', read_at: null,
      },
      {
        id: 'msg-B1', tenant_id: 'tenant-B', direction: 'out', channel: 'platform',
        body: 'Hi tenant B', sender: 'admin', sender_role: 'admin', created_at: '2026-01-01', read_at: null,
      },
    ],
    notifications: [],
  }
})

function getMessages(tenantId: string) {
  currentTenant = tenantId
  return GET()
}

function postReply(tenantId: string, body: string) {
  currentTenant = tenantId
  return POST(new NextRequest('http://x/api/dashboard/messages', { method: 'POST', body: JSON.stringify({ body }) }))
}

describe('dashboard/messages GET — tenantDb isolation (thread + mark-read)', () => {
  it('tenant A only sees its own thread, never tenant B\'s', async () => {
    const res = await getMessages('tenant-A')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['msg-A1'])
  })

  it('marking messages read for tenant A never flips tenant B\'s read_at', async () => {
    await getMessages('tenant-A')
    const tenantARow = store.tenant_owner_messages.find((r) => r.id === 'msg-A1')
    const tenantBRow = store.tenant_owner_messages.find((r) => r.id === 'msg-B1')
    expect(tenantARow?.read_at).not.toBeNull()
    expect(tenantBRow?.read_at).toBeNull()
  })
})

describe('dashboard/messages POST — tenantDb isolation (reply insert + admin notification)', () => {
  it('a reply from tenant A is stamped with tenant A\'s own tenant_id, not leaked to tenant B', async () => {
    const res = await postReply('tenant-A', 'thanks!')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)

    const inserted = store.tenant_owner_messages.find((r) => r.body === 'thanks!')
    expect(inserted?.tenant_id).toBe('tenant-A')

    const notif = store.notifications.find((n) => n.message === 'thanks!')
    expect(notif?.tenant_id).toBe('tenant-A')
  })
})
