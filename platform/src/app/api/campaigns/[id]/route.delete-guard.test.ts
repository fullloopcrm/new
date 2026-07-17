import { describe, it, expect, vi } from 'vitest'

/**
 * DELETE /api/campaigns/[id] had zero status guard. campaign_recipients has
 * campaign_id ON DELETE CASCADE (migration 008) -- it's the per-recipient
 * send/bounce/delivery audit trail. A direct API call (curl/devtools, not
 * just the UI which already only offers Delete for status:'draft') could
 * hard-delete an already-sent or in-flight campaign and cascade-wipe that
 * whole record. This proves the server-side guard.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CAMPAIGN_ID = 'camp1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let mode: 'select' | 'delete' = 'select'
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => {
      filters.push((r) => r[col] === val)
      return c
    },
    delete: () => {
      mode = 'delete'
      return c
    },
    single: () => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'not found' } })
    },
    then: (res: (v: { error: unknown }) => unknown) => {
      if (mode === 'delete') {
        const toDelete = new Set(rowsOf().filter((r) => filters.every((f) => f(r))))
        DB[table] = rowsOf().filter((r) => !toDelete.has(r))
        return Promise.resolve(res({ error: null }))
      }
      return Promise.resolve(res({ error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'admin', tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { DELETE } from './route'

function params() {
  return { params: Promise.resolve({ id: CAMPAIGN_ID }) }
}

describe('/api/campaigns/[id] DELETE — status guard', () => {
  it('409s deleting a sent campaign (would cascade-wipe campaign_recipients)', async () => {
    DB.campaigns = [{ id: CAMPAIGN_ID, tenant_id: TENANT_A, name: 'Spring Promo', status: 'sent' }]
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), params())
    expect(res.status).toBe(409)
    expect(DB.campaigns.length).toBe(1)
  })

  it('409s deleting a currently-sending campaign', async () => {
    DB.campaigns = [{ id: CAMPAIGN_ID, tenant_id: TENANT_A, name: 'Spring Promo', status: 'sending' }]
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), params())
    expect(res.status).toBe(409)
    expect(DB.campaigns.length).toBe(1)
  })

  it('409s deleting a scheduled campaign', async () => {
    DB.campaigns = [{ id: CAMPAIGN_ID, tenant_id: TENANT_A, name: 'Spring Promo', status: 'scheduled' }]
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), params())
    expect(res.status).toBe(409)
    expect(DB.campaigns.length).toBe(1)
  })

  it('allows deleting a draft campaign', async () => {
    DB.campaigns = [{ id: CAMPAIGN_ID, tenant_id: TENANT_A, name: 'Spring Promo', status: 'draft' }]
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), params())
    expect(res.status).toBe(200)
    expect(DB.campaigns.length).toBe(0)
  })

  it('404s a nonexistent campaign', async () => {
    DB.campaigns = []
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), params())
    expect(res.status).toBe(404)
  })
})
