import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/admin/requests — "Contacted, Not Sold" filter (GET) and the
 * last_contacted_at stamping on stage-move (PATCH), added alongside the
 * cron/lead-followup-nudge digest. Real route logic against a minimal fake
 * partner_requests table.
 */

type Row = Record<string, unknown>

let rows: Row[]

function fakeFrom(table: string) {
  if (table !== 'partner_requests') throw new Error(`unexpected table "${table}"`)

  let mode: 'select' | 'update' = 'select'
  let patch: Row | null = null
  let targetId: unknown = null

  const api: Record<string, unknown> = {
    select: () => api,
    order: () => api,
    single: async () => {
      const row = rows.find((r) => r.id === targetId)
      if (row && mode === 'update') Object.assign(row, patch)
      return { data: row ? { ...row } : null, error: row ? null : { message: 'not found' } }
    },
    update: (p: Row) => { mode = 'update'; patch = p; return api },
    eq: (col: string, val: unknown) => {
      if (mode === 'update' && col === 'id') targetId = val
      return api
    },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      if (mode === 'update') {
        const row = rows.find((r) => r.id === targetId)
        if (row) Object.assign(row, patch)
        return Promise.resolve({ data: null, error: null }).then(res, rej)
      }
      return Promise.resolve({ data: rows.map((r) => ({ ...r })), error: null }).then(res, rej)
    },
  }
  return api
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => fakeFrom(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))
vi.mock('@/lib/lead-fit', () => ({ computeFit: () => ({ score: 0, bucket: 'cold' }) }))
vi.mock('@/lib/sales-contacts', () => ({ upsertSalesContact: async () => null }))

import { GET, PATCH } from './route'

beforeEach(() => {
  rows = [
    { id: 'new-1', business_name: 'New Co', status: 'new', last_contacted_at: null, reviewed_at: null },
    { id: 'contacted-1', business_name: 'Contacted Co', status: 'contacted', last_contacted_at: null, reviewed_at: '2026-08-01T00:00:00Z' },
    { id: 'qualified-1', business_name: 'Qualified Co', status: 'qualified', last_contacted_at: null, reviewed_at: '2026-08-05T00:00:00Z' },
    { id: 'sold-1', business_name: 'Sold Co', status: 'sold', last_contacted_at: null, reviewed_at: '2026-08-10T00:00:00Z' },
    { id: 'lost-1', business_name: 'Lost Co', status: 'lost', last_contacted_at: null, reviewed_at: '2026-08-10T00:00:00Z' },
  ]
})

function getReq(status?: string) {
  const url = status ? `http://t/api/admin/requests?status=${status}` : 'http://t/api/admin/requests'
  return new Request(url) as unknown as import('next/server').NextRequest
}

function patchReq(body: unknown) {
  return new Request('http://t/api/admin/requests', { method: 'PATCH', body: JSON.stringify(body) }) as unknown as import('next/server').NextRequest
}

describe('GET /api/admin/requests — contacted_not_sold', () => {
  it('includes a contacted_not_sold count spanning contacted/qualified/proposed', async () => {
    const res = await GET(getReq())
    const body = await res.json()
    expect(body.counts.contacted_not_sold).toBe(2)
  })

  it('filters to only contacted/qualified/proposed leads, excluding new/sold/lost', async () => {
    const res = await GET(getReq('contacted_not_sold'))
    const body = await res.json()
    const ids = (body.requests as Row[]).map((r) => r.id).sort()
    expect(ids).toEqual(['contacted-1', 'qualified-1'])
  })
})

describe('PATCH /api/admin/requests — last_contacted_at stamping', () => {
  it('stamps last_contacted_at and clears notified flags when moved into "contacted"', async () => {
    const res = await PATCH(patchReq({ id: 'new-1', status: 'contacted' }))
    expect(res.status).toBe(200)
    const row = rows.find((r) => r.id === 'new-1')!
    expect(row.last_contacted_at).toBeTruthy()
    expect(row.notified_7d_at).toBeNull()
  })

  it('does not stamp last_contacted_at when moved to the terminal "sold" stage', async () => {
    const res = await PATCH(patchReq({ id: 'qualified-1', status: 'sold' }))
    expect(res.status).toBe(200)
    const row = rows.find((r) => r.id === 'qualified-1')!
    expect(row.last_contacted_at).toBeNull()
  })

  it('does not stamp last_contacted_at when reopened to "new"', async () => {
    const res = await PATCH(patchReq({ id: 'lost-1', status: 'new' }))
    expect(res.status).toBe(200)
    const row = rows.find((r) => r.id === 'lost-1')!
    expect(row.last_contacted_at).toBeNull()
  })
})
