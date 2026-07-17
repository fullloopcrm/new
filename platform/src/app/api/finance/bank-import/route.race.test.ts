// @vitest-environment node
//
// node, not jsdom: jsdom's FormData/File and undici's (which Request/
// formData() use internally) are different classes, so a jsdom File fails
// undici's internal multipart parser.
/**
 * CONCURRENT-IMPORT FINGERPRINT RACE — POST /api/finance/bank-import
 *
 * The route dedupes incoming rows against a snapshot of existing
 * `bank_transactions` fingerprints read once near the start of the request,
 * then does one multi-row `insert()` of everything it decided was new. A real
 * Postgres UNIQUE index already exists on (bank_account_id, fingerprint)
 * (migrations/032_ledger.sql) — but a multi-row INSERT is all-or-nothing: if
 * ANY row in the batch conflicts, the WHOLE insert is rejected and none of
 * the batch's legitimately-new rows land.
 *
 * So if a concurrent writer (another import of a different file that shares
 * one overlapping transaction — common with banks' rolling-window CSV
 * exports) commits between this request's fingerprint snapshot read and its
 * own insert, the entire batch is rejected on the DB's UNIQUE index, not just
 * the one truly-conflicting row. That silently drops every OTHER, genuinely
 * new transaction in the file, and the batch row (already inserted
 * successfully, since sha256 differs) is left with accepted_count/
 * duplicate_count stuck at zero because the crash happens before that
 * update runs. Retrying with the exact same file then hits the sha256
 * "already imported" guard and returns 409 — permanently blocking recovery
 * even though zero transactions from that file were ever actually saved.
 *
 * The test forces the exact TOCTOU window directly (one stale read) rather
 * than relying on Promise.all interleaving, which isn't a reliable clock
 * once real multipart parsing is involved.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('bank_transactions', 'fingerprint')
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'
const ACCOUNT_ID = 'acct-1'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  vi.restoreAllMocks()
  fake._store.clear()
  fake._seed('bank_accounts', [{ id: ACCOUNT_ID, tenant_id: TENANT_ID } as Row])
})

// Present in BOTH files -> identical fingerprint (same date|amount|normalized
// description) despite the files themselves (and their sha256) differing.
const SHARED_ROW = '2026-07-01,Shared Vendor Payment,-50.00'
const FILE_A = `Date,Description,Amount\n${SHARED_ROW}\n2026-07-02,Coffee Shop,-10.00\n`
const FILE_B = `Date,Description,Amount\n${SHARED_ROW}\n2026-07-03,Gym Membership,-30.00\n`

function importReq(filename: string, contents: string): Request {
  const form = new FormData()
  form.set('file', new File([contents], filename, { type: 'text/csv' }))
  form.set('bank_account_id', ACCOUNT_ID)
  return new Request('http://x/api/finance/bank-import', { method: 'POST', body: form })
}

/** Makes the NEXT `bank_transactions` select (the existingFps snapshot read)
 * report empty, simulating a request whose read happened just before a
 * concurrent writer's commit. */
function forceNextFingerprintSnapshotEmpty(): void {
  const realFrom = fake.from.bind(fake)
  let armed = true
  const emptyChain = {
    eq: () => emptyChain,
    in: () => emptyChain,
    then: <T,>(onFulfilled: (v: { data: unknown[]; error: null; count: null }) => T) =>
      Promise.resolve(onFulfilled({ data: [], error: null, count: null })),
  }
  vi.spyOn(fake, 'from').mockImplementation((table: string) => {
    const builder = realFrom(table)
    if (table !== 'bank_transactions' || !armed) return builder
    const originalSelect = builder.select.bind(builder)
    builder.select = ((...args: Parameters<typeof originalSelect>) => {
      armed = false
      originalSelect(...args)
      return emptyChain as unknown as ReturnType<typeof originalSelect>
    }) as typeof builder.select
    return builder
  })
}

describe('POST /api/finance/bank-import — stale fingerprint snapshot vs. real UNIQUE index', () => {
  it('does not silently drop the rest of the batch when one row races a concurrent commit', async () => {
    // File A imports first and actually commits its shared-fingerprint row.
    const first = await POST(importReq('statement-a.csv', FILE_A))
    expect((await first.json()).ok).toBe(true)

    // File B's snapshot read is forced stale (as if it ran just before A's
    // commit), so its in-memory dedup does NOT mark the shared row as a
    // duplicate — exactly the state a real concurrent request would be in.
    forceNextFingerprintSnapshotEmpty()
    const second = await POST(importReq('statement-b.csv', FILE_B))
    const secondJson = await second.json()

    const allTxns = fake._all('bank_transactions')
    const descriptions = new Set(allTxns.map((t) => t.description))

    // The failure mode: Gym Membership (genuinely new, no fingerprint
    // conflict) gets silently dropped along with the one row that actually
    // conflicted, because the whole multi-row insert aborted.
    expect(descriptions.has('Gym Membership')).toBe(true)
    expect(secondJson.ok).toBe(true)

    // The batch row's counts must reflect what actually landed, not be
    // stuck at zero because a post-insert throw skipped the update.
    const batchB = fake._all('bank_import_batches').find((b) => b.filename === 'statement-b.csv')
    expect(batchB).toBeTruthy()
    expect((batchB!.accepted_count as number) + (batchB!.duplicate_count as number)).toBe(batchB!.row_count)
  })
})
