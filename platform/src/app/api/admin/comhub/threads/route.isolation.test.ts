import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — admin/comhub/threads/route.ts (list).
 * Proves an admin scoped to tenant A never sees tenant B's threads in the
 * list, even when tenant B has more/newer rows than tenant A.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let gtFilter: { col: string; val: number } | null = null
  let inFilter: { col: string; vals: unknown[] } | null = null

  const rows = (): Row[] => {
    let r = (store[table] || []).filter((row) => matchesEq(row, eqs))
    if (gtFilter) r = r.filter((row) => (row[gtFilter!.col] as number) > gtFilter!.val)
    if (inFilter) r = r.filter((row) => inFilter!.vals.includes(row[inFilter!.col]))
    return r
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    is: () => chain,
    gt: (col: string, val: number) => {
      gtFilter = { col, val }
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      inFilter = { col, vals }
      return chain
    },
    order: () => chain,
    range: () => chain,
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

vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: async () => currentTenant,
}))

import { GET } from './route'

beforeEach(() => {
  store = {
    comhub_threads: [
      { id: 'thread-A1', tenant_id: 'tenant-A', kind: 'contact', status: 'open', channel: 'sms', unread_count: 1, last_message_at: '2026-07-01T00:00:00Z', archived_at: null },
      { id: 'thread-B1', tenant_id: 'tenant-B', kind: 'contact', status: 'open', channel: 'sms', unread_count: 9, last_message_at: '2026-07-13T00:00:00Z', archived_at: null },
      { id: 'thread-B2', tenant_id: 'tenant-B', kind: 'contact', status: 'open', channel: 'sms', unread_count: 4, last_message_at: '2026-07-12T00:00:00Z', archived_at: null },
    ],
    comhub_messages: [],
  }
})

function listThreads(tenantId: string) {
  currentTenant = tenantId
  return GET(new NextRequest('http://x/api/admin/comhub/threads'))
}

describe('admin/comhub/threads GET (list) — tenantDb isolation', () => {
  it('an admin scoped to tenant A only sees tenant A\'s threads', async () => {
    const res = await listThreads('tenant-A')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.threads).toHaveLength(1)
    expect(body.threads[0].id).toBe('thread-A1')
  })

  it('an admin scoped to tenant B only sees tenant B\'s threads', async () => {
    const res = await listThreads('tenant-B')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.threads.map((t: { id: string }) => t.id).sort()).toEqual(['thread-B1', 'thread-B2'])
  })
})
