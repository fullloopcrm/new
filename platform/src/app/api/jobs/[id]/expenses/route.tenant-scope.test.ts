/**
 * POST/GET /api/jobs/[id]/expenses — job-scoped receipts feeding job cost
 * tracking. Proves: (1) an expense can only be created against a job that
 * belongs to the caller's own tenant (mirrors the entity_id verification
 * pattern in POST /api/finance/expenses — a job_id from another tenant must
 * not be writable), (2) GET only returns this job's expenses, tenant-scoped,
 * (3) amount is stored in cents like the shared expenses POST route.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/jobs', async () => {
  const actual = await vi.importActual<typeof import('@/lib/jobs')>('@/lib/jobs')
  return { ...actual, logJobEvent: vi.fn(async () => {}) }
})
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/entity', () => ({ getDefaultEntityId: vi.fn(async () => null) }))

import { GET, POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const JOB_A = 'job-A1'
const JOB_B = 'job-B1'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    jobs: [
      { id: JOB_A, tenant_id: TENANT_A, client_id: 'client-1', title: 'Deck build' },
      { id: JOB_B, tenant_id: TENANT_B, client_id: 'client-2', title: 'Other tenant job' },
    ],
    expenses: [],
  }
})

describe('POST /api/jobs/[id]/expenses', () => {
  it('creates an expense scoped to the job, storing amount in cents', async () => {
    const res = await POST(postReq({ category: 'Materials', amount: 42.5, vendor_name: 'Home Depot', receipt_url: 'https://x/receipt.jpg' }), params(JOB_A))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.expense.job_id).toBe(JOB_A)
    expect(body.expense.amount).toBe(4250)
    expect(body.expense.tenant_id).toBe(TENANT_A)
  })

  it('404s when the job id belongs to a different tenant', async () => {
    // Caller is tenant-A but targets tenant-B's job — must not be able to
    // attach an expense to another tenant's job by guessing its id.
    const res = await POST(postReq({ category: 'Materials', amount: 10 }), params(JOB_B))
    expect(res.status).toBe(404)
    expect(h.store.expenses.length).toBe(0)
  })

  it('404s for a nonexistent job id', async () => {
    const res = await POST(postReq({ category: 'Materials', amount: 10 }), params('does-not-exist'))
    expect(res.status).toBe(404)
  })

  it('rejects a missing/invalid amount', async () => {
    const res = await POST(postReq({ category: 'Materials' }), params(JOB_A))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/jobs/[id]/expenses', () => {
  it('only returns expenses for this job, not another job in the same tenant', async () => {
    h.store.expenses = [
      { id: 'exp-1', tenant_id: TENANT_A, job_id: JOB_A, category: 'Materials', amount: 1000, date: '2026-07-01' },
      { id: 'exp-2', tenant_id: TENANT_A, job_id: 'job-A2-other', category: 'Fuel', amount: 500, date: '2026-07-02' },
    ]
    const res = await GET(new Request('http://x'), params(JOB_A))
    const body = await res.json()
    expect(body.expenses.map((e: { id: string }) => e.id)).toEqual(['exp-1'])
  })
})
