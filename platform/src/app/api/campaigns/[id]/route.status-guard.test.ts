import { describe, it, expect, vi } from 'vitest'

/**
 * PUT /api/campaigns/[id] had zero status guard, unlike DELETE (see
 * route.delete-guard.test.ts). Any campaigns.create-permitted user could PUT
 * status:'draft' onto an already-sent/sending campaign, re-arming the
 * atomic claim in send/route.ts for a real re-send (double-billed emails/SMS
 * to the whole audience), or silently rewrite subject/body/recipient_filter
 * on a campaign that already went out, falsifying the campaign_recipients
 * audit trail. This proves the CAS guard closes both paths.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CAMPAIGN_ID = 'camp1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let mode: 'select' | 'update' = 'select'
  let updatePayload: Row = {}
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => {
      filters.push((r) => r[col] === val)
      return c
    },
    neq: (col: string, val: unknown) => {
      filters.push((r) => r[col] !== val)
      return c
    },
    update: (fields: Row) => {
      mode = 'update'
      updatePayload = fields
      return c
    },
    single: () => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (mode === 'update') {
        rows.forEach((r) => Object.assign(r, updatePayload))
      }
      return Promise.resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'not found' } })
    },
    maybeSingle: () => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (mode === 'update') {
        rows.forEach((r) => Object.assign(r, updatePayload))
      }
      return Promise.resolve({ data: rows[0] || null, error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A, tenant: {} }, error: null }),
}))

import { PUT } from './route'

function params() {
  return { params: Promise.resolve({ id: CAMPAIGN_ID }) }
}

function putRequest(body: Record<string, unknown>) {
  return new Request('http://localhost', { method: 'PUT', body: JSON.stringify(body) })
}

describe('PUT /api/campaigns/[id] — status guard', () => {
  it('409s editing a sent campaign (blocks status reset + content rewrite)', async () => {
    DB.campaigns = [{ id: CAMPAIGN_ID, tenant_id: TENANT_A, name: 'Spring Promo', status: 'sent' }]
    const res = await PUT(putRequest({ status: 'draft' }), params())
    expect(res.status).toBe(409)
    expect(DB.campaigns[0].status).toBe('sent')
  })

  it('409s editing a currently-sending campaign', async () => {
    DB.campaigns = [{ id: CAMPAIGN_ID, tenant_id: TENANT_A, name: 'Spring Promo', status: 'sending' }]
    const res = await PUT(putRequest({ subject: 'new subject' }), params())
    expect(res.status).toBe(409)
    expect(DB.campaigns[0].subject).toBeUndefined()
  })

  it('allows editing a draft campaign', async () => {
    DB.campaigns = [{ id: CAMPAIGN_ID, tenant_id: TENANT_A, name: 'Spring Promo', status: 'draft' }]
    const res = await PUT(putRequest({ subject: 'Updated subject' }), params())
    expect(res.status).toBe(200)
    expect(DB.campaigns[0].subject).toBe('Updated subject')
  })

  it('404s a nonexistent campaign', async () => {
    DB.campaigns = []
    const res = await PUT(putRequest({ subject: 'x' }), params())
    expect(res.status).toBe(404)
  })
})
