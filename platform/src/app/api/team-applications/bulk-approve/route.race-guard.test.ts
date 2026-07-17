import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/team-applications/bulk-approve selected all `status: 'pending'`
 * applications, then bulk-UPDATEd them to 'approved' with no re-check of
 * status in the UPDATE's own WHERE clause, and provisioned+emailed every
 * originally-selected applicant unconditionally. A row that a concurrent
 * single-approve (PUT /api/team-applications) already claimed in the window
 * between this route's SELECT and UPDATE would get re-provisioned/re-emailed
 * here too. Fixed by re-checking `status: 'pending'` in the UPDATE and only
 * provisioning the ids that call actually flipped to 'approved'.
 */

const TENANT = 't-1'

const { provisionSpy } = vi.hoisted(() => ({ provisionSpy: vi.fn(async () => {}) }))
vi.mock('@/lib/team-provisioning', () => ({ provisionApprovedApplicant: provisionSpy }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({ AuthError: class AuthError extends Error { status = 401 } }))

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
// When set, fires exactly once right after the initial pending-SELECT
// resolves -- simulating a concurrent single-approve claiming a row in the
// window between this route's SELECT and its own UPDATE.
let onFirstSelect: (() => void) | null = null

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let inCol: string | null = null
    let inVals: unknown[] = []
    let updatePayload: Row | null = null
    const match = (r: Row) =>
      Object.entries(eqs).every(([k, v]) => r[k] === v) &&
      (inCol === null || inVals.includes(r[inCol as string]))
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { updatePayload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: (col: string, vals: unknown[]) => { inCol = col; inVals = vals; return c },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        const rows = (store[table] || []).filter(match)
        if (updatePayload) {
          rows.forEach((r) => Object.assign(r, updatePayload))
          return res({ data: rows.map((r) => ({ id: r.id })), error: null })
        }
        const snapshot = rows.map((r) => ({ ...r }))
        if (!updatePayload && table === 'team_applications' && eqs.status === 'pending' && onFirstSelect) {
          const fire = onFirstSelect
          onFirstSelect = null
          fire()
        }
        return res({ data: snapshot, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { POST } from '@/app/api/team-applications/bulk-approve/route'

describe('POST /api/team-applications/bulk-approve — race guard', () => {
  beforeEach(() => {
    store.team_applications = [
      { id: 'app-1', tenant_id: TENANT, name: 'A', email: 'a@x.com', phone: '5551111111', status: 'pending' },
      { id: 'app-2', tenant_id: TENANT, name: 'B', email: 'b@x.com', phone: '5552222222', status: 'pending' },
    ]
    provisionSpy.mockClear()
    onFirstSelect = null
  })

  it('approves and provisions all pending applications', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.approved).toBe(2)
    expect(json.provisioned).toBe(2)
    expect(provisionSpy).toHaveBeenCalledTimes(2)
  })

  it('skips provisioning for a row a concurrent single-approve already claimed before this UPDATE ran', async () => {
    // Both app-1 and app-2 are 'pending' when this route's own SELECT runs.
    // Right after that SELECT resolves (but before this route's UPDATE
    // fires), a concurrent single-approve claims app-1.
    onFirstSelect = () => { store.team_applications[0].status = 'approved' }

    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.approved).toBe(1)
    expect(json.provisioned).toBe(1)
    expect(provisionSpy).toHaveBeenCalledTimes(1)
    expect(provisionSpy).toHaveBeenCalledWith(TENANT, expect.objectContaining({ id: 'app-2' }))
  })
})
