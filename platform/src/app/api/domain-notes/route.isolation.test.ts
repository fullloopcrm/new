import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — domain-notes/route.ts (docs/adr/0004).
 * Proves GET never surfaces a foreign tenant's note and the upsert stamps the
 * new row with the authenticated tenant.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    upsert: (row: Row) => {
      const rows = store[table] || []
      const idx = rows.findIndex((r) => r.tenant_id === row.tenant_id && r.domain === row.domain)
      if (idx >= 0) rows[idx] = { ...rows[idx], ...row }
      else rows.push({ id: `new-${rows.length + 1}`, ...row })
      store[table] = rows
      return { then: (resolve: (v: { error: null }) => unknown) => resolve({ error: null }) }
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (store[table] || []).filter((r) => matches(r, eqs)), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenant: string

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenant }, error: null }),
}))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    domain_notes: [
      { id: 'dn-a', tenant_id: 'tenant-A', domain: 'a.com', notes: 'Note A' },
      { id: 'dn-b', tenant_id: 'tenant-B', domain: 'b.com', notes: 'Note B' },
    ],
  }
  currentTenant = 'tenant-A'
})

describe('domain-notes GET — tenantDb isolation', () => {
  it('never returns another tenant\'s domain note', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.notes['a.com']).toBe('Note A')
    expect(body.notes['b.com']).toBeUndefined()
  })
})

describe('domain-notes POST — tenantDb stamping', () => {
  it('stamps the upserted row with the authenticated tenant, not a forged body tenant_id', async () => {
    const req = new NextRequest('http://x/api/domain-notes', {
      method: 'POST',
      body: JSON.stringify({ domain: 'c.com', notes: 'Note C', tenant_id: 'tenant-B' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const newRow = store.domain_notes.find((r) => r.domain === 'c.com')
    expect(newRow?.tenant_id).toBe('tenant-A')

    currentTenant = 'tenant-B'
    const resB = await GET()
    const bodyB = await resB.json()
    expect(bodyB.notes['c.com']).toBeUndefined()
  })
})
