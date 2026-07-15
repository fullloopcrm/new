import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/quote-templates previously called getTenantForRequest() with
 * no requirePermission check -- any authenticated tenant member (incl.
 * 'staff', which lacks sales.edit) could create/overwrite quote templates
 * used to price every future quote. Now gated on sales.view/sales.edit to
 * match the rest of the quotes surface. Ported from sibling-branch commit
 * 120dd9ff.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  let op: 'select' | 'insert' = 'select'
  let payload: Row = {}
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row) => { op = 'insert'; payload = p; return c },
    eq: () => c,
    order: () => c,
    single: async () => {
      const row = { ...payload }
      DB[table] = [...rowsOf(), row]
      return { data: row, error: null }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => Promise.resolve(res({ data: rowsOf(), error: null })),
  }
  void op
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.quote_templates = []
})

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('/api/quote-templates — permission gate', () => {
  it('allows a staff member on GET (staff has sales.view)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('403s a staff member creating a template, no row inserted', async () => {
    const res = await POST(postReq({ name: 'Standard Clean' }))
    expect(res.status).toBe(403)
    expect(DB.quote_templates.length).toBe(0)
  })

  it('allows a manager (has sales.view/sales.edit) to list and create', async () => {
    currentRole.value = 'manager'
    const getRes = await GET()
    expect(getRes.status).toBe(200)
    const postRes = await POST(postReq({ name: 'Standard Clean' }))
    expect(postRes.status).toBe(200)
    expect(DB.quote_templates.length).toBe(1)
  })
})
