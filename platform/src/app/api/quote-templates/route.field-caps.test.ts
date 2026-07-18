import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/quote-templates previously inserted body.line_items raw (no
 * array-length cap, no per-item field cap, not even normalizeLineItems's
 * subtotal recompute) and name/industry/title_template/description/terms
 * with no length cap. Templates get loaded into the quote builder as a
 * starting point, so an oversized/garbage template silently propagates into
 * every quote built from it. Same caps applied here as on quotes/route.ts.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

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
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'manager', tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'
import { MAX_LINE_ITEMS } from '@/lib/quote'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('/api/quote-templates POST — field caps', () => {
  beforeEach(() => {
    DB.quote_templates = []
  })

  it('truncates an oversized name/terms instead of storing it unbounded', async () => {
    const res = await POST(postReq({ name: 'N'.repeat(9999), terms: 'X'.repeat(99999) }))
    expect(res.status).toBe(200)
    const { template } = await res.json()
    expect(template.name.length).toBe(200)
    expect(template.terms.length).toBe(10000)
  })

  it('caps line_items array length and per-item field length', async () => {
    const oversized = Array.from({ length: MAX_LINE_ITEMS + 100 }, (_, i) => ({
      name: 'X'.repeat(5000), quantity: 1, unit_price_cents: 100,
    }))
    const res = await POST(postReq({ name: 'Standard Clean', line_items: oversized }))
    expect(res.status).toBe(200)
    const { template } = await res.json()
    expect(template.line_items).toHaveLength(MAX_LINE_ITEMS)
    expect(template.line_items[0].name.length).toBe(200)
  })
})
