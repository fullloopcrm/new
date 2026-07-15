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
let deleteCalls: Array<{ table: string; ids: unknown[] }>
let updateCalls: Array<{ table: string; patch: Record<string, unknown> }>
let failOn: { table: string; mode: 'countHead' | 'insert' | 'update'; field?: string } | null

function from(table: string) {
  let mode: 'countHead' | 'insert' | 'update' | 'delete' | 'select' = 'select'
  let insertRows: Array<Record<string, unknown>> = []
  let updatePatch: Record<string, unknown> | null = null
  let deleteIds: unknown[] = []
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
    delete: () => {
      mode = 'delete'
      return chain
    },
    in: (_col: string, ids: unknown[]) => {
      deleteIds = ids
      return chain
    },
    eq: () => chain,
    single: async () => ({ data: table === 'tenants' ? tenantRow : null, error: null }),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      let out: unknown
      const field = updatePatch ? Object.keys(updatePatch)[0] : undefined
      const shouldFail =
        failOn && failOn.table === table && failOn.mode === mode && (!failOn.field || failOn.field === field)

      if (shouldFail) {
        out = { data: null, count: null, error: { message: `injected: ${table}.${mode}${field ? `.${field}` : ''}` } }
      } else if (mode === 'countHead') {
        out = { count: 0, error: null } // no existing services → seed
      } else if (mode === 'insert') {
        const inserted = insertRows.map((_, i) => ({ id: `svc_${i}` }))
        if (table === 'service_types') insertedServiceRows = insertRows
        out = { data: inserted, error: null }
      } else if (mode === 'update') {
        updateCalls.push({ table, patch: updatePatch as Record<string, unknown> })
        if (table === 'tenants' && updatePatch && 'selena_config' in updatePatch) {
          selenaUpdate = updatePatch.selena_config as Record<string, unknown>
        }
        out = { data: null, error: null }
      } else if (mode === 'delete') {
        deleteCalls.push({ table, ids: deleteIds })
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
  deleteCalls = []
  updateCalls = []
  failOn = null
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

describe('provisionTenant — atomicity (mid-provision failure rolls back)', () => {
  it('propagates the error instead of silently swallowing it', async () => {
    failOn = { table: 'service_types', mode: 'insert' }
    await expect(provisionTenant({ tenantId: 't1', industry: 'general' })).rejects.toThrow(
      /service_types insert failed/
    )
  })

  it('deletes already-inserted service_types when a later step fails (no partial rows remain)', async () => {
    // service_types insert succeeds, selena_config update succeeds, then
    // business_hours update fails — service_types rows and selena_config must
    // both be compensated (deleted / reverted), not left half-applied.
    failOn = { table: 'tenants', mode: 'update', field: 'business_hours' }

    await expect(provisionTenant({ tenantId: 't1', industry: 'general' })).rejects.toThrow(
      /business_hours update failed/
    )

    // The service_types rows inserted before the failure got a compensating delete
    // for the exact ids that were inserted — no orphaned rows remain.
    expect(insertedServiceRows.length).toBeGreaterThan(0)
    const svcDelete = deleteCalls.find((c) => c.table === 'service_types')
    expect(svcDelete).toBeDefined()
    expect(svcDelete!.ids).toEqual(insertedServiceRows.map((_, i) => `svc_${i}`))

    // selena_config, which was successfully updated before business_hours failed,
    // gets reverted to its pre-provision value (null) rather than left seeded.
    // Two calls touch selena_config: the seed (full object), then the rollback
    // revert (null) — the LAST one must be the revert.
    const selenaUpdates = updateCalls.filter((c) => c.table === 'tenants' && 'selena_config' in c.patch)
    expect(selenaUpdates.length).toBe(2)
    expect(selenaUpdates[selenaUpdates.length - 1].patch.selena_config).toBeNull()

    // Steps that never ran (payment_methods, guidelines_en) were never applied,
    // so there is nothing to roll back for them.
    expect(updateCalls.some((c) => 'payment_methods' in c.patch)).toBe(false)
    expect(updateCalls.some((c) => 'guidelines_en' in c.patch)).toBe(false)
  })

  it('does not attempt to delete service_types when the insert itself is what failed', async () => {
    failOn = { table: 'service_types', mode: 'insert' }
    await expect(provisionTenant({ tenantId: 't1', industry: 'general' })).rejects.toThrow()
    expect(deleteCalls.find((c) => c.table === 'service_types')).toBeUndefined()
  })
})
