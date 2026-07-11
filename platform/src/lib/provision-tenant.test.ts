import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * provisionTenant — what gets written to service_types + selena_config.
 *
 * F1: project/lead verticals are seeded funnel_mode='pipeline' (quote-first).
 * F3: flat/per-unit trades are seeded pricing_model='flat' + a real per_unit so
 *     checkout/invoice math bills the FIXED price, not elapsed-hours × rate.
 *
 * Supabase is mocked with a thenable query builder: the tenant fetch resolves via
 * .single(); the service-count / insert / update chains resolve when awaited.
 */

let tenantRow: Record<string, unknown> | null
let insertedServiceRows: Array<Record<string, unknown>>
let selenaUpdate: Record<string, unknown> | null

function from(table: string) {
  let mode: 'countHead' | 'insert' | 'update' | 'select' = 'select'
  let insertRows: Array<Record<string, unknown>> = []
  let updatePatch: Record<string, unknown> | null = null
  const chain = {
    select: (_cols?: unknown, o?: { head?: boolean }) => {
      if (o && o.head) mode = 'countHead'
      return chain
    },
    insert: (rows: Array<Record<string, unknown>>) => {
      mode = 'insert'
      insertRows = rows
      return chain
    },
    update: (patch: Record<string, unknown>) => {
      mode = 'update'
      updatePatch = patch
      return chain
    },
    eq: () => chain,
    single: async () => ({ data: table === 'tenants' ? tenantRow : null, error: null }),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      let out: unknown
      if (mode === 'countHead') {
        out = { count: 0, error: null } // no existing services → seed
      } else if (mode === 'insert') {
        if (table === 'service_types') insertedServiceRows = insertRows
        out = { data: insertRows.map((_, i) => ({ id: `svc_${i}` })), error: null }
      } else if (mode === 'update') {
        if (table === 'tenants' && updatePatch && 'selena_config' in updatePatch) {
          selenaUpdate = updatePatch.selena_config as Record<string, unknown>
        }
        out = { data: null, error: null }
      } else {
        out = { data: null, error: null }
      }
      return Promise.resolve(out).then(res, rej)
    },
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from },
  supabase: { from },
}))

import { provisionTenant } from './provision-tenant'

beforeEach(() => {
  insertedServiceRows = []
  selenaUpdate = null
  tenantRow = {
    id: 't1', name: 'Test Co',
    business_hours: null, payment_methods: null, guidelines_en: null, selena_config: null,
  }
})

describe('provisionTenant — flat/per-unit pricing (F3)', () => {
  it('seeds a dumpster tenant flat/per-job, never $/hr', async () => {
    await provisionTenant({ tenantId: 't1', industry: 'dumpster' })

    expect(insertedServiceRows.length).toBeGreaterThan(0)
    for (const row of insertedServiceRows) {
      expect(row.pricing_model).toBe('flat')
      expect(row.per_unit).toBe('job')
      // price_cents mirrors the (flat) rate — a 10-yard @ $350 → 35000¢.
      expect(row.price_cents).toBe(Math.round((row.default_hourly_rate as number) * 100))
    }
    const rows = (selenaUpdate?.pricing_rows as Array<{ price: string }>) || []
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.price.endsWith(' flat')).toBe(true)
  })

  it('junk "Half Truckload" is flat so checkout will not bill 2h × rate', async () => {
    await provisionTenant({ tenantId: 't1', industry: 'junk_removal' })
    const half = insertedServiceRows.find((r) => r.name === 'Half Truckload')
    expect(half).toBeDefined()
    expect(half!.pricing_model).toBe('flat')
    expect(half!.per_unit).toBe('job')
    expect(half!.price_cents).toBe(15000) // $150 flat, not 2h × $150
  })

  it('a genuinely hourly trade (cleaning) stays hourly', async () => {
    await provisionTenant({ tenantId: 't1', industry: 'cleaning' })
    for (const row of insertedServiceRows) {
      expect(row.pricing_model).toBe('hourly')
      expect(row.per_unit).toBe('hour')
    }
    const rows = (selenaUpdate?.pricing_rows as Array<{ price: string }>) || []
    for (const r of rows) expect(r.price.endsWith('/hr')).toBe(true)
  })
})

describe('provisionTenant — funnel seeding (F1)', () => {
  it('seeds a project vertical (roofing) as quote-first (pipeline)', async () => {
    await provisionTenant({ tenantId: 't1', industry: 'roofing' })
    expect(selenaUpdate?.funnel_mode).toBe('pipeline')
  })

  it('seeds a booking trade (dumpster) as booking', async () => {
    await provisionTenant({ tenantId: 't1', industry: 'dumpster' })
    expect(selenaUpdate?.funnel_mode).toBe('booking')
  })
})
