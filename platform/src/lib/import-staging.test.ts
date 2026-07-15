import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — undoBatch's per-row delete.
 *
 * commitBatch/undoBatch are only ever reached after the API layer
 * (dashboard/import/batch/[id]) proves the batch belongs to the caller's
 * tenant, and target_id/target_table on import_rows are set exclusively by
 * commitBatch's own tenant-stamped insert — so this isn't independently
 * exploitable via any request today. It's still worth locking down: every
 * other write in this codebase scopes by tenant_id even when a call-site
 * guard already exists, and undoBatch's delete was the one exception,
 * deleting by target_id alone with zero tenant check. Probe: an import_rows
 * pointer that (hypothetically, via a future bug) targets a row owned by a
 * DIFFERENT tenant than the batch must survive undo.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { undoBatch } from './import-staging'

function seed() {
  return {
    import_batches: [
      { id: 'batch-a', tenant_id: TENANT_A, status: 'committed' },
    ],
    import_rows: [
      { id: 'row-own', batch_id: 'batch-a', target_table: 'clients', target_id: 'client-own' },
      { id: 'row-foreign', batch_id: 'batch-a', target_table: 'clients', target_id: 'client-victim' },
    ],
    clients: [
      { id: 'client-own', tenant_id: TENANT_A, name: 'Own Co' },
      { id: 'client-victim', tenant_id: TENANT_B, name: 'Victim Co' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('undoBatch — tenant isolation', () => {
  it('removes the row that actually belongs to the batch tenant', async () => {
    // A tenant-scoped delete with zero matching rows still returns no error
    // (same as real Supabase), so `removed` counts attempts, not hits — the
    // seed state is the real proof of what was actually deleted.
    await undoBatch('batch-a')
    expect(h.seed.clients.find((c) => c.id === 'client-own')).toBeUndefined()
  })

  it("wrong-tenant probe: a target_id pointing at a DIFFERENT tenant's row survives undo untouched", async () => {
    await undoBatch('batch-a')
    const victim = h.seed.clients.find((c) => c.id === 'client-victim')
    expect(victim).toBeDefined()
    expect(victim?.tenant_id).toBe(TENANT_B)
  })
})
