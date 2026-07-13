import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — client/bookings/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') excludes a foreign tenant's
 * client-dedup rows AND bookings, even when they share the same email/phone
 * or client_id shape as the requesting tenant's own data.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>, ilikes: Record<string, string>, ins: Record<string, unknown[]>) {
  for (const [k, v] of Object.entries(eqs)) if (row[k] !== v) return false
  for (const [k, v] of Object.entries(ilikes)) if (String(row[k] ?? '').toLowerCase() !== v.toLowerCase()) return false
  for (const [k, vals] of Object.entries(ins)) if (!vals.includes(row[k])) return false
  return true
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const ilikes: Record<string, string> = {}
  const ins: Record<string, unknown[]> = {}
  let gteCol: string | null = null, gteVal: unknown = null
  let ltCol: string | null = null, ltVal: unknown = null
  let neqCol: string | null = null, neqVal: unknown = null
  let limitN: number | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    ilike: (col: string, val: string) => { ilikes[col] = val; return chain },
    in: (col: string, vals: unknown[]) => { ins[col] = vals; return chain },
    gte: (col: string, val: unknown) => { gteCol = col; gteVal = val; return chain },
    lt: (col: string, val: unknown) => { ltCol = col; ltVal = val; return chain },
    neq: (col: string, val: unknown) => { neqCol = col; neqVal = val; return chain },
    order: () => chain,
    limit: (n: number) => { limitN = n; return chain },
    single: async () => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs, ilikes, ins))
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}` } }
      return { data: rows[0], error: null }
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      let rows = (store[table] || []).filter((r) => matches(r, eqs, ilikes, ins))
      if (gteCol) rows = rows.filter((r) => (r[gteCol as string] as string) >= (gteVal as string))
      if (ltCol) rows = rows.filter((r) => (r[ltCol as string] as string) < (ltVal as string))
      if (neqCol) rows = rows.filter((r) => r[neqCol as string] !== neqVal)
      if (limitN !== null) rows = rows.slice(0, limitN)
      return resolve({ data: rows, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenantId: string

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: currentTenantId }),
}))

vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => ({ clientId: 'client-a' }),
}))

import { GET } from './route'

const NOW = '2026-07-12T00:00:00.000Z'

beforeEach(() => {
  store = {
    clients: [
      { id: 'client-a', tenant_id: 'tenant-A', email: 'shared@example.com', phone: '5551234567', do_not_service: false },
      { id: 'client-a-dup', tenant_id: 'tenant-A', email: 'SHARED@example.com', phone: null, do_not_service: false },
      { id: 'client-b', tenant_id: 'tenant-B', email: 'shared@example.com', phone: '5551234567', do_not_service: false },
    ],
    bookings: [
      { id: 'bk-a-future', tenant_id: 'tenant-A', client_id: 'client-a', status: 'scheduled', start_time: '2099-01-01' },
      { id: 'bk-a-dup-future', tenant_id: 'tenant-A', client_id: 'client-a-dup', status: 'scheduled', start_time: '2099-01-02' },
      { id: 'bk-b-future', tenant_id: 'tenant-B', client_id: 'client-b', status: 'scheduled', start_time: '2099-01-03' },
      // Same client_id as tenant A's own client ('client-a') but owned by
      // tenant B — a legacy cross-tenant id collision. This is the row that
      // WOULD leak into `.in('client_id', clientIds)` if the tenantDb wrapper
      // didn't also append .eq('tenant_id', …).
      { id: 'bk-b-leak', tenant_id: 'tenant-B', client_id: 'client-a', status: 'scheduled', start_time: '2099-01-05' },
    ],
  }
  currentTenantId = 'tenant-A'
})

function req(): Request {
  return new Request('http://x/api/client/bookings?client_id=client-a')
}

describe('client/bookings GET — tenantDb isolation', () => {
  it("email-dedup never pulls in tenant B's client row, even though it shares the SAME email", async () => {
    const res = await GET(req())
    const body = await res.json()
    const ids = (body.upcoming as Row[]).map((b) => b.id)
    expect(ids).toContain('bk-a-future')
    expect(ids).toContain('bk-a-dup-future') // legit same-tenant dedup match
    expect(ids).not.toContain('bk-b-future') // cross-tenant leak would show here
  })

  it("bookings list never returns tenant B's booking EVEN WHEN it shares the exact same client_id as tenant A's own client (legacy id collision) — proves .eq('tenant_id') is load-bearing, not just .in(client_id)", async () => {
    const res = await GET(req())
    const body = await res.json()
    const allIds = [...(body.upcoming as Row[]), ...(body.past as Row[])].map((b) => b.id)
    expect(allIds).not.toContain('bk-b-future')
    expect(allIds).not.toContain('bk-b-leak')
  })
})
