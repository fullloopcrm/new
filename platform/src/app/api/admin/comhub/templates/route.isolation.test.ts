import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — admin/comhub/templates/route.ts.
 * Proves GET only lists the caller's tenant's templates and POST always
 * stamps the session tenant_id, never a tenant_id supplied in the body.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string
let idSeq = 0

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let inserted: Row | null = null

  const rows = (): Row[] => (store[table] || []).filter((row) => matchesEq(row, eqs))

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    is: () => chain,
    or: () => chain,
    order: () => chain,
    insert: (row: Row) => {
      inserted = { id: `tmpl-${++idSeq}`, ...row }
      return chain
    },
    single: () => {
      store[table] = [...(store[table] || []), inserted as Row]
      return Promise.resolve({ data: inserted, error: null })
    },
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

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    comhub_templates: [
      { id: 'tmpl-A1', tenant_id: 'tenant-A', name: 'Welcome A', body: 'hi', archived_at: null },
      { id: 'tmpl-B1', tenant_id: 'tenant-B', name: 'Welcome B', body: 'hi', archived_at: null },
    ],
  }
  idSeq = 0
})

function listTemplates(tenantId: string) {
  currentTenant = tenantId
  return GET(new NextRequest('http://x/api/admin/comhub/templates'))
}

function createTemplate(tenantId: string, body: Record<string, unknown>) {
  currentTenant = tenantId
  return POST(new NextRequest('http://x/api/admin/comhub/templates', { method: 'POST', body: JSON.stringify(body) }))
}

describe('admin/comhub/templates GET — tenantDb isolation', () => {
  it('an admin scoped to tenant A only sees tenant A\'s templates', async () => {
    const res = await listTemplates('tenant-A')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.templates).toHaveLength(1)
    expect(body.templates[0].id).toBe('tmpl-A1')
  })
})

describe('admin/comhub/templates POST — tenantDb isolation', () => {
  it('stamps the template with the session tenant_id, ignoring any tenant_id in the body', async () => {
    const res = await createTemplate('tenant-A', { name: 'X', body: 'y', tenant_id: 'tenant-B' })
    expect(res.status).toBe(200)

    const created = store.comhub_templates.find((r) => r.name === 'X')
    expect(created?.tenant_id).toBe('tenant-A')
  })
})
