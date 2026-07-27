import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Tests the isolation canary added to tenantDb() in tenant-db.ts: after a
 * select resolves, every row's (and every embedded relation's) tenant_id is
 * checked against the tenant the query was scoped to. A mismatch fires
 * reportTenantIsolationBreach() — this proves the alarm actually rings, not
 * just that it compiles.
 *
 * tenant-db.test.ts's mock never implements `.then()` (its tests never await
 * the builder), so it can't exercise this path — this file uses a separate
 * mock that resolves to a caller-controlled payload, standing in for "the
 * .eq('tenant_id', …) filter didn't hold" or "an embedded relation carried a
 * foreign tenant's row" — both real failure modes the guard exists to catch.
 */

const { nextResult, reportedBreaches } = vi.hoisted(() => ({
  nextResult: { current: { data: null as unknown, error: null as unknown } },
  reportedBreaches: [] as unknown[],
}))

vi.mock('@/lib/tenant-isolation-alert', () => ({
  reportTenantIsolationBreach: (input: unknown) => {
    reportedBreaches.push(input)
    return Promise.resolve()
  },
}))

vi.mock('@/lib/supabase', () => {
  function makeBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = {}
    builder.eq = () => builder
    builder.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
      Promise.resolve(nextResult.current).then(onfulfilled, onrejected)
    return builder
  }
  return {
    supabaseAdmin: {
      from: () => ({
        select: () => makeBuilder(),
      }),
    },
  }
})

// Import AFTER the mocks are registered.
import { tenantDb } from './tenant-db'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

beforeEach(() => {
  reportedBreaches.length = 0
  nextResult.current = { data: null, error: null }
})

describe('tenantDb select — isolation canary', () => {
  it('does NOT fire when every row matches the requested tenant', async () => {
    nextResult.current = { data: [{ id: '1', tenant_id: TENANT_A }], error: null }
    await tenantDb(TENANT_A).from('bookings').select('*')
    expect(reportedBreaches).toEqual([])
  })

  it('fires when a top-level row belongs to a different tenant', async () => {
    nextResult.current = { data: [{ id: '1', tenant_id: TENANT_B }], error: null }
    await tenantDb(TENANT_A).from('bookings').select('*')
    expect(reportedBreaches).toEqual([
      { requestedTenantId: TENANT_A, leakedTenantId: TENANT_B, table: 'bookings', rowIds: ['1'] },
    ])
  })

  it('fires when an EMBEDDED relation belongs to a different tenant (the documented FK-embed leak pattern)', async () => {
    // Mirrors the exact shape flagged in api/bookings/route.ts's comments:
    // a booking correctly scoped to tenant A, but with a client_properties
    // embed carrying tenant B's row via a dangling foreign key.
    nextResult.current = {
      data: [{ id: '1', tenant_id: TENANT_A, client_properties: [{ id: 'p1', tenant_id: TENANT_B }] }],
      error: null,
    }
    await tenantDb(TENANT_A).from('bookings').select('*, client_properties(*)')
    expect(reportedBreaches).toEqual([
      { requestedTenantId: TENANT_A, leakedTenantId: TENANT_B, table: 'bookings', rowIds: ['p1'] },
    ])
  })

  it('does not fire on an error response, even if data happens to look mismatched', async () => {
    nextResult.current = { data: [{ id: '1', tenant_id: TENANT_B }], error: { message: 'boom' } }
    await tenantDb(TENANT_A).from('bookings').select('*')
    expect(reportedBreaches).toEqual([])
  })

  it('groups multiple mismatched rows from the same foreign tenant into one report', async () => {
    nextResult.current = {
      data: [
        { id: '1', tenant_id: TENANT_B },
        { id: '2', tenant_id: TENANT_B },
      ],
      error: null,
    }
    await tenantDb(TENANT_A).from('bookings').select('*')
    expect(reportedBreaches).toEqual([
      { requestedTenantId: TENANT_A, leakedTenantId: TENANT_B, table: 'bookings', rowIds: ['1', '2'] },
    ])
  })

  it('does not strip the force-widened tenant_id off rows for a narrow select — it is a no-op against real PostgREST and several tests share a fake that always returns full rows', async () => {
    nextResult.current = { data: [{ id: '1', tenant_id: TENANT_A, price: 500 }], error: null }
    const { data } = await tenantDb(TENANT_A).from('bookings').select('price')
    expect(data).toEqual([{ id: '1', tenant_id: TENANT_A, price: 500 }])
  })

  it('keeps tenant_id on the returned row when the caller explicitly selected it', async () => {
    nextResult.current = { data: [{ id: '1', tenant_id: TENANT_A }], error: null }
    const { data } = await tenantDb(TENANT_A).from('bookings').select('id, tenant_id')
    expect(data).toEqual([{ id: '1', tenant_id: TENANT_A }])
  })
})
