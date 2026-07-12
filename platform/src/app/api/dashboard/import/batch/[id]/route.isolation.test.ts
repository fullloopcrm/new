import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/dashboard/import/batch/[id] (converted to tenantDb).
 *
 * `ownsBatch` reads import_batches through tenantDb, so a batch owned by another
 * tenant is invisible → GET and POST(commit/undo) both 404 before touching the
 * import-staging engine. Probe: a foreign batch id 404s and NEVER reaches
 * getBatchReview / commitBatch (asserted via the mock spies).
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))

const spies = vi.hoisted(() => ({
  getBatchReview: vi.fn(async () => ({ rows: [], summary: {} })),
  commitBatch: vi.fn(async () => ({ committed: 1 })),
  undoBatch: vi.fn(async () => ({ undone: 1 })),
}))
vi.mock('@/lib/import-staging', () => ({
  getBatchReview: spies.getBatchReview,
  commitBatch: spies.commitBatch,
  undoBatch: spies.undoBatch,
}))

import { GET, POST } from './route'

function seed() {
  return { import_batches: [{ id: 'batch-b', tenant_id: B }] }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.getBatchReview.mockClear()
  spies.commitBatch.mockClear()
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('dashboard/import/batch/[id] — tenant isolation', () => {
  it("positive control: the caller's own batch returns its review", async () => {
    h.seed.import_batches.push({ id: 'batch-a', tenant_id: A })
    const res = await GET(new Request('http://t/x'), params('batch-a'))
    expect(res.status).toBe(200)
    expect(spies.getBatchReview).toHaveBeenCalledWith('batch-a')
  })

  it("wrong-tenant probe (GET): a foreign batch 404s and its review is never read", async () => {
    const res = await GET(new Request('http://t/x'), params('batch-b'))
    expect(res.status).toBe(404)
    expect(spies.getBatchReview).not.toHaveBeenCalled()
  })

  it("wrong-tenant probe (POST commit): a foreign batch 404s and is never committed", async () => {
    const res = await POST(
      new Request('http://t/x', { method: 'POST', body: JSON.stringify({ action: 'commit' }) }),
      params('batch-b'),
    )
    expect(res.status).toBe(404)
    expect(spies.commitBatch).not.toHaveBeenCalled()
  })
})
