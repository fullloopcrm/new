import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'
import { pricingShapeFor, SERVICE_PRESETS } from '@/lib/industry-presets'

/**
 * F3 end-to-end — the full derivation path from trade preset to billed quote:
 *   SERVICE_PRESETS.dumpster (rate) -> pricingShapeFor('dumpster') (flat/job)
 *   -> service_types row (pricing_model/per_unit/price_cents, exactly as
 *   provision-tenant.ts seeds it) -> team-portal/checkout reads
 *   service_types.pricing_model and bills the FIXED price.
 *
 * Before F3, checkout defaulted every service to 'hourly' and rebilled
 * elapsed-hours × rate at check-out, so a $350 flat "10-Yard Dumpster" rental
 * left on-site for 3 hours would have billed 3h × $69/hr = $207 instead of
 * the flat $350. This drives the REAL checkout route against a service_type
 * row built from the real preset + real pricingShapeFor(), not a stubbed
 * pricing_model, and proves the flat price survives multi-hour elapsed time.
 */

const TENANT = 'tid-dumpster'
const TM = 'tm-1'
const DUMPSTER_SERVICE = SERVICE_PRESETS.dumpster[0] // "10-Yard Dumpster", $350 flat
const dumpsterShape = pricingShapeFor('dumpster')

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('../auth/token', () => ({ verifyToken: () => ({ tid: TENANT, id: TM }) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/payment-processor', () => ({ processPayment: vi.fn(async () => {}) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => {}) }))

import { POST } from './route'

function threeHoursAgoIso(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
}

function seed() {
  return {
    service_types: [
      {
        id: 'st-dumpster',
        tenant_id: TENANT,
        name: DUMPSTER_SERVICE.name,
        pricing_model: dumpsterShape.pricing_model, // 'flat' — as provision-tenant.ts derives it
        per_unit: dumpsterShape.per_unit, // 'job'
        price_cents: Math.round(DUMPSTER_SERVICE.default_hourly_rate * 100), // provision-tenant.ts's exact seed formula → 35000
        min_charge_cents: null,
      },
    ],
    bookings: [
      {
        id: 'bk-dumpster',
        tenant_id: TENANT,
        team_member_id: TM,
        service_type_id: 'st-dumpster',
        check_in_time: threeHoursAgoIso(),
        hourly_rate: 69, // must NOT be used — flat pricing ignores this
        pay_rate: 25,
        team_size: 1,
        max_hours: null,
        price: null, // never set at booking time — checkout must fall back to the service's flat price
        client_id: 'c-1',
        referrer_id: null,
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(body: unknown) {
  return POST(
    new Request('http://t/api/team-portal/checkout', {
      method: 'POST',
      headers: { authorization: 'Bearer tok' },
      body: JSON.stringify(body),
    }),
  )
}

describe('team-portal/checkout — F3 flat/per-unit pricing end-to-end (dumpster)', () => {
  it('bills the flat $350 preset price after 3 hours on-site, not elapsed-hours × rate', async () => {
    const res = await post({ booking_id: 'bk-dumpster' })
    const body = await res.json()

    expect(res.status).toBe(200)
    // Flat price from the preset, unchanged by elapsed time.
    expect(body.client_total).toBe(DUMPSTER_SERVICE.default_hourly_rate)
    expect(body.client_total).toBe(350)

    // What a wrongly-hourly derivation would have produced: 3h billed × $69/hr = $207.
    // Prove the flat quote is NOT that per-hour number.
    const wrongHourlyTotal = 3 * (69 as number)
    expect(body.client_total).not.toBe(wrongHourlyTotal)

    // Persisted price on the booking matches the flat quote too.
    expect(h.seed.bookings.find(b => b.id === 'bk-dumpster')!.price).toBe(35000)
  })
})
