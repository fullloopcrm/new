import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — admin/comhub/messages/[id]/flag/route.ts.
 * Proves a forged message id belonging to a DIFFERENT tenant is never flagged
 * (or un-flagged) by an admin currently scoped to another tenant.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let pendingUpdate: Row | null = null

  const rows = (): Row[] => (store[table] || []).filter((row) => matchesEq(row, eqs))

  const chain: Record<string, unknown> = {
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    update: (values: Row) => {
      pendingUpdate = values
      return chain
    },
    then: (resolve: (v: { error: null }) => unknown) => {
      if (pendingUpdate) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).map((r) => (ids.has(r.id) ? { ...r, ...pendingUpdate } : r))
      }
      return resolve({ error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: async () => null,
}))

vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: async () => currentTenant,
}))

import { POST, DELETE } from './route'

beforeEach(() => {
  store = {
    comhub_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', flagged_for_review: false, flagged_reason: null, flagged_at: null, flagged_by: null },
      { id: 'msg-B1', tenant_id: 'tenant-B', flagged_for_review: false, flagged_reason: null, flagged_at: null, flagged_by: null },
    ],
  }
})

function flag(tenantId: string, msgId: string, reason?: string) {
  currentTenant = tenantId
  return POST(
    new NextRequest(`http://x/api/admin/comhub/messages/${msgId}/flag`, { method: 'POST', body: JSON.stringify({ reason }) }),
    { params: Promise.resolve({ id: msgId }) }
  )
}

function unflag(tenantId: string, msgId: string) {
  currentTenant = tenantId
  return DELETE(
    new NextRequest(`http://x/api/admin/comhub/messages/${msgId}/flag`, { method: 'DELETE' }),
    { params: Promise.resolve({ id: msgId }) }
  )
}

describe('admin/comhub/messages/[id]/flag — tenantDb isolation', () => {
  it('an admin scoped to tenant A cannot flag tenant B\'s message via a forged id', async () => {
    const res = await flag('tenant-A', 'msg-B1', 'looks off')
    expect(res.status).toBe(200)

    const tenantBRow = store.comhub_messages.find((r) => r.id === 'msg-B1')
    expect(tenantBRow?.flagged_for_review).toBe(false)
  })

  it('an admin scoped to tenant A CAN flag its own tenant\'s message', async () => {
    const res = await flag('tenant-A', 'msg-A1', 'looks off')
    expect(res.status).toBe(200)

    const tenantARow = store.comhub_messages.find((r) => r.id === 'msg-A1')
    expect(tenantARow?.flagged_for_review).toBe(true)
    expect(tenantARow?.flagged_reason).toBe('looks off')
  })

  it('an admin scoped to tenant A cannot clear tenant B\'s flag via a forged id', async () => {
    store.comhub_messages = store.comhub_messages.map((r) =>
      r.id === 'msg-B1' ? { ...r, flagged_for_review: true } : r
    )
    const res = await unflag('tenant-A', 'msg-B1')
    expect(res.status).toBe(200)

    const tenantBRow = store.comhub_messages.find((r) => r.id === 'msg-B1')
    expect(tenantBRow?.flagged_for_review).toBe(true)
  })
})
