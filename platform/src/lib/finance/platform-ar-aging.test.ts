/**
 * Characterization tests for platformArAging() — zero coverage before this
 * file. Cross-tenant AR rollup for the platform admin Finance page: same
 * aggregation shape as ar-aging.ts (see that file's tests for the row-level
 * math), but bucketed per-tenant and platform-wide instead of per-row.
 *
 * Locks in:
 *   - SIM-prefixed tenants are excluded by default (isTestTenant), and
 *     `{ includeTest: true }` brings them back
 *   - byTenant totals are summed per tenant_id and sorted highest-owed-first
 *   - total_cents / buckets[] agree with the row-level data
 *   - a $0/negative booking price and a fully-paid invoice never enter the rollup
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('../supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { platformArAging } from './platform-ar-aging'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ invoices: [], bookings: [], tenants: [] })
  holder.from = h.from
})

describe('platformArAging — test-tenant exclusion', () => {
  it('excludes a "SIM " prefixed tenant by default', async () => {
    h.seed.tenants.push({ id: 't-real', name: 'Acme Cleaning' }, { id: 't-sim', name: 'SIM Demo Co' })
    h.seed.invoices.push(
      { tenant_id: 't-real', total_cents: 1000, amount_paid_cents: 0, due_date: null, status: 'sent' },
      { tenant_id: 't-sim', total_cents: 5000, amount_paid_cents: 0, due_date: null, status: 'sent' },
    )
    const result = await platformArAging()
    expect(result.total_cents).toBe(1000)
    expect(result.byTenant.map((t) => t.tenant_id)).toEqual(['t-real'])
  })

  it('{ includeTest: true } brings SIM tenants back into the rollup', async () => {
    h.seed.tenants.push({ id: 't-real', name: 'Acme Cleaning' }, { id: 't-sim', name: 'SIM Demo Co' })
    h.seed.invoices.push(
      { tenant_id: 't-real', total_cents: 1000, amount_paid_cents: 0, due_date: null, status: 'sent' },
      { tenant_id: 't-sim', total_cents: 5000, amount_paid_cents: 0, due_date: null, status: 'sent' },
    )
    const result = await platformArAging({ includeTest: true })
    expect(result.total_cents).toBe(6000)
  })
})

describe('platformArAging — row exclusion (same rules as per-tenant getArAging)', () => {
  it('a fully-paid invoice (balance <= 0) contributes nothing', async () => {
    h.seed.tenants.push({ id: 't-1', name: 'Acme' })
    h.seed.invoices.push({ tenant_id: 't-1', total_cents: 2000, amount_paid_cents: 2000, due_date: null, status: 'sent' })
    const result = await platformArAging()
    expect(result.total_cents).toBe(0)
  })

  it('a $0 or negative-priced booking contributes nothing', async () => {
    h.seed.tenants.push({ id: 't-1', name: 'Acme' })
    h.seed.bookings.push(
      { tenant_id: 't-1', price: 0, start_time: null, payment_status: 'unpaid' },
      { tenant_id: 't-1', price: -20, start_time: null, payment_status: 'unpaid' },
    )
    const result = await platformArAging()
    expect(result.total_cents).toBe(0)
  })
})

describe('platformArAging — byTenant rollup', () => {
  it('sums per tenant_id and sorts highest-owed first', async () => {
    h.seed.tenants.push({ id: 't-a', name: 'Alpha' }, { id: 't-b', name: 'Beta' })
    h.seed.invoices.push(
      { tenant_id: 't-a', total_cents: 1000, amount_paid_cents: 0, due_date: null, status: 'sent' },
      { tenant_id: 't-b', total_cents: 5000, amount_paid_cents: 0, due_date: null, status: 'sent' },
    )
    const result = await platformArAging()
    expect(result.byTenant).toEqual([
      { tenant_id: 't-b', tenant_name: 'Beta', total_cents: 5000 },
      { tenant_id: 't-a', tenant_name: 'Alpha', total_cents: 1000 },
    ])
  })

  it('falls back to the first 8 chars of tenant_id when no tenants row matches', async () => {
    h.seed.invoices.push({ tenant_id: 'unknown-tenant-id', total_cents: 500, amount_paid_cents: 0, due_date: null, status: 'sent' })
    const result = await platformArAging()
    expect(result.byTenant[0]).toMatchObject({ tenant_name: 'unknown-' })
  })

  it('buckets[] total_cents agrees with the sum of total_cents across the rollup', async () => {
    h.seed.tenants.push({ id: 't-a', name: 'Alpha' })
    h.seed.invoices.push({ tenant_id: 't-a', total_cents: 3000, amount_paid_cents: 0, due_date: null, status: 'sent' })
    const result = await platformArAging()
    const bucketSum = result.buckets.reduce((s, b) => s + b.amount_cents, 0)
    expect(bucketSum).toBe(result.total_cents)
    expect(result.total_cents).toBe(3000)
  })
})
