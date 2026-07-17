/**
 * IMPORT-BATCH COMMIT RACE — `commitBatch` atomic claim.
 *
 * `commitBatch` used to guard the staged→committed transition with a plain
 * `if (batch.status !== 'staged') throw` check after a separate read, then
 * looped through every accepted row inserting it into `clients` /
 * `bookings` / `recurring_schedules`, only flipping `status: 'committed'` at
 * the very end. Two concurrent commit requests for the same batch (a
 * double-click on "Commit Import", or a retried request after a slow first
 * commit on a large batch) can both read `status: 'staged'` before either
 * write lands, and both then insert every accepted row a second time.
 *
 * Unlike most double-submit bugs in this codebase, there is no DB-level
 * backstop here: `clients` has no unique constraint on (tenant_id, email)
 * or (tenant_id, phone) (see supabase/schema.sql), and dedup against
 * existing rows only happens once, at stage time — commit never re-checks.
 * A double-commit on a large import silently duplicates the tenant's whole
 * client list (and any matched bookings/recurring_schedules).
 *
 * Fix: claim the staged→committed transition atomically FIRST (the same
 * `UPDATE ... WHERE status = 'staged' ... RETURNING` idiom used everywhere
 * else in this codebase for this exact TOCTOU shape), and release the claim
 * back to 'staged' if something throws before any row work completes, so a
 * genuinely failed commit can still be retried.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { commitBatch } from './import-staging'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const BATCH_ID = 'batch-1'

function seedStagedClientBatch() {
  fake._store.clear()
  fake._seed('import_batches', [
    {
      id: BATCH_ID,
      tenant_id: TENANT_ID,
      kind: 'clients',
      status: 'staged',
      total_rows: 2,
      committed_rows: 0,
    },
  ])
  fake._seed('import_rows', [
    {
      id: 'row-1',
      batch_id: BATCH_ID,
      tenant_id: TENANT_ID,
      row_index: 0,
      raw: { name: 'Alice' },
      mapped: { name: 'Alice', email: 'alice@x.test', phone: null, status: 'active' },
      match_status: 'new',
      target_table: 'clients',
      target_id: null,
    },
    {
      id: 'row-2',
      batch_id: BATCH_ID,
      tenant_id: TENANT_ID,
      row_index: 1,
      raw: { name: 'Bob' },
      mapped: { name: 'Bob', email: 'bob@x.test', phone: null, status: 'active' },
      match_status: 'new',
      target_table: 'clients',
      target_id: null,
    },
  ])
}

beforeEach(() => {
  seedStagedClientBatch()
})

describe('commitBatch — concurrent commit race', () => {
  it('two concurrent commits write the batch rows exactly once, not twice', async () => {
    const results = await Promise.allSettled([commitBatch(BATCH_ID), commitBatch(BATCH_ID)])

    const clients = fake._all('clients').filter((c: Row) => c.tenant_id === TENANT_ID)
    expect(clients.length).toBe(2) // Alice + Bob, once each — not 4.

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled.length).toBe(1)
    expect(rejected.length).toBe(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(Error)

    const batch = fake._all('import_batches').find((b: Row) => b.id === BATCH_ID)
    expect(batch?.status).toBe('committed')
    expect(batch?.committed_rows).toBe(2)
  })

  it('a sequential retry after a successful commit is rejected, not re-applied', async () => {
    const first = await commitBatch(BATCH_ID)
    expect(first.committed).toBe(2)

    await expect(commitBatch(BATCH_ID)).rejects.toThrow()

    const clients = fake._all('clients').filter((c: Row) => c.tenant_id === TENANT_ID)
    expect(clients.length).toBe(2)
  })
})
