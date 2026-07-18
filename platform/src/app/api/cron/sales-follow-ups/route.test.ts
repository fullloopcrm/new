import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * sales-follow-ups cron — deals.stage, not deals.status.
 *
 * `deals` has no `status` column (migration 2026_07_03_sales_pipeline_unify.sql
 * locked the pipeline to a single `stage` field: new/qualifying/quoted/pending/
 * sold/lost). The route was querying `.eq('status', 'active')` — a column that
 * doesn't exist on `deals` — so PostgREST returned an error on every run and
 * the cron 500'd for every tenant, every time. nycmaid's own `stage='active'`
 * (its 3-value active/booked/removed spine) has no single equivalent stage
 * here; it maps to "not yet closed": stage NOT IN (sold, lost).
 */

const notified: Array<{ tenantId: string; type: string; message: string }> = []
const smsedAdmins: string[] = []

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async (args: { tenantId: string; type: string; message: string }) => {
    notified.push({ tenantId: args.tenantId, type: args.type, message: args.message })
    return { success: true }
  }),
}))

vi.mock('@/lib/nycmaid/admin-contacts', () => ({
  smsAdmins: vi.fn(async (msg: string) => {
    smsedAdmins.push(msg)
  }),
}))

vi.mock('@/lib/nycmaid/tenant', () => ({
  isNycMaid: (tenantId: string | null | undefined) => tenantId === NYCMAID_TENANT_ID,
}))

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_TENANT_ID = 't-other'

let dealsRows: Array<{
  id: string
  tenant_id: string
  stage: string
  follow_up_at: string
  follow_up_note: string | null
  clients: { name: string; phone: string } | null
}>
let notificationsRows: Array<{ metadata: { deal_id?: string } | null }>
const dealsQueryFilters: { stage?: { op: string; val: unknown } } = {}
// Every tenant this suite exercises is serving by default — this file isn't
// testing the tenantServesSite() gate (see route.status-gate.test.ts for that).
let tenantStatusMap: Record<string, string> = {}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const chain = {
    select: () => chain,
    eq: () => chain,
    lte: () => chain,
    gte: () => chain,
    in: (_col: string, vals: string[]) => {
      eqs.__in = vals
      return chain
    },
    not: (col: string, op: string, val: unknown) => {
      if (table === 'deals' && col === 'stage') dealsQueryFilters.stage = { op, val: String(val) }
      return chain
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'deals') {
        // Simulate real Postgres/PostgREST behavior: filtering by stage
        // excludes sold/lost. A `.eq('status', ...)` call would never reach
        // here in the real DB — it would 400 because the column is absent —
        // but we assert on the filter shape directly below instead of trying
        // to fake a column-not-found error through this fake builder.
        const filtered = dealsRows.filter((d) => !['sold', 'lost'].includes(d.stage))
        return resolve({ data: filtered, error: null })
      }
      if (table === 'notifications') {
        return resolve({ data: notificationsRows, error: null })
      }
      if (table === 'tenants') {
        const ids = (eqs.__in as string[] | undefined) || []
        return resolve({ data: ids.map((id) => ({ id, status: tenantStatusMap[id] ?? 'active' })), error: null })
      }
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/sales-follow-ups', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  dealsRows = []
  notificationsRows = []
  notified.length = 0
  smsedAdmins.length = 0
  dealsQueryFilters.stage = undefined
  tenantStatusMap = {}
})

describe('sales-follow-ups cron — deals.stage filter', () => {
  it('queries deals.stage (not the non-existent deals.status column), excluding sold/lost', async () => {
    const now = new Date()
    dealsRows = [
      {
        id: 'd1',
        tenant_id: NYCMAID_TENANT_ID,
        stage: 'quoted',
        follow_up_at: now.toISOString(),
        follow_up_note: 'call back',
        clients: { name: 'Alice', phone: '+15551234567' },
      },
      {
        id: 'd2',
        tenant_id: NYCMAID_TENANT_ID,
        stage: 'sold',
        follow_up_at: now.toISOString(),
        follow_up_note: 'should be excluded',
        clients: { name: 'Bob', phone: '+15551234568' },
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)

    // Proves the route actually calls .not('stage', 'in', ...) — the fix —
    // rather than the old .eq('status', 'active') which queried a dead column.
    expect(dealsQueryFilters.stage).toEqual({ op: 'in', val: '(sold,lost)' })

    // Only the still-open deal (quoted) gets a follow-up notify; the fake
    // builder's own stage filter proves sold/lost never reach the loop.
    expect(notified).toHaveLength(1)
    expect(notified[0]).toMatchObject({ tenantId: NYCMAID_TENANT_ID, message: 'Alice — call back' })
  })

  it('SMS-alerts nycmaid admins (parity) but not other tenants', async () => {
    const now = new Date()
    dealsRows = [
      {
        id: 'd3',
        tenant_id: NYCMAID_TENANT_ID,
        stage: 'new',
        follow_up_at: now.toISOString(),
        follow_up_note: null,
        clients: { name: 'Carol', phone: '+15551234569' },
      },
      {
        id: 'd4',
        tenant_id: OTHER_TENANT_ID,
        stage: 'new',
        follow_up_at: now.toISOString(),
        follow_up_note: null,
        clients: { name: 'Dave', phone: '+15551234570' },
      },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(body.reminded).toBe(2)
    expect(smsedAdmins).toHaveLength(1)
    expect(smsedAdmins[0]).toContain('Carol')
  })
})
