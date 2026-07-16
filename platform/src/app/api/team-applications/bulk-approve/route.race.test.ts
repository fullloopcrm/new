/**
 * POST /api/team-applications/bulk-approve — pending-set race with a
 * concurrent single approve/reject.
 *
 * The route fetches every currently-pending application, then flips them all
 * to approved with a single UPDATE keyed on `.in(ids)`. Before this fix, the
 * UPDATE never re-checked `status = 'pending'` in its own WHERE and the
 * provisioning loop iterated the STALE `pending` snapshot -- if a single
 * approve/reject (PUT) landed on one of those rows between the fetch and the
 * write, bulk-approve would blindly overwrite that decision back to
 * 'approved' and provision/email an applicant an admin had just rejected.
 *
 * FIX: re-assert `.eq('status', 'pending')` on the bulk UPDATE and provision
 * only the rows the UPDATE's own `.select()` proves it actually won.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'
const APP_1 = 'app-1'
const APP_2 = 'app-2'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  provisionApprovedApplicant: vi.fn(),
}))

/** Injected right after the route's initial pending-set fetch resolves --
 *  simulates a concurrent single approve/reject landing in the gap before
 *  the bulk UPDATE fires. */
const afterInitialFetch = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'team_applications') return chain
      // The route's initial fetch is `.select(...).eq(...).eq('status','pending')`
      // with no terminal `.single()/.maybeSingle()` -- it resolves via `.then()`.
      // Wrap `.then` so the injected concurrent write lands right after that
      // first read, before the bulk UPDATE's own `.eq('status','pending')` runs.
      const origThen = chain.then as (...a: unknown[]) => Promise<unknown>
      let calls = 0
      chain.then = (...a: unknown[]) => {
        calls++
        const isInitialFetch = calls === 1
        return origThen.apply(chain, a).then((res) => {
          if (isInitialFetch) {
            afterInitialFetch.fn?.()
            afterInitialFetch.fn = null
          }
          return res
        })
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

import { POST } from './route'

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.provisionApprovedApplicant.mockReset()
  h.provisionApprovedApplicant.mockResolvedValue(undefined)
  afterInitialFetch.fn = null
})

describe('POST /api/team-applications/bulk-approve — pending-set race', () => {
  it('does not re-approve or provision an application rejected by a concurrent single PUT', async () => {
    h.store = {
      team_applications: [
        { id: APP_1, tenant_id: TENANT_ID, status: 'pending', name: 'Jo', email: null, phone: null, address: null },
        { id: APP_2, tenant_id: TENANT_ID, status: 'pending', name: 'Al', email: null, phone: null, address: null },
      ],
    }
    afterInitialFetch.fn = () => {
      h.store.team_applications[0] = { ...h.store.team_applications[0], status: 'rejected' }
    }

    const res = await POST()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.approved).toBe(1)
    expect(h.store.team_applications[0].status).toBe('rejected')
    expect(h.store.team_applications[1].status).toBe('approved')
    expect(h.provisionApprovedApplicant).toHaveBeenCalledTimes(1)
    expect(h.provisionApprovedApplicant).toHaveBeenCalledWith(TENANT_ID, expect.objectContaining({ id: APP_2 }))
  })

  it('approves and provisions every pending row with no concurrent writer (no regression)', async () => {
    h.store = {
      team_applications: [
        { id: APP_1, tenant_id: TENANT_ID, status: 'pending', name: 'Jo', email: null, phone: null, address: null },
        { id: APP_2, tenant_id: TENANT_ID, status: 'pending', name: 'Al', email: null, phone: null, address: null },
      ],
    }

    const res = await POST()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.approved).toBe(2)
    expect(json.provisioned).toBe(2)
    expect(h.provisionApprovedApplicant).toHaveBeenCalledTimes(2)
  })

  it('returns zero counts with no pending applications', async () => {
    h.store = { team_applications: [] }

    const res = await POST()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.approved).toBe(0)
    expect(json.provisioned).toBe(0)
    expect(h.provisionApprovedApplicant).not.toHaveBeenCalled()
  })
})
