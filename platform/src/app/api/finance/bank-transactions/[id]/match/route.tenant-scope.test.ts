import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Defense-in-depth — POST /api/finance/bank-transactions/[id]/match, expense
 * branch. The expense is fetched `.eq('tenant_id', tenantId).eq('id', targetId)`
 * before this branch runs, so `ex.id` is already tenant-verified — not a live
 * cross-tenant bug on the real UUID-PK schema. But the follow-up
 * `expenses.update({ matched_bank_transaction_id })` filtered only
 * `.eq('id', ex.id)`, unlike the sibling `bookings.update(...)` two branches
 * up in this same file, which correctly chains `.eq('tenant_id', tenantId)`.
 * Hardened to match. Synthetic id collision across tenants (see the
 * `void` route's identical test for why) is the only way to make the WRITE's
 * own scope observable here.
 */

const TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const SHARED_EXPENSE_ID = 'exp-shared'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
  getTenantForRequest: vi.fn(),
}))
vi.mock('@/lib/ledger', () => ({
  postJournalEntry: vi.fn(async () => 'je-1'),
  journalEntryExists: vi.fn(async () => true), // skip the CoA-posting branch — irrelevant to this test
}))

import { POST } from './route'

function seed() {
  return {
    bank_transactions: [
      {
        id: 'txn-1',
        tenant_id: TENANT,
        txn_date: '2026-07-01',
        description: 'Vendor debit',
        amount_cents: -5000,
        status: 'pending',
        bank_account_id: 'ba-1',
      },
    ],
    // Same `id` on two rows only exists to make the query's own tenant
    // filter observable in this in-memory harness — see route header.
    expenses: [
      { id: SHARED_EXPENSE_ID, tenant_id: TENANT, category: 'supplies', amount: 5000 },
      { id: SHARED_EXPENSE_ID, tenant_id: OTHER_TENANT, category: 'supplies', amount: 5000 },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(id: string, body: unknown) {
  return POST(new Request(`http://t/api/finance/bank-transactions/${id}/match`, { method: 'POST', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id }),
  })
}

describe('finance/bank-transactions/[id]/match POST — expense write-side tenant scope', () => {
  it("matches the caller's own expense and leaves the other tenant's same-id expense untouched", async () => {
    const res = await post('txn-1', { target_type: 'expense', target_id: SHARED_EXPENSE_ID })
    expect(res.status).toBe(200)

    const mine = h.seed.expenses.find((e) => e.tenant_id === TENANT)!
    const theirs = h.seed.expenses.find((e) => e.tenant_id === OTHER_TENANT)!
    expect(mine.matched_bank_transaction_id).toBe('txn-1')
    expect(theirs.matched_bank_transaction_id).toBeUndefined()
  })
})
