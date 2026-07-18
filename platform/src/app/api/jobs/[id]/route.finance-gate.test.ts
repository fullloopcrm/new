import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * jobs/[id] GET — permission probe.
 *
 * BUG (fixed here): GET had NO permission check at all (only
 * getTenantForRequest(), which succeeds for any tenant_members row). The
 * sibling budget-variance and payments routes on the same job-detail page
 * are gated (sales.view / finance.expenses), but this route leaked
 * job.total_cents, the full job_payments plan, and deal.value_cents to a
 * 'staff' role, which rbac.ts explicitly excludes from finance.view.
 *
 * FIX: base-gate on `bookings.view` (matches the Production nav gate, so
 * any role that can see the jobs list can still open a job for scheduling
 * info) and additionally strip financial fields — job.total_cents,
 * payments, deal.value_cents — for viewers without `finance.view`, rather
 * than blocking the whole page.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
      tenantId: A,
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff' role is denied/redacted by the ACTUAL permission table.
import { GET } from './route'

function seed() {
  return {
    jobs: [
      {
        id: 'job-a1',
        tenant_id: A,
        title: 'A Job',
        status: 'in_progress',
        total_cents: 500000,
        client_id: 'client-1',
        quote_id: 'quote-1',
      },
    ],
    job_payments: [
      { id: 'pay-1', tenant_id: A, job_id: 'job-a1', trigger: 'on_stage_complete', status: 'pending', amount_cents: 250000, label: 'Final', sort_order: 0 },
    ],
    job_events: [] as Record<string, unknown>[],
    bookings: [] as Record<string, unknown>[],
    clients: [{ id: 'client-1', tenant_id: A, name: 'Client A', email: null, phone: null, address: null, unit: null, notes: null }],
    quotes: [{ id: 'quote-1', tenant_id: A, quote_number: 'Q-1', deal_id: 'deal-1' }],
    deals: [{ id: 'deal-1', tenant_id: A, title: 'A Deal', stage: 'won', value_cents: 500000 }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('jobs/[id] GET — permission probe', () => {
  it('owner sees full financials: total_cents, payments plan, deal.value_cents', async () => {
    const res = await GET(new Request('http://t'), params('job-a1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.job.total_cents).toBe(500000)
    expect(body.payments).toHaveLength(1)
    expect(body.payments[0].amount_cents).toBe(250000)
    expect(body.deal.value_cents).toBe(500000)
  })

  it("PERMISSION PROBE: 'staff' (has bookings.view, lacks finance.view) gets the page but not the money", async () => {
    roleHolder.role = 'staff'
    const res = await GET(new Request('http://t'), params('job-a1'))
    expect(res.status).toBe(200)
    const body = await res.json()

    // Job-core info is still visible — staff isn't blocked from the page.
    expect(body.job.id).toBe('job-a1')
    expect(body.job.title).toBe('A Job')
    expect(body.client.name).toBe('Client A')

    // Financial fields are stripped, not just hidden client-side.
    expect(body.job.total_cents).toBeUndefined()
    expect(body.payments).toEqual([])
    expect(body.deal).not.toBeNull()
    expect(body.deal.value_cents).toBeUndefined()
    expect(body.deal.title).toBe('A Deal')
  })

  it("PERMISSION PROBE: a role with no bookings.view at all is forbidden outright", async () => {
    // No such role exists today, but the base gate must still deny anything
    // that isn't a recognized role rather than defaulting to allow.
    roleHolder.role = 'not-a-real-role'
    const res = await GET(new Request('http://t'), params('job-a1'))
    expect(res.status).toBe(403)
  })
})
