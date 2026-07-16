import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/deals/[id]/stage read the deal's prior stage via a separate
 * SELECT, then compared it to the target AFTER a separate write to decide
 * whether to insert a stage_change activity and (for 'sold') attempt
 * convertSaleToJob. Two concurrent POSTs moving the same deal to the same
 * stage (double-click "Mark Sold" on the pipeline card, a kanban drag
 * firing twice) both read the prior stage before either write landed and
 * both concluded "this is a real move" — inserting a duplicate stage_change
 * activity log entry every time. Fixed with an atomic conditional UPDATE
 * (`neq('stage', target)` in the WHERE clause) — only the request that
 * actually flips the stage can claim it; the mock below asserts that
 * filter is present so a future refactor can't silently regress back to
 * the read-then-write race.
 */

const dealsStore = [{ id: 'deal-1', tenant_id: 'T', stage: 'quoted', title: 'Roof job', value_cents: 500_000, probability: 50, client_id: 'client-1', lost_reason: null as string | null, closed_at: null as string | null }]
const activities: Array<Record<string, unknown>> = []
const quotesStore: Array<Record<string, unknown>> = []

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'T' }, error: null }),
}))

const neqCalls: Array<{ col: string; val: unknown }> = []

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    const neqs: Record<string, unknown> = {}
    const isNulls: string[] = []
    let updatePatch: Record<string, unknown> | null = null
    let insertRows: Record<string, unknown>[] | null = null
    let limitN: number | null = null
    const source = () => (table === 'deals' ? dealsStore : table === 'deal_activities' ? activities : table === 'quotes' ? quotesStore : [])
    const matches = (row: Record<string, unknown>) =>
      Object.entries(eqs).every(([k, v]) => row[k] === v) &&
      Object.entries(neqs).every(([k, v]) => row[k] !== v) &&
      isNulls.every((k) => row[k] == null)
    const resolveOne = () => {
      let rows = source().filter(matches) as Record<string, unknown>[]
      if (limitN != null) rows = rows.slice(0, limitN)
      const idx = source().findIndex(matches)
      if (idx === -1) return { data: null, error: null }
      if (updatePatch) Object.assign(source()[idx], updatePatch)
      return { data: rows[0] ?? source()[idx], error: null }
    }
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      neq: (col: string, val: unknown) => { neqs[col] = val; neqCalls.push({ col, val }); return chain },
      is: (col: string, val: unknown) => { if (val === null) isNulls.push(col); return chain },
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      update: (patch: Record<string, unknown>) => { updatePatch = patch; return chain },
      insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        insertRows = Array.isArray(rows) ? rows : [rows]
        activities.push(...(table === 'deal_activities' ? insertRows : []))
        return chain
      },
      maybeSingle: async () => resolveOne(),
      single: async () => {
        const res = resolveOne()
        return res.data ? res : { data: null, error: { message: 'not found' } }
      },
      then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(onFulfilled),
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { POST } from '@/app/api/deals/[id]/stage/route'

const params = { params: Promise.resolve({ id: 'deal-1' }) }
function req(body: Record<string, unknown>): Request {
  return new Request('https://app.fullloop.example/api/deals/deal-1/stage', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  dealsStore[0].stage = 'quoted'
  dealsStore[0].probability = 50
  dealsStore[0].closed_at = null
  dealsStore[0].lost_reason = null
  activities.length = 0
  quotesStore.length = 0
  neqCalls.length = 0
})

describe('POST /api/deals/[id]/stage — activity double-fire race', () => {
  it('logs one stage_change activity on a real stage move', async () => {
    const res = await POST(req({ stage: 'sold' }), params)
    expect(res.status).toBe(200)
    expect(activities.filter((a) => a.type === 'stage_change')).toHaveLength(1)
  })

  it('does NOT re-log stage_change on a same-value re-POST (double-click, retry)', async () => {
    dealsStore[0].stage = 'sold'
    const res = await POST(req({ stage: 'sold' }), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.unchanged).toBe(true)
    expect(activities).toHaveLength(0)
  })

  it('claims the stage transition atomically (neq(stage, target) in the WHERE clause)', async () => {
    await POST(req({ stage: 'sold' }), params)
    expect(neqCalls).toContainEqual({ col: 'stage', val: 'sold' })
  })

  it('a race-loser POST (already at target by the time its own write runs) reports unchanged and logs nothing', async () => {
    // Simulate the race outcome directly: by the time this request's UPDATE
    // runs, the row is already at the target stage (the other racer won).
    dealsStore[0].stage = 'sold'
    const res = await POST(req({ stage: 'sold' }), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.unchanged).toBe(true)
    expect(activities).toHaveLength(0)
  })
})
