import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * team-applications/bulk-approve POST — concurrent "Approve All" no longer
 * double-provisions/double-emails the same batch.
 *
 * BUG (fixed here): the route SELECTed every status='pending' row, then ran a
 * separate UPDATE keyed only on the fetched ids (no status re-check in the
 * UPDATE's own WHERE), then provisioned+emailed every row from the SELECT.
 * Two concurrent bulk-approve calls (double-click "Approve All", or a client
 * retry after a slow/dropped response) would both SELECT the same pending
 * batch before either UPDATE landed, then both provision+email every
 * applicant a second time — same class of bug as single-approve's
 * double-click (route.approve-idempotent.test.ts), just N-wide.
 *
 * FIX: the claim is now a single UPDATE with status='pending' in its own
 * WHERE, returning (via .select()) only the rows THIS call actually flipped.
 * A second concurrent call sees 0 pending rows left to claim and provisions
 * nothing.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({
  from: null as null | Harness['from'],
  seed: null as null | Harness['seed'],
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t) },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: TENANT, tenant: { id: TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

const provisioning = vi.hoisted(() => ({ provisionApprovedApplicant: vi.fn(async () => {}) }))
vi.mock('@/lib/team-provisioning', () => ({ provisionApprovedApplicant: provisioning.provisionApprovedApplicant }))

import { POST } from './route'

function seed() {
  return {
    team_applications: [
      { id: 'app-1', tenant_id: TENANT, name: 'Applicant One', email: 'one@test.com', phone: '5551234567', status: 'pending' },
      { id: 'app-2', tenant_id: TENANT, name: 'Applicant Two', email: 'two@test.com', phone: '5559876543', status: 'pending' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.seed = h.seed
  provisioning.provisionApprovedApplicant.mockClear()
})

describe('team-applications/bulk-approve POST — concurrent double-click no longer double-provisions', () => {
  it('two concurrent bulk-approve calls provision each pending applicant exactly once', async () => {
    const [r1, r2] = await Promise.all([POST(), POST()])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    const j1 = await r1.json()
    const j2 = await r2.json()
    // One call claims both, the other claims none (order isn't guaranteed).
    expect([j1.approved, j2.approved].sort()).toEqual([0, 2])
    expect(provisioning.provisionApprovedApplicant).toHaveBeenCalledTimes(2)

    for (const app of h.seed.team_applications) {
      expect(app.status).toBe('approved')
    }
  })

  it('a sequential re-run after the batch already approved provisions nothing further', async () => {
    const first = await POST()
    expect(first.status).toBe(200)
    expect((await first.json()).approved).toBe(2)
    expect(provisioning.provisionApprovedApplicant).toHaveBeenCalledTimes(2)

    const second = await POST()
    const secondJson = await second.json()
    expect(secondJson.approved).toBe(0)
    expect(secondJson.message).toBe('No pending applications')
    expect(provisioning.provisionApprovedApplicant).toHaveBeenCalledTimes(2)
  })

  it('a fresh pending application added after the first batch is still provisioned normally', async () => {
    await POST()
    expect(provisioning.provisionApprovedApplicant).toHaveBeenCalledTimes(2)

    h.seed.team_applications.push({ id: 'app-3', tenant_id: TENANT, name: 'Applicant Three', email: 'three@test.com', phone: '5551112222', status: 'pending' })
    const res = await POST()
    const json = await res.json()
    expect(json.approved).toBe(1)
    expect(provisioning.provisionApprovedApplicant).toHaveBeenCalledTimes(3)
  })
})
