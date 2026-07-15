import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — quote-templates/route.ts (docs/adr/0004).
 * Proves GET never surfaces a foreign tenant's template and POST stamps the
 * new row with the authenticated tenant.
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

let currentTenant: string

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant, role: 'owner' }),
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
    quote_templates: [
      { id: 'qt-a', tenant_id: 'tenant-A', name: 'A Template', active: true, sort_order: 1 },
      { id: 'qt-b', tenant_id: 'tenant-B', name: 'B Template', active: true, sort_order: 1 },
    ],
  }
  currentTenant = 'tenant-A'
})

describe('quote-templates GET — tenantDb isolation', () => {
  it('never returns another tenant\'s template', async () => {
    const res = await GET()
    const body = await res.json()
    const ids = body.templates.map((t: Row) => t.id)
    expect(ids).toContain('qt-a')
    expect(ids).not.toContain('qt-b')
  })
})

describe('quote-templates POST — tenantDb stamping', () => {
  it('stamps the new row with the authenticated tenant, not a forged body tenant_id', async () => {
    const req = new Request('http://x/api/quote-templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Template', tenant_id: 'tenant-B' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(body.template.tenant_id).toBe('tenant-A')

    currentTenant = 'tenant-B'
    const resB = await GET()
    const bodyB = await resB.json()
    expect(bodyB.templates.map((t: Row) => t.id)).not.toContain(body.template.id)
  })
})
