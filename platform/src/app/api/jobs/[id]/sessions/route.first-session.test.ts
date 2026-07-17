import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * jobs.status's declared 'unscheduled' value (migration
 * 2026_07_05_jobs_unscheduled_status.sql — a sold job with no session yet)
 * had a real transition out of it: this route already logs a job_events row
 * with event_type:'scheduled' the moment a job gets its first session, but
 * never wrote that same fact to jobs.status itself. A sold-but-unscheduled
 * job that got its first visit scheduled stayed stuck showing 'unscheduled'
 * (Jobs board's orange "needs attention" badge) forever. Continues item
 * (142)/(143)'s job-lifecycle surface with the 'cancelled' UI gap fixed
 * alongside this.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})

const TENANT = 'tenant-A'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST as sessionsPOST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const JOB_ID = 'job-1'

function params() {
  return { params: Promise.resolve({ id: JOB_ID }) }
}

function post(body: Record<string, unknown>) {
  return sessionsPOST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), params())
}

beforeEach(() => {
  fake._store.clear()
})

describe('POST /api/jobs/[id]/sessions — first-session status flip', () => {
  it("flips jobs.status from 'unscheduled' to 'scheduled' on the first session", async () => {
    fake._seed('jobs', [{ id: JOB_ID, tenant_id: TENANT, client_id: null, title: 'Deck rebuild', status: 'unscheduled' }])

    const res = await post({ start_time: '2026-08-01T14:00:00.000Z' })
    expect(res.status).toBe(200)

    const job = fake._all('jobs').find((j) => j.id === JOB_ID)
    expect(job?.status).toBe('scheduled')
  })

  it("leaves an already-'scheduled' job's status untouched on a second session", async () => {
    fake._seed('jobs', [{ id: JOB_ID, tenant_id: TENANT, client_id: null, title: 'Deck rebuild', status: 'scheduled' }])

    const res = await post({ start_time: '2026-08-02T14:00:00.000Z' })
    expect(res.status).toBe(200)

    const job = fake._all('jobs').find((j) => j.id === JOB_ID)
    expect(job?.status).toBe('scheduled')
  })

  it("does not reopen a 'cancelled' or 'completed' job by scheduling a session on it", async () => {
    fake._seed('jobs', [{ id: JOB_ID, tenant_id: TENANT, client_id: null, title: 'Deck rebuild', status: 'cancelled' }])

    const res = await post({ start_time: '2026-08-03T14:00:00.000Z' })
    expect(res.status).toBe(200)

    const job = fake._all('jobs').find((j) => j.id === JOB_ID)
    expect(job?.status).toBe('cancelled')
  })
})
