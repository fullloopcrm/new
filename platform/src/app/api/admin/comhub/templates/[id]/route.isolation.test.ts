import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — admin/comhub/templates/[id]/route.ts.
 * Proves an admin scoped to tenant A cannot archive tenant B's template via
 * a forged id.
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

import { DELETE } from './route'

beforeEach(() => {
  store = {
    comhub_templates: [
      { id: 'tmpl-A1', tenant_id: 'tenant-A', archived_at: null },
      { id: 'tmpl-B1', tenant_id: 'tenant-B', archived_at: null },
    ],
  }
})

function archiveTemplate(tenantId: string, id: string) {
  currentTenant = tenantId
  return DELETE(new NextRequest(`http://x/api/admin/comhub/templates/${id}`, { method: 'DELETE' }), { params: Promise.resolve({ id }) })
}

describe('admin/comhub/templates/[id] DELETE — tenantDb isolation', () => {
  it('an admin scoped to tenant A cannot archive tenant B\'s template via a forged id', async () => {
    const res = await archiveTemplate('tenant-A', 'tmpl-B1')
    expect(res.status).toBe(200)

    const tenantBRow = store.comhub_templates.find((r) => r.id === 'tmpl-B1')
    expect(tenantBRow?.archived_at).toBeNull()
  })

  it('an admin scoped to tenant A CAN archive its own template', async () => {
    const res = await archiveTemplate('tenant-A', 'tmpl-A1')
    expect(res.status).toBe(200)

    const tenantARow = store.comhub_templates.find((r) => r.id === 'tmpl-A1')
    expect(tenantARow?.archived_at).not.toBeNull()
  })
})
