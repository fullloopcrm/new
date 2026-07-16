import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/quotes/[id]/convert-to-job — permission gate.
 *
 * BUG (fixed here): converting an accepted quote into a multi-session Job
 * (creates a payment plan + scheduled sessions) only called
 * getTenantForRequest() with zero permission check. rbac.ts grants
 * 'sales.edit' to owner/admin/manager only — before this fix a 'staff'
 * session could spin up a Job (and its payment plan) from any quote
 * directly via the API.
 *
 * FIX: requirePermission('sales.edit'), matching quotes/[id]/convert.
 *
 * convertSaleToJob() itself already has dedicated coverage in
 * lib/jobs-conversion-race.test.ts — mocked here so this file tests only the
 * permission wiring, not the job-creation internals.
 */

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
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
      tenantId: 'tid-a',
      tenant: { id: 'tid-a' },
      role: roleHolder.role,
    })),
  }
})

const jobsHolder = vi.hoisted(() => ({ convertSaleToJob: vi.fn(async () => ({ job_id: 'job-1' })) }))
vi.mock('@/lib/jobs', () => ({ convertSaleToJob: jobsHolder.convertSaleToJob }))

import { POST } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  jobsHolder.convertSaleToJob.mockClear()
})

const params = () => ({ params: Promise.resolve({ id: 'quote-1' }) })
function req() {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({}) })
}

describe('POST /api/quotes/[id]/convert-to-job — permission probe', () => {
  it('owner (has sales.edit) can convert a quote to a job', async () => {
    const res = await POST(req(), params())
    expect(res.status).toBe(200)
    expect(jobsHolder.convertSaleToJob).toHaveBeenCalledTimes(1)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and no job is created", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req(), params())
    expect(res.status).toBe(403)
    expect(jobsHolder.convertSaleToJob).not.toHaveBeenCalled()
  })
})
