import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/jobs/[id] (converted to tenantDb).
 *
 * The route reads a job by id via tenantDb, which injects `.eq('tenant_id', ctx)`.
 * A job that exists but belongs to ANOTHER tenant must be indistinguishable from
 * a non-existent one: 404, never the foreign row. This is the wrong-tenant probe.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { GET } from './route'

function seed() {
  return {
    jobs: [
      { id: 'job-a', tenant_id: CTX_TENANT, title: 'A job', status: 'scheduled' },
      { id: 'job-b', tenant_id: OTHER_TENANT, title: 'B job', status: 'scheduled' },
    ],
    job_payments: [],
    bookings: [],
    job_events: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('jobs/[id] GET — tenant isolation', () => {
  it('positive control: tenant A can read its OWN job', async () => {
    const res = await GET(new Request('http://t/api/jobs/job-a'), ctx('job-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.job.id).toBe('job-a')
    expect(body.job.tenant_id).toBe(CTX_TENANT)
  })

  it('wrong-tenant probe: fetching tenant B\'s job id returns 404, never the row', async () => {
    const res = await GET(new Request('http://t/api/jobs/job-b'), ctx('job-b'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
    expect(body.job).toBeUndefined()
  })
})
