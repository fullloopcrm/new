import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * team-applications PUT — double-approve no longer re-sends the welcome email.
 *
 * BUG (fixed here): approving an application called provisionApprovedApplicant
 * (which emails the applicant their PIN) whenever the request body said
 * status:'approved', with no check on the application's CURRENT status first.
 * team-provisioning's own dedup-by-phone stopped a duplicate team_member row
 * from being created, but did nothing to stop the SAME application being
 * re-approved (a double-click, or a client retry after a slow/dropped
 * response) from re-sending the "Welcome! Your PIN: XXXX" email every time,
 * with no cap.
 *
 * FIX: mirrors referral-commissions' mark-paid CAS -- `.neq('status',
 * 'approved')` makes the claiming update a no-op (0 rows) if the application
 * was already approved, and provisioning/email only runs on the row it
 * actually claimed (the real pending->approved transition).
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

import { PUT } from './route'

function seed() {
  return {
    team_applications: [
      { id: 'app-1', tenant_id: TENANT, name: 'Applicant One', email: 'one@test.com', phone: '5551234567', status: 'pending' },
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

function put(id: string, status: string) {
  return PUT(new Request('http://t/api/team-applications', { method: 'PUT', body: JSON.stringify({ id, status }) }))
}

describe('team-applications PUT — SAME-application double-approve no longer double-provisions', () => {
  it('double-clicking approve on the SAME application provisions/emails exactly once', async () => {
    const [r1, r2] = await Promise.all([put('app-1', 'approved'), put('app-1', 'approved')])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    expect(provisioning.provisionApprovedApplicant).toHaveBeenCalledTimes(1)

    const app = h.seed.team_applications.find((a) => a.id === 'app-1')!
    expect(app.status).toBe('approved')
  })

  it('a sequential re-approve after the first call already succeeded does not re-send the welcome email', async () => {
    const first = await put('app-1', 'approved')
    expect(first.status).toBe(200)
    expect(provisioning.provisionApprovedApplicant).toHaveBeenCalledTimes(1)

    const second = await put('app-1', 'approved')
    expect(second.status).toBe(200)
    expect(provisioning.provisionApprovedApplicant).toHaveBeenCalledTimes(1)

    const app = h.seed.team_applications.find((a) => a.id === 'app-1')!
    expect(app.status).toBe('approved')
  })

  it('a fresh pending application is still provisioned normally on first approval', async () => {
    h.seed.team_applications.push({ id: 'app-2', tenant_id: TENANT, name: 'Applicant Two', email: 'two@test.com', phone: '5559876543', status: 'pending' })
    const res = await put('app-2', 'approved')
    expect(res.status).toBe(200)
    expect(provisioning.provisionApprovedApplicant).toHaveBeenCalledTimes(1)
  })

  it('rejecting an application does not go through the approve/provision path', async () => {
    const res = await put('app-1', 'rejected')
    expect(res.status).toBe(200)
    expect(provisioning.provisionApprovedApplicant).not.toHaveBeenCalled()

    const app = h.seed.team_applications.find((a) => a.id === 'app-1')!
    expect(app.status).toBe('rejected')
  })
})
