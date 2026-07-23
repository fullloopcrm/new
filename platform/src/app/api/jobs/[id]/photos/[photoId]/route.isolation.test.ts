import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — PATCH /api/jobs/[id]/photos/[photoId].
 *
 * body.pair_id (job_photos.pair_id REFERENCES job_photos(id), no per-tenant
 * namespacing) went straight into the update with no ownership check. Same
 * write-pollution class as the job-expenses/quote-budgets/catalog-materials/
 * budget-templates fixes this session — a caller could point their own
 * photo's pair_id at another tenant's (or another job's) photo row.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const JOB_A = 'job-a'
const JOB_A2 = 'job-a2'
const PHOTO_A1 = 'photo-a1'
const PHOTO_A2 = 'photo-a2'
const PHOTO_A_OTHER_JOB = 'photo-a-other-job'
const PHOTO_B = 'photo-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t) },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { PATCH } from './route'

function seed() {
  return {
    job_photos: [
      { id: PHOTO_A1, tenant_id: CTX_TENANT, job_id: JOB_A, url: 'a1.jpg', photo_type: 'before', pair_id: null, tags: [], annotations: [] },
      { id: PHOTO_A2, tenant_id: CTX_TENANT, job_id: JOB_A, url: 'a2.jpg', photo_type: 'after', pair_id: null, tags: [], annotations: [] },
      { id: PHOTO_A_OTHER_JOB, tenant_id: CTX_TENANT, job_id: JOB_A2, url: 'a3.jpg', photo_type: 'before', pair_id: null, tags: [], annotations: [] },
      { id: PHOTO_B, tenant_id: OTHER_TENANT, job_id: 'job-b', url: 'b1.jpg', photo_type: 'before', pair_id: null, tags: [], annotations: [] },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function patch(jobId: string, photoId: string, body: unknown) {
  return PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: jobId, photoId }),
  })
}

describe('PATCH /api/jobs/[id]/photos/[photoId] — cross-tenant reference isolation', () => {
  it("REJECTS pairing with another tenant's photo, no write applied", async () => {
    const res = await patch(JOB_A, PHOTO_A1, { pair_id: PHOTO_B })
    expect(res.status).toBe(400)
    const photo = (h.seed.job_photos as { id: string; pair_id: string | null }[]).find((p) => p.id === PHOTO_A1)
    expect(photo?.pair_id).toBeNull()
  })

  it('REJECTS pairing with a photo from a different job (same tenant)', async () => {
    const res = await patch(JOB_A, PHOTO_A1, { pair_id: PHOTO_A_OTHER_JOB })
    expect(res.status).toBe(400)
    const photo = (h.seed.job_photos as { id: string; pair_id: string | null }[]).find((p) => p.id === PHOTO_A1)
    expect(photo?.pair_id).toBeNull()
  })

  it("positive control: pairing with the SAME job's own photo is accepted + mutual link stamped", async () => {
    const res = await patch(JOB_A, PHOTO_A1, { pair_id: PHOTO_A2 })
    expect(res.status).toBe(200)
    const rows = h.seed.job_photos as { id: string; pair_id: string | null }[]
    expect(rows.find((p) => p.id === PHOTO_A1)?.pair_id).toBe(PHOTO_A2)
    expect(rows.find((p) => p.id === PHOTO_A2)?.pair_id).toBe(PHOTO_A1)
  })
})
