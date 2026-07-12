import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/finance/receipts/attach (converted to tenantDb).
 *
 * The route resolves the target bank transaction via tenantDb, which injects
 * `.eq('tenant_id', ctx)`. Attaching a receipt to ANOTHER tenant's transaction
 * id must 404 before any receipt_path is written — otherwise a caller could
 * bind a document to a foreign tenant's ledger row. That is the probe.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

// No coa_id is passed below, so the journal branch is skipped — but stub ledger
// anyway to keep the module hermetic (no real DB import side effects).
vi.mock('@/lib/ledger', () => ({
  postJournalEntry: vi.fn(async () => 'je-x'),
  normalizeDescription: (s: string) => s,
}))

import { POST } from './route'

function seed() {
  return {
    bank_transactions: [
      { id: 'txn-a', tenant_id: CTX_TENANT, status: 'pending', amount_cents: -5000, txn_date: '2026-07-01', description: 'A', receipt_path: null },
      { id: 'txn-b', tenant_id: OTHER_TENANT, status: 'pending', amount_cents: -9900, txn_date: '2026-07-01', description: 'B', receipt_path: null },
    ],
    chart_of_accounts: [],
    categorization_patterns: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function attach(body: unknown) {
  return POST(
    new Request('http://t/api/finance/receipts/attach', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  )
}

describe('finance/receipts/attach POST — tenant isolation', () => {
  it("positive control: tenant A can attach a receipt to its OWN transaction", async () => {
    const res = await attach({ bank_transaction_id: 'txn-a', receipt_path: 'receipts/a.pdf' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(h.seed.bank_transactions.find((r) => r.id === 'txn-a')!.receipt_path).toBe('receipts/a.pdf')
  })

  it("wrong-tenant probe: attaching to tenant B's transaction id 404s, never writes to B", async () => {
    const res = await attach({ bank_transaction_id: 'txn-b', receipt_path: 'receipts/evil.pdf' })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Transaction not found')
    // B's row is untouched — no receipt_path bound to a foreign ledger row.
    expect(h.capture.updates).toHaveLength(0)
    expect(h.seed.bank_transactions.find((r) => r.id === 'txn-b')!.receipt_path).toBeNull()
  })
})
