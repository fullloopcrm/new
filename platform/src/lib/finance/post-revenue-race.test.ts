/**
 * LEDGER DOUBLE-POST RACE — `postPaymentRevenue` atomic guard.
 *
 * Every ledger poster (`postPaymentRevenue` here, and the sibling
 * post-adjustments.ts / post-labor.ts posters) used to guard against
 * double-posting with a plain `journalEntryExists()` SELECT before the
 * `postJournalEntry()` INSERT (audit finding, 2026-07-13) — backed only by
 * the plain, non-unique `idx_journal_tenant_source` index. Two concurrent
 * posts for the same (tenant, source, source_id) — e.g. a Stripe webhook
 * redelivery racing the first delivery — could both pass the check and both
 * insert a journal entry, double-counting revenue.
 *
 * The fix adds a UNIQUE index (idx_journal_entries_source_unique,
 * 2026_07_13_journal_entries_source_unique.sql) so the INSERT inside
 * `post_journal_entry()` is the atomic decision point. Migration 064 moved
 * dedupe resolution INSIDE the RPC itself: the losing caller gets NULL back
 * (not a 23505 error to catch), and every caller across post-revenue/
 * post-adjustments/post-labor treats that null as
 * `{posted: false, reason: 'already_posted'}` instead of crashing or
 * (pre-fix) silently double-posting.
 *
 * This suite mocks `supabaseAdmin.rpc` directly (the shared fake-supabase.ts
 * harness doesn't model RPC calls) to reproduce the real unique-constraint
 * race for `post_journal_entry`, proving the concurrent-post case is closed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

type RpcCall = { fn: string; params: Record<string, unknown> }

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const postedKeys = new Set<string>()
  const rpcCalls: RpcCall[] = []

  const rpc = async (fn: string, params: Record<string, unknown>) => {
    rpcCalls.push({ fn, params })
    if (fn !== 'post_journal_entry') throw new Error(`unexpected rpc: ${fn}`)
    const key = `${params.p_tenant_id}|${params.p_source}|${params.p_source_id}`
    if (params.p_source_id && postedKeys.has(key)) {
      // migration 064: the RPC resolves the dedupe claim internally and
      // returns NULL, not a 23505 error, for the losing concurrent caller.
      return { data: null, error: null }
    }
    if (params.p_source_id) postedKeys.add(key)
    const id = crypto.randomUUID()
    fake._seed('journal_entries', [
      { id, tenant_id: params.p_tenant_id, source: params.p_source, source_id: params.p_source_id },
    ])
    return { data: id, error: null }
  }

  const admin = { ...fake, rpc }
  return { supabase: admin, supabaseAdmin: admin, __fake: fake, __rpcCalls: rpcCalls, __postedKeys: postedKeys }
})

import { supabaseAdmin } from '@/lib/supabase'
import * as supabaseModule from '@/lib/supabase'
import { postPaymentRevenue } from './post-revenue'

const TENANT_ID = 'tenant-1'
const PAYMENT_ID = 'payment-1'
const BOOKING_ID = 'booking-1'

function seed(overrides: Partial<Row> = {}) {
  const f = supabaseAdmin as unknown as FakeSupabase
  f._store.clear()
  f._seed('payments', [
    {
      id: PAYMENT_ID,
      tenant_id: TENANT_ID,
      amount_cents: 10_000,
      tip_cents: 0,
      status: 'succeeded',
      method: 'card',
      booking_id: BOOKING_ID,
      ...overrides,
    },
  ])
  f._seed('chart_of_accounts', [
    { id: 'coa-1050', tenant_id: TENANT_ID, code: '1050', type: 'asset' },
    { id: 'coa-4000', tenant_id: TENANT_ID, code: '4000', type: 'income' },
    { id: 'coa-4100', tenant_id: TENANT_ID, code: '4100', type: 'income' },
  ])
}

beforeEach(() => {
  seed()
  ;(supabaseModule as unknown as { __postedKeys: Set<string> }).__postedKeys.clear()
})

describe('postPaymentRevenue — concurrent double-post race', () => {
  it('two concurrent posts for the same payment produce exactly one journal entry', async () => {
    const results = await Promise.all([
      postPaymentRevenue({ tenantId: TENANT_ID, paymentId: PAYMENT_ID }),
      postPaymentRevenue({ tenantId: TENANT_ID, paymentId: PAYMENT_ID }),
    ])

    const f = supabaseAdmin as unknown as FakeSupabase
    const entries = f._all('journal_entries').filter((e) => e.source_id === BOOKING_ID)
    expect(entries.length).toBe(1)

    const posted = results.filter((r) => r.posted)
    const skipped = results.filter((r) => !r.posted)
    expect(posted.length).toBe(1)
    expect(skipped.length).toBe(1)
    expect(skipped[0].reason).toBe('already_posted')
  })

  it('a sequential retry after the first post lands is idempotent (no throw, no second entry)', async () => {
    const first = await postPaymentRevenue({ tenantId: TENANT_ID, paymentId: PAYMENT_ID })
    expect(first.posted).toBe(true)

    const second = await postPaymentRevenue({ tenantId: TENANT_ID, paymentId: PAYMENT_ID })
    expect(second.posted).toBe(false)
    expect(second.reason).toBe('already_posted')

    const f = supabaseAdmin as unknown as FakeSupabase
    expect(f._all('journal_entries').filter((e) => e.source_id === BOOKING_ID).length).toBe(1)
  })
})
