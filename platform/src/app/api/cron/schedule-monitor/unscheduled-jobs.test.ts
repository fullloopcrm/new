import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * schedule-monitor cron — unscheduled-Jobs surfacing.
 *
 * 2026-07-30 pipeline trace found: a sold quote converted to a project Job
 * (via closeSoldQuote / convertSaleToJob) can sit `status='unscheduled'`
 * indefinitely with zero alert — the monitor already caught this exact class
 * for Bookings (the 'unscheduled_sale' pending-booking check below) but had
 * no equivalent for Jobs. Real prod case: a $365 Job sat unscheduled 11+
 * days. This suite proves the new check fires once and dedupes on rerun,
 * matching the existing booking check's behavior exactly.
 */

const TENANT_ID = 'tenant-1' // deliberately not NYCMAID_TENANT_ID

process.env.CRON_SECRET = 'test-secret'

let jobsRows: Array<{ id: string; title: string; total_cents: number; created_at: string; tenant_id: string; status: string; clients: { name: string } }>
let seededIssues: Array<{ id: string; tenant_id: string; message: string; status: string }>
const insertedIssues: Array<Record<string, unknown>> = []

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const resolve = () => {
    if (table === 'tenants') {
      return { data: [{ id: TENANT_ID, name: 'Test Tenant', timezone: 'America/New_York' }] }
    }
    if (table === 'bookings') {
      return { data: [] } // no bookings — isolates the Jobs check
    }
    if (table === 'jobs') {
      return { data: jobsRows.filter((j) => j.tenant_id === eqs.tenant_id && j.status === eqs.status) }
    }
    if (table === 'schedule_issues') {
      return { data: seededIssues.filter((i) => i.tenant_id === eqs.tenant_id) }
    }
    return { data: [] }
  }
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    in: () => chain,
    gte: () => chain,
    lte: () => chain,
    lt: () => chain,
    is: () => chain,
    neq: () => chain,
    or: () => chain,
    limit: async () => resolve(),
    insert: (row: Record<string, unknown>) => {
      if (table === 'schedule_issues') insertedIssues.push(row)
      return Promise.resolve({ data: null, error: null }).then(() => {}, () => {})
    },
    then: (onFulfilled: (v: unknown) => void) => onFulfilled(resolve()),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { GET } from './route'

beforeEach(() => {
  jobsRows = []
  seededIssues = []
  insertedIssues.length = 0
})

function makeRequest(): Request {
  return new Request('http://localhost/api/cron/schedule-monitor', {
    headers: { authorization: 'Bearer test-secret' },
  })
}

describe('schedule-monitor — unscheduled Jobs', () => {
  it('surfaces an unscheduled Job as a schedule_issue', async () => {
    jobsRows = [{
      id: 'job-1', title: 'New Sod Install', total_cents: 36_500,
      created_at: new Date().toISOString(), tenant_id: TENANT_ID, status: 'unscheduled',
      clients: { name: 'Ada Client' },
    }]

    await GET(makeRequest())

    const jobIssues = insertedIssues.filter((i) => i.type === 'unscheduled_job')
    expect(jobIssues.length).toBe(1)
    expect(jobIssues[0].booking_id).toBe('job-1')
    expect(String(jobIssues[0].message)).toContain('Ada Client')
    expect(String(jobIssues[0].message)).toContain('$365')
  })

  it('does not duplicate an already-open unscheduled_job issue on rerun', async () => {
    jobsRows = [{
      id: 'job-1', title: 'New Sod Install', total_cents: 36_500,
      created_at: new Date().toISOString(), tenant_id: TENANT_ID, status: 'unscheduled',
      clients: { name: 'Ada Client' },
    }]
    seededIssues = [{
      id: 'issue-1', tenant_id: TENANT_ID, status: 'open',
      message: 'Job unscheduled: Ada Client — New Sod Install ($365) — schedule it',
    }]

    await GET(makeRequest())

    const jobIssues = insertedIssues.filter((i) => i.type === 'unscheduled_job')
    expect(jobIssues.length).toBe(0)
  })

  it('does not fire for a scheduled Job', async () => {
    jobsRows = [{
      id: 'job-2', title: 'Fence repair', total_cents: 20_000,
      created_at: new Date().toISOString(), tenant_id: TENANT_ID, status: 'scheduled',
      clients: { name: 'Bea Client' },
    }]

    await GET(makeRequest())

    expect(insertedIssues.filter((i) => i.type === 'unscheduled_job').length).toBe(0)
  })
})
