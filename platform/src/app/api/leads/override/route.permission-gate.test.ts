import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/leads/override previously called getTenantForRequest() with no
 * requirePermission check -- any authenticated tenant member (incl. 'staff',
 * which lacks leads.view) could toggle manual_conversion/manual_sale on
 * another member's lead_clicks row. Siblings leads/block and leads/verify
 * already gate the same table on leads.view; now matched.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const LEAD_ID = 'lead-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  let filters: Record<string, unknown> = {}
  let pendingUpdate: Row | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    update: (p: Row) => { pendingUpdate = p; return c },
    eq: (k: string, v: unknown) => { filters = { ...filters, [k]: v }; return c },
    maybeSingle: async () => {
      const row = rowsOf().find(r => Object.entries(filters).every(([k, v]) => r[k] === v)) || null
      if (pendingUpdate && row) Object.assign(row, pendingUpdate)
      return { data: row, error: null }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      if (pendingUpdate) {
        for (const row of rowsOf()) {
          if (Object.entries(filters).every(([k, v]) => row[k] === v)) Object.assign(row, pendingUpdate)
        }
      }
      return Promise.resolve(res({ data: rowsOf(), error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.lead_clicks = [{ id: LEAD_ID, tenant_id: TENANT_A, manual_conversion: false, manual_sale: false }]
})

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('/api/leads/override — permission gate', () => {
  it('403s a staff member (no leads.view), row untouched', async () => {
    const res = await POST(postReq({ id: LEAD_ID, type: 'conversion' }))
    expect(res.status).toBe(403)
    expect(DB.lead_clicks[0].manual_conversion).toBe(false)
  })

  it('allows a manager (has leads.view) to toggle', async () => {
    currentRole.value = 'manager'
    const res = await POST(postReq({ id: LEAD_ID, type: 'conversion' }))
    expect(res.status).toBe(200)
    expect(DB.lead_clicks[0].manual_conversion).toBe(true)
  })
})
