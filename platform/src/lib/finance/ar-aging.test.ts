/**
 * Characterization tests for getArAging() — zero coverage before this file
 * despite being the single source of truth for "what's owed to us" on the
 * dashboard homepage and Finance Overview (see file header comment).
 *
 * Locks in current behavior so a future refactor has a safety net:
 *   - balance_cents = total_cents - amount_paid_cents for invoices; a fully
 *     paid or overpaid invoice (balance <= 0) is dropped entirely
 *   - booking balance is the raw (rounded) price — bookings have no partial
 *     payment concept here, so balance == total
 *   - a $0 (or negative) priced booking is dropped
 *   - bucketing is inclusive on both ends: 0-30 Current, 31-60, 61-90, 90+
 *   - a null due_date / start_time reads as 0 days past due (bucket: Current)
 *   - rows are sorted most-overdue first
 *   - buckets[] and total_cents are derived sums over the same rows, so they
 *     always agree with the row-level data
 *
 * NOTE ON THE FAKE: the shared tenant-isolation-harness's `.not()` is a
 * documented no-op (see its file header), so the real
 * `.not('status','in','(paid,void,refunded,draft)')` / payment_status
 * exclusion isn't exercised here — this suite seeds only rows that should
 * already be present post-filter and asserts on the aggregation math that
 * runs after the DB round-trip, which is the part with real money-shaped
 * bugs (off-by-one bucket edges, sign errors, double counting).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { getArAging, AR_AGING_BUCKETS } from './ar-aging'

const TENANT = 'tid-a'

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ invoices: [], bookings: [] })
  holder.from = h.from
})

describe('getArAging — bucket definitions', () => {
  it('pins the four bucket labels and inclusive day ranges', () => {
    expect(AR_AGING_BUCKETS.map((b) => b.label)).toEqual(['Current', '31-60', '61-90', '90+'])
    expect(AR_AGING_BUCKETS[0]).toMatchObject({ minDays: 0, maxDays: 30 })
    expect(AR_AGING_BUCKETS[3]).toMatchObject({ minDays: 91, maxDays: Infinity })
  })
})

describe('getArAging — invoices', () => {
  it('balance_cents = total - amount_paid, and a fully-paid invoice is dropped', async () => {
    h.seed.invoices.push(
      { id: 'inv-1', tenant_id: TENANT, invoice_number: 'INV-1', title: null, total_cents: 10000, amount_paid_cents: 4000, due_date: daysAgoISO(5), contact_name: 'A', contact_email: null, client_id: null, clients: null },
      { id: 'inv-2', tenant_id: TENANT, invoice_number: 'INV-2', title: null, total_cents: 5000, amount_paid_cents: 5000, due_date: daysAgoISO(5), contact_name: 'B', contact_email: null, client_id: null, clients: null },
    )
    const result = await getArAging(TENANT)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ id: 'inv-1', source: 'invoice', balance_cents: 6000 })
  })

  it('a null due_date reads as 0 days past due, bucketed Current', async () => {
    h.seed.invoices.push(
      { id: 'inv-1', tenant_id: TENANT, invoice_number: 'INV-1', title: null, total_cents: 1000, amount_paid_cents: 0, due_date: null, contact_name: 'A', contact_email: null, client_id: null, clients: null },
    )
    const result = await getArAging(TENANT)
    expect(result.rows[0]).toMatchObject({ days_past_due: 0, bucket: 'Current' })
  })

  it('prefers the embedded client name over contact_name when present', async () => {
    h.seed.invoices.push(
      { id: 'inv-1', tenant_id: TENANT, invoice_number: 'INV-1', title: null, total_cents: 1000, amount_paid_cents: 0, due_date: null, contact_name: 'Fallback Name', contact_email: null, client_id: 'c-1', clients: { id: 'c-1', name: 'Real Client', email: null, phone: null } },
    )
    const result = await getArAging(TENANT)
    expect(result.rows[0].client_name).toBe('Real Client')
    expect(result.rows[0].client_id).toBe('c-1')
  })
})

describe('getArAging — bookings', () => {
  it('balance_cents equals the rounded price; balance == total (no partial payment)', async () => {
    h.seed.bookings.push(
      { id: 'bk-12345678', tenant_id: TENANT, status: 'completed', price: 149.6, start_time: daysAgoISO(2), payment_status: 'unpaid', client_id: null, clients: null },
    )
    const result = await getArAging(TENANT)
    expect(result.rows[0]).toMatchObject({ source: 'booking', total_cents: 150, balance_cents: 150, reference: 'B-bk-12345' })
  })

  it('drops a $0 or negative-priced booking entirely', async () => {
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: TENANT, status: 'completed', price: 0, start_time: daysAgoISO(2), payment_status: 'unpaid', client_id: null, clients: null },
      { id: 'bk-2', tenant_id: TENANT, status: 'completed', price: -50, start_time: daysAgoISO(2), payment_status: 'unpaid', client_id: null, clients: null },
    )
    const result = await getArAging(TENANT)
    expect(result.rows).toHaveLength(0)
  })
})

describe('getArAging — bucketing edges (inclusive both ends)', () => {
  it.each([
    [0, 'Current'],
    [30, 'Current'],
    [31, '31-60'],
    [60, '31-60'],
    [61, '61-90'],
    [90, '61-90'],
    [91, '90+'],
    [400, '90+'],
  ])('%i days past due buckets into %s', async (days, expectedBucket) => {
    h = createTenantDbHarness({
      invoices: [{ id: 'inv-1', tenant_id: TENANT, invoice_number: 'INV-1', title: null, total_cents: 1000, amount_paid_cents: 0, due_date: daysAgoISO(days), contact_name: null, contact_email: null, client_id: null, clients: null }],
      bookings: [],
    })
    holder.from = h.from
    const result = await getArAging(TENANT)
    expect(result.rows[0].bucket).toBe(expectedBucket)
  })
})

describe('getArAging — aggregation', () => {
  it('sorts rows most-overdue first, and buckets[]/total_cents agree with row-level data', async () => {
    h.seed.invoices.push(
      { id: 'inv-old', tenant_id: TENANT, invoice_number: 'OLD', title: null, total_cents: 3000, amount_paid_cents: 0, due_date: daysAgoISO(100), contact_name: null, contact_email: null, client_id: null, clients: null },
      { id: 'inv-new', tenant_id: TENANT, invoice_number: 'NEW', title: null, total_cents: 2000, amount_paid_cents: 0, due_date: daysAgoISO(5), contact_name: null, contact_email: null, client_id: null, clients: null },
    )
    const result = await getArAging(TENANT)
    expect(result.rows.map((r) => r.id)).toEqual(['inv-old', 'inv-new'])
    expect(result.total_cents).toBe(5000)
    const current = result.buckets.find((b) => b.label === 'Current')!
    const over90 = result.buckets.find((b) => b.label === '90+')!
    expect(current).toMatchObject({ count: 1, total_cents: 2000 })
    expect(over90).toMatchObject({ count: 1, total_cents: 3000 })
  })

  it('an entityId filter scopes only the invoice query, not bookings (matches current source)', async () => {
    // Regression guard on the current wiring: entityId is passed to
    // invQ.eq('entity_id', ...) only — the bookings query has no entity_id
    // filter at all in the source today. This test pins that asymmetry so a
    // silent behavior change (e.g. someone "fixing" it without updating
    // every caller) shows up as a diff, not a surprise in prod.
    h.seed.invoices.push(
      { id: 'inv-a', tenant_id: TENANT, entity_id: 'ent-1', invoice_number: 'A', title: null, total_cents: 1000, amount_paid_cents: 0, due_date: null, contact_name: null, contact_email: null, client_id: null, clients: null },
      { id: 'inv-b', tenant_id: TENANT, entity_id: 'ent-2', invoice_number: 'B', title: null, total_cents: 1000, amount_paid_cents: 0, due_date: null, contact_name: null, contact_email: null, client_id: null, clients: null },
    )
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: TENANT, status: 'completed', price: 500, start_time: null, payment_status: 'unpaid', client_id: null, clients: null },
    )
    const result = await getArAging(TENANT, 'ent-1')
    expect(result.rows.map((r) => r.id).sort()).toEqual(['bk-1', 'inv-a'])
  })
})
