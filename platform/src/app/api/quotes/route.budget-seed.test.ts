/**
 * Budget set AT PROPOSAL TIME — POST /api/quotes and PATCH /api/quotes/[id]
 * should seed quote_budgets from the tenant's service_types templates the
 * moment line items exist, not only when someone later visits the
 * standalone Master Budget page. See lib/budget-template.ts's
 * seedQuoteBudgetFromTemplate.
 *
 * Uses a self-contained inline mock (same shape as route.field-caps.test.ts)
 * rather than the shared test/fake-supabase.ts, since that fake's upsert()
 * doesn't simulate ON CONFLICT semantics (by design — "deliberately dumb",
 * scoped to the cross-tenant suite) and this test needs real
 * ignoreDuplicates/onConflict behavior to prove the no-clobber guarantee.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const TENANT = 'tenant-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = { quotes: [], service_types: [], quote_budgets: [], quote_activity: [] }
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' | 'upsert' = 'read'
    let payload: Row | Row[] = {}
    let onConflict: string | undefined
    let ignoreDuplicates = false
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    function doUpsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const results: Row[] = []
      for (const row of rows) {
        const conflictVal = onConflict ? row[onConflict] : undefined
        const existing = onConflict
          ? (store[table] || []).find((r) => r[onConflict as string] === conflictVal)
          : undefined
        if (existing) {
          if (!ignoreDuplicates) Object.assign(existing, row)
          results.push(existing)
        } else {
          const inserted = { id: row.id ?? genId(table), ...row }
          store[table] = [...(store[table] || []), inserted]
          results.push(inserted)
        }
      }
      return results
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      upsert: (p: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) => {
        kind = 'upsert'; payload = p; onConflict = opts?.onConflict; ignoreDuplicates = !!opts?.ignoreDuplicates; return c
      },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        if (kind === 'upsert') { const [row] = doUpsert(); return { data: row, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        if (kind === 'update') {
          const updated: Row[] = []
          for (const row of store[table] || []) {
            if (match(row)) { Object.assign(row, payload); updated.push(row) }
          }
          return { data: updated[0] ?? null, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { doInsert(); return res({ data: null, error: null }) }
        if (kind === 'upsert') { doUpsert(); return res({ data: null, error: null }) }
        if (kind === 'update') {
          for (const row of store[table] || []) if (match(row)) Object.assign(row, payload)
          return res({ data: null, error: null })
        }
        return res({ data: (store[table] || []).filter(match), error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/quote', async (orig) => {
  const actual = await orig<typeof import('@/lib/quote')>()
  return {
    ...actual,
    generateQuoteNumber: async () => 'Q-TEST-0001',
    logQuoteEvent: async () => {},
  }
})

import { POST as CREATE } from '@/app/api/quotes/route'
import { PATCH as UPDATE } from '@/app/api/quotes/[id]/route'

function seedServiceType() {
  store.service_types.push({
    id: 'svc-1',
    tenant_id: TENANT,
    name: 'Deep Clean',
    cost_cents: 500,
    default_duration_hours: 2,
    default_labor_rate_cents: 3000,
    default_overhead_cents: 1000,
    default_target_margin_bps: 3500,
  })
}

function createReq(body: Row): Request {
  return new Request('http://t.test/api/quotes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function patchReq(body: Row): Request {
  return new Request('http://t.test/api/quotes/q1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/quotes — seeds quote_budgets from service_types templates', () => {
  beforeEach(() => {
    store.quotes = []
    store.service_types = []
    store.quote_budgets = []
    store.quote_activity = []
    idSeq = 0
  })

  it('creates a budget row from matched line items at proposal creation time', async () => {
    seedServiceType()

    const res = await CREATE(createReq({ line_items: [{ name: 'Deep Clean', quantity: 2, unit_price_cents: 10000 }] }))
    const body = await res.json()
    expect(res.status).toBe(200)

    expect(store.quote_budgets).toHaveLength(1)
    const budget = store.quote_budgets[0]
    expect(budget.quote_id).toBe(body.quote.id)
    // labor: 2h * 3000c * qty2 = 12000; materials: 500c * qty2 = 1000; other: 1000c * qty2 = 2000
    expect(budget.labor_budget_cents).toBe(12000)
    expect(budget.materials_budget_cents).toBe(1000)
    expect(budget.other_budget_cents).toBe(2000)
    expect(budget.target_margin_bps).toBe(3500)
  })

  it('does not create a budget row when no line item matches a service_types template', async () => {
    seedServiceType()

    await CREATE(createReq({ line_items: [{ name: 'Unmatched Item', quantity: 1, unit_price_cents: 5000 }] }))

    expect(store.quote_budgets).toHaveLength(0)
  })
})

describe('PATCH /api/quotes/[id] — seeds quote_budgets once line items land on a draft', () => {
  beforeEach(() => {
    store.quotes = []
    store.service_types = []
    store.quote_budgets = []
    store.quote_activity = []
    idSeq = 0
  })

  it('seeds a budget when line items are added to a quote created blank', async () => {
    seedServiceType()
    store.quotes.push({ id: 'q1', tenant_id: TENANT, status: 'draft', line_items: [] })

    const res = await UPDATE(patchReq({ line_items: [{ name: 'Deep Clean', quantity: 1, unit_price_cents: 10000 }] }), {
      params: Promise.resolve({ id: 'q1' }),
    })
    expect(res.status).toBe(200)

    expect(store.quote_budgets).toHaveLength(1)
    expect(store.quote_budgets[0].quote_id).toBe('q1')
  })

  it('never overwrites an existing budget row (e.g. manually edited on the Master Budget page)', async () => {
    seedServiceType()
    store.quotes.push({ id: 'q1', tenant_id: TENANT, status: 'draft', line_items: [] })
    store.quote_budgets.push({
      id: 'b1',
      tenant_id: TENANT,
      quote_id: 'q1',
      labor_budget_cents: 999999,
      materials_budget_cents: 0,
      other_budget_cents: 0,
      labor_actual_cents: 500,
      materials_actual_cents: 0,
      other_actual_cents: 0,
    })

    await UPDATE(patchReq({ line_items: [{ name: 'Deep Clean', quantity: 1, unit_price_cents: 10000 }] }), {
      params: Promise.resolve({ id: 'q1' }),
    })

    expect(store.quote_budgets).toHaveLength(1)
    expect(store.quote_budgets[0].labor_budget_cents).toBe(999999)
    expect(store.quote_budgets[0].labor_actual_cents).toBe(500)
  })
})
