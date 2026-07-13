import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — admin/comhub/channels/route.ts.
 * Proves a created channel is always stamped with the CALLER's tenant_id
 * (from session context), never a tenant_id the request body could forge.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string
let idSeq = 0

function builder(table: string) {
  let inserted: Row | null = null

  const chain: Record<string, unknown> = {
    insert: (row: Row) => {
      inserted = { id: `ch-${++idSeq}`, ...row }
      return chain
    },
    select: () => chain,
    single: () => {
      store[table] = [...(store[table] || []), inserted as Row]
      return Promise.resolve({ data: inserted, error: null })
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

import { POST } from './route'

beforeEach(() => {
  store = { comhub_threads: [] }
  idSeq = 0
})

function createChannel(tenantId: string, body: Record<string, unknown>) {
  currentTenant = tenantId
  return POST(new NextRequest('http://x/api/admin/comhub/channels', { method: 'POST', body: JSON.stringify(body) }))
}

describe('admin/comhub/channels POST — tenantDb isolation', () => {
  it('stamps the channel with the session tenant_id, ignoring any tenant_id in the body', async () => {
    const res = await createChannel('tenant-A', { slug: 'general', tenant_id: 'tenant-B' })
    expect(res.status).toBe(200)

    const row = store.comhub_threads[0]
    expect(row.tenant_id).toBe('tenant-A')
  })

  it('two tenants can each create a channel with the same slug without cross-tenant collision', async () => {
    const resA = await createChannel('tenant-A', { slug: 'general' })
    const resB = await createChannel('tenant-B', { slug: 'general' })
    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)
    expect(store.comhub_threads.map((r) => r.tenant_id).sort()).toEqual(['tenant-A', 'tenant-B'])
  })
})
