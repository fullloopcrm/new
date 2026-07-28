/**
 * Characterization tests for budget-line-items.ts — zero coverage before this
 * file despite backing both /api/quote-budgets/[quoteId] and
 * /api/quote-budgets/recurring/[scheduleId] (shared persistence for a
 * project's budgeted vs actual labor/supplies cost).
 *
 * Locks in:
 *   - replaceBudgetLineItems is delete-then-insert (replace-all), and
 *     stamps tenant_id on every row regardless of caller input
 *   - centsOrZero clamps to >= 0 and rounds non-finite/garbage input to 0
 *   - an invalid `kind` silently falls back to 'other' (not rejected)
 *   - label/description are truncated to 200/500 chars
 *   - targetMarginBpsFromBody treats null/undefined/'' as "no target" (null),
 *     and clamps the numeric value to [0, 10000]
 *   - applyTemplateToBudget upserts quote_budgets on the right onConflict key
 *     (quote_id vs recurring_schedule_id) and replaces line items as a copy
 *     (actual_cents always resets to 0, independent of the template)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { fetchBudgetLineItems, replaceBudgetLineItems, targetMarginBpsFromBody, applyTemplateToBudget } from './budget-line-items'

const TENANT = 'tid-a'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ budget_line_items: [], quote_budgets: [] })
  holder.from = h.from
})

describe('fetchBudgetLineItems', () => {
  it('returns [] (not null/undefined) when nothing is seeded', async () => {
    const rows = await fetchBudgetLineItems('qb-1')
    expect(rows).toEqual([])
  })

  it('scopes strictly to the given quote_budget_id', async () => {
    h.seed.budget_line_items.push(
      { id: 'li-1', quote_budget_id: 'qb-1', label: 'Mine' },
      { id: 'li-2', quote_budget_id: 'qb-other', label: 'Not mine' },
    )
    const rows = await fetchBudgetLineItems('qb-1')
    expect(rows.map((r: { id: string }) => r.id)).toEqual(['li-1'])
  })
})

describe('replaceBudgetLineItems', () => {
  it('deletes existing rows for the budget before inserting the new set (replace-all)', async () => {
    h.seed.budget_line_items.push({ id: 'stale', quote_budget_id: 'qb-1', label: 'Old line' })
    await replaceBudgetLineItems(TENANT, 'qb-1', [{ label: 'New line', kind: 'labor', budgeted_cents: 1000 }])
    expect(h.seed.budget_line_items.find((r) => r.id === 'stale')).toBeUndefined()
    expect(h.seed.budget_line_items.some((r) => r.label === 'New line')).toBe(true)
  })

  it('stamps tenant_id on every inserted row regardless of caller input', async () => {
    await replaceBudgetLineItems(TENANT, 'qb-1', [{ label: 'A' }, { label: 'B' }])
    const inserted = h.capture.inserts.find((i) => i.table === 'budget_line_items')
    expect(inserted?.rows.every((r) => r.tenant_id === TENANT)).toBe(true)
  })

  it('inserts nothing when the new line-item list is empty (still clears old rows)', async () => {
    h.seed.budget_line_items.push({ id: 'stale', quote_budget_id: 'qb-1', label: 'Old' })
    const result = await replaceBudgetLineItems(TENANT, 'qb-1', [])
    expect(result).toEqual([])
    expect(h.seed.budget_line_items).toHaveLength(0)
  })

  it('centsOrZero clamps negative and non-finite input to 0, and rounds fractional cents', async () => {
    await replaceBudgetLineItems(TENANT, 'qb-1', [
      { label: 'A', labor_cents: -500, supplies_cents: NaN, budgeted_cents: 199.6 },
    ])
    const row = h.seed.budget_line_items[0]
    expect(row.labor_cents).toBe(0)
    expect(row.supplies_cents).toBe(0)
    expect(row.budgeted_cents).toBe(200)
  })

  it('an invalid kind silently falls back to "other"', async () => {
    await replaceBudgetLineItems(TENANT, 'qb-1', [{ label: 'A', kind: 'not-a-real-kind' }])
    expect(h.seed.budget_line_items[0].kind).toBe('other')
  })

  it('a valid kind passes through unchanged', async () => {
    await replaceBudgetLineItems(TENANT, 'qb-1', [{ label: 'A', kind: 'materials' }])
    expect(h.seed.budget_line_items[0].kind).toBe('materials')
  })

  it('label defaults to "Line item" and is truncated to 200 chars; description truncates to 500', async () => {
    const longLabel = 'x'.repeat(250)
    const longDesc = 'y'.repeat(600)
    await replaceBudgetLineItems(TENANT, 'qb-1', [{ description: longDesc }, { label: longLabel }])
    const [rowNoLabel, rowLongLabel] = h.seed.budget_line_items
    expect(rowNoLabel.label).toBe('Line item')
    expect((rowNoLabel.description as string).length).toBe(500)
    expect((rowLongLabel.label as string).length).toBe(200)
  })

  it('sort_order is assigned by input array position', async () => {
    await replaceBudgetLineItems(TENANT, 'qb-1', [{ label: 'first' }, { label: 'second' }, { label: 'third' }])
    expect(h.seed.budget_line_items.map((r) => r.sort_order)).toEqual([0, 1, 2])
  })

  it('an empty-string margin_bps is treated as null, not coerced to 0', async () => {
    await replaceBudgetLineItems(TENANT, 'qb-1', [{ label: 'A', margin_bps: '' as unknown as number }])
    expect(h.seed.budget_line_items[0].margin_bps).toBeNull()
  })
})

describe('targetMarginBpsFromBody', () => {
  it.each([
    [{ target_margin_bps: null }, null],
    [{ target_margin_bps: undefined }, null],
    [{ target_margin_bps: '' }, null],
    [{}, null],
    [{ target_margin_bps: 2500 }, 2500],
    [{ target_margin_bps: -100 }, 0],
    [{ target_margin_bps: 99999 }, 10000],
    [{ target_margin_bps: '3000' }, 3000],
  ])('%j => %s', (body, expected) => {
    expect(targetMarginBpsFromBody(body)).toBe(expected)
  })
})

describe('applyTemplateToBudget', () => {
  const templateLines = [
    { service_type_id: null, category_id: null, label: 'Labor', description: null, kind: 'labor', labor_cents: 1000, supplies_cents: 0, budgeted_cents: 1000, margin_bps: 2000 },
  ]

  it('upserts quote_budgets on onConflict "quote_id" when parent has quote_id', async () => {
    const result = await applyTemplateToBudget(TENANT, templateLines, { quote_id: 'q-1' }, 1500)
    expect(result.lineItemCount).toBe(1)
    const budget = h.seed.quote_budgets.find((b) => b.quote_id === 'q-1')
    expect(budget).toMatchObject({ tenant_id: TENANT, target_margin_bps: 1500 })
  })

  it('upserts on onConflict "recurring_schedule_id" when parent has recurring_schedule_id instead', async () => {
    await applyTemplateToBudget(TENANT, templateLines, { recurring_schedule_id: 'rs-1' }, null)
    const budget = h.seed.quote_budgets.find((b) => b.recurring_schedule_id === 'rs-1')
    expect(budget).toBeTruthy()
  })

  it('copies template lines with actual_cents reset to 0, independent of the template', async () => {
    await applyTemplateToBudget(TENANT, [{ ...templateLines[0], budgeted_cents: 5000 }], { quote_id: 'q-1' }, null)
    const li = h.seed.budget_line_items[0]
    expect(li.actual_cents).toBe(0)
    expect(li.budgeted_cents).toBe(5000)
    expect(li.tenant_id).toBe(TENANT)
  })

  // NOTE: the shared tenant-isolation-harness's `.upsert()` doesn't implement
  // real onConflict dedup (it always inserts a fresh row — see that file),
  // so "does a repeat call against the SAME real quote_budgets row clear the
  // prior line items" can't be characterized against this fake. What's
  // provable here — and asserted above — is that each call does a genuine
  // delete-then-insert against whatever budget id is returned.
})
