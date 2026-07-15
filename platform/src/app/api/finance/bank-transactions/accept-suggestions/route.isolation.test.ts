import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/finance/bank-transactions/accept-suggestions.
 *
 * 💰 Bulk-posts journal entries for every pending bank txn above a confidence
 * threshold and flips them to `posted`. The batch is selected through tenantDb
 * (`.eq('tenant_id', ctx)`), so a foreign tenant's pending txn — even one above
 * threshold — must be EXCLUDED from the batch and never posted. The probe seeds a
 * ready-to-accept txn for BOTH tenants and asserts only the caller's is touched.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({ AuthError: class AuthError extends Error { status = 401 } }))
vi.mock('@/lib/ledger', () => ({
  postJournalEntry: vi.fn(async () => 'je-1'),
  normalizeDescription: (s: string) => s,
}))

import { POST } from './route'

function seed() {
  return {
    bank_transactions: [
      { id: 't-a', tenant_id: A, status: 'pending', txn_date: '2026-07-01', description: 'Home Depot', amount_cents: -5000, suggested_coa_id: 'coa-1', suggested_confidence: 0.9, bank_account_id: 'ba-a', coa_id: null },
      { id: 't-b', tenant_id: B, status: 'pending', txn_date: '2026-07-01', description: 'Lowes', amount_cents: -7000, suggested_coa_id: 'coa-2', suggested_confidence: 0.95, bank_account_id: 'ba-b', coa_id: null },
    ],
    bank_accounts: [
      { id: 'ba-a', tenant_id: A, coa_id: 'bank-coa-a' },
      { id: 'ba-b', tenant_id: B, coa_id: 'bank-coa-b' },
    ],
    categorization_patterns: [] as Record<string, any>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(body: unknown) {
  return POST(new Request('http://t/api/finance/bank-transactions/accept-suggestions', { method: 'POST', body: JSON.stringify(body) }))
}

describe('finance/accept-suggestions POST — tenant isolation', () => {
  it("accepts only the caller's txn; tenant B's ready txn is excluded and stays pending", async () => {
    const res = await post({ threshold: 0.8 })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, accepted: 1 })
    // Caller's txn posted.
    expect(h.seed.bank_transactions.find((t) => t.id === 't-a')!.status).toBe('posted')
    // Foreign tenant's txn untouched — never entered the batch, never journaled.
    const tb = h.seed.bank_transactions.find((t) => t.id === 't-b')!
    expect(tb.status).toBe('pending')
    expect(tb.coa_id).toBeNull()
  })
})
