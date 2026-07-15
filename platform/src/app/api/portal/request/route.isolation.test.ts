import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — portal/request/route.ts (docs/adr/0004).
 * Proves the open-deal lookup/update/insert are all scoped to the
 * AUTHENTICATED tenant (auth.tid from the verified portal token) — a
 * different tenant's open deal for the SAME client_id can never be reused or
 * mutated, and a new deal is always stamped with the authenticated tenant.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>, ins: Record<string, unknown[]>) {
  for (const [k, v] of Object.entries(eqs)) if (row[k] !== v) return false
  for (const [k, vals] of Object.entries(ins)) if (!vals.includes(row[k])) return false
  return true
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const ins: Record<string, unknown[]> = {}
  let op: 'select' | 'insert' | 'update' = 'select'
  let payload: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    in: (col: string, vals: unknown[]) => { ins[col] = vals; return chain },
    order: () => chain,
    insert: (row: Row) => { op = 'insert'; payload = row; return chain },
    update: (values: Row) => { op = 'update'; payload = values; return chain },
    single: async () => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs, ins))
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}` } }
      return { data: rows[0], error: null }
    },
    maybeSingle: async () => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs, ins))
      if (rows.length > 1) return { data: null, error: { message: `Expected 0-1 rows, got ${rows.length}` } }
      return { data: rows[0] ?? null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
      if (op === 'insert') {
        const inserted = { id: `new-${(store[table] || []).length + 1}`, ...(payload as Row) }
        store[table] = [...(store[table] || []), inserted]
        return resolve({ data: inserted, error: null })
      }
      if (op === 'update') {
        const updated: Row[] = []
        store[table] = (store[table] || []).map((r) => {
          if (!matches(r, eqs, ins)) return r
          const merged = { ...r, ...(payload as Row) }
          updated.push(merged)
          return merged
        })
        return resolve({ data: updated, error: null })
      }
      const rows = (store[table] || []).filter((r) => matches(r, eqs, ins))
      return resolve({ data: rows, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentAuth: { id: string; tid: string } | null

vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

vi.mock('@/lib/messaging/owner-alerts', () => ({
  ownerAlert: async () => {},
}))

import { POST } from './route'

beforeEach(() => {
  store = {
    clients: [{ id: 'client-a', tenant_id: 'tenant-A', name: 'Alice' }],
    deals: [],
  }
  currentAuth = { id: 'client-a', tid: 'tenant-A' }
})

function req(body: Record<string, unknown> = { service_name: 'Repair' }): import('next/server').NextRequest {
  return new Request('http://x/api/portal/request', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
}

describe('portal/request POST — tenantDb isolation', () => {
  it("never reuses a DIFFERENT tenant's open deal for the same client_id/stage — inserts a NEW deal stamped with the authenticated tenant instead", async () => {
    store.deals = [
      { id: 'deal-b', tenant_id: 'tenant-B', client_id: 'client-a', stage: 'new', notes: "B's deal — must not be touched", created_at: '2026-01-01' },
    ]
    const res = await POST(req())
    expect(res.status).toBe(200)

    expect(store.deals.length).toBe(2) // the B deal survives untouched + a new A deal was inserted
    const bDeal = store.deals.find((d) => d.id === 'deal-b')!
    expect(bDeal.notes).toBe("B's deal — must not be touched")

    const newDeal = store.deals.find((d) => d.id !== 'deal-b')!
    expect(newDeal.tenant_id).toBe('tenant-A')
    expect(newDeal.client_id).toBe('client-a')
  })

  it("reuses tenant A's OWN open deal (positive control) — no duplicate created", async () => {
    store.deals = [
      { id: 'deal-a', tenant_id: 'tenant-A', client_id: 'client-a', stage: 'new', notes: 'existing', created_at: '2026-01-01' },
    ]
    const res = await POST(req({ service_name: 'Follow-up' }))
    expect(res.status).toBe(200)

    expect(store.deals.length).toBe(1)
    expect(store.deals[0].notes).toContain('existing')
    expect(store.deals[0].notes).toContain('Follow-up')
  })
})
