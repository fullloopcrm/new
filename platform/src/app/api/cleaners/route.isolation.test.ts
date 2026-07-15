import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — cleaners/route.ts (docs/adr/0004). Legacy
 * nycmaid-compat shim over team_members; same table as the already-converted
 * `team` route, different file. Proves GET never surfaces a foreign tenant's
 * team member and POST stamps the new row with the authenticated tenant.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let insertedRow: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    insert: (row: Row) => {
      insertedRow = { id: `new-${(store[table] || []).length + 1}`, ...row }
      return chain
    },
    update: () => chain,
    single: async () => {
      store[table] = [...(store[table] || []), insertedRow as Row]
      return { data: insertedRow, error: null }
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (store[table] || []).filter((r) => matches(r, eqs)), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/geo', () => ({ geocodeAddress: async () => null }))

let currentTenant: string

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenant }, error: null }),
}))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    team_members: [
      { id: 'tm-a', tenant_id: 'tenant-A', name: 'Alex A', status: 'active' },
      { id: 'tm-b', tenant_id: 'tenant-B', name: 'Bailey B', status: 'active' },
    ],
  }
  currentTenant = 'tenant-A'
})

describe('cleaners GET — tenantDb isolation', () => {
  it('never returns another tenant\'s team member', async () => {
    const res = await GET()
    const body = await res.json()
    const ids = body.map((r: Row) => r.id)
    expect(ids).toContain('tm-a')
    expect(ids).not.toContain('tm-b')
  })
})

describe('cleaners POST — tenantDb stamping', () => {
  it('stamps the new row with the authenticated tenant, not a forged body tenant_id', async () => {
    const req = new NextRequest('http://x/api/cleaners', {
      method: 'POST',
      body: JSON.stringify({ name: 'Casey C', phone: '555-0000', tenant_id: 'tenant-B' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(body.tenant_id).toBe('tenant-A')

    currentTenant = 'tenant-B'
    const resB = await GET()
    const bodyB = await resB.json()
    expect(bodyB.map((r: Row) => r.id)).not.toContain(body.id)
  })
})
