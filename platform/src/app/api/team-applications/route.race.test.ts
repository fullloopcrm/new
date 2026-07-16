/**
 * PUT /api/team-applications — approve/reject status transition race.
 *
 * The UI only ever offers Approve/Reject from the Pending queue. Before this
 * fix, PUT blind-wrote `{ status }` keyed only on id+tenant_id, with no check
 * that the row was still pending -- a stale second tab or a double-click
 * racing the first response could re-fire the update after the row already
 * transitioned, re-approving a just-rejected applicant (or vice versa) and,
 * on approve, provisioning + emailing the applicant a second time.
 *
 * FIX: guard the write with `.eq('status', 'pending')` in its own WHERE
 * (CAS), and return 409 with the row's real current status when the race is
 * lost, same pattern as the rest of this sweep.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'
const APP_ID = 'app-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  provisionApprovedApplicant: vi.fn(),
}))

/** Injected right after the route's update resolves but before it re-reads
 *  on a lost race -- simulates a concurrent request that already decided
 *  the row between this request's own fetch and its write landing. */
const beforeUpdate = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'team_applications') return chain
      const origMaybeSingle = chain.maybeSingle as () => Promise<unknown>
      chain.maybeSingle = () => {
        beforeUpdate.fn?.()
        beforeUpdate.fn = null
        return origMaybeSingle()
      }
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/team-provisioning', () => ({
  provisionApprovedApplicant: (...a: unknown[]) => h.provisionApprovedApplicant(...a),
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn() }))

import { PUT } from './route'

const put = (body: Record<string, unknown>) =>
  PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }))

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.provisionApprovedApplicant.mockReset()
  h.provisionApprovedApplicant.mockResolvedValue(undefined)
  beforeUpdate.fn = null
})

describe('PUT /api/team-applications — status transition race', () => {
  it('rejects an approve once a concurrent request already rejected the same application', async () => {
    h.store = { team_applications: [{ id: APP_ID, tenant_id: TENANT_ID, status: 'pending', name: 'Jo' }] }
    beforeUpdate.fn = () => {
      h.store.team_applications[0] = { ...h.store.team_applications[0], status: 'rejected' }
    }

    const res = await put({ id: APP_ID, status: 'approved' })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already rejected/i)
    expect(h.store.team_applications[0].status).toBe('rejected')
    expect(h.provisionApprovedApplicant).not.toHaveBeenCalled()
  })

  it('rejects a second approve once a concurrent request already approved the same application (no double provisioning)', async () => {
    h.store = { team_applications: [{ id: APP_ID, tenant_id: TENANT_ID, status: 'pending', name: 'Jo' }] }
    beforeUpdate.fn = () => {
      h.store.team_applications[0] = { ...h.store.team_applications[0], status: 'approved' }
    }

    const res = await put({ id: APP_ID, status: 'approved' })
    expect(res.status).toBe(409)
    expect(h.provisionApprovedApplicant).not.toHaveBeenCalled()
  })

  it('still approves + provisions normally with no concurrent writer (no regression)', async () => {
    h.store = { team_applications: [{ id: APP_ID, tenant_id: TENANT_ID, status: 'pending', name: 'Jo' }] }

    const res = await put({ id: APP_ID, status: 'approved' })
    expect(res.status).toBe(200)
    expect(h.store.team_applications[0].status).toBe('approved')
    expect(h.provisionApprovedApplicant).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when the application no longer exists', async () => {
    h.store = { team_applications: [] }

    const res = await put({ id: APP_ID, status: 'approved' })
    expect(res.status).toBe(404)
  })
})
