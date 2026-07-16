import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * team-portal-auth.ts (10 call sites — every /api/team-portal/* field-staff
 * route) is the RBAC + instant-revocation gate for the team portal. It had
 * zero direct test coverage before this file.
 *
 * Two tenant-isolation properties matter most and get a dedicated wrong-tenant
 * probe each:
 *   1. requirePortalPermission's revocation check queries team_members by
 *      BOTH id and tenant_id — a member id that exists under a different
 *      tenant must not be treated as this tenant's active member.
 *   2. scopedMemberIds' manager-role query is scoped by tenant_id — it must
 *      not return field staff belonging to another tenant.
 *
 * verifyToken (HMAC/timing-safe compare) lives in app/api/team-portal/auth/
 * token.ts and is mocked here to isolate this file's own control flow.
 * hasPortalPermission (portal-rbac.ts) is used for real — it already has its
 * own coverage in portal-rbac.test.ts; here it's exercised for wiring.
 */

type Eqs = Record<string, unknown>
type Handler = (eqs: Eqs, inVals: unknown[]) => unknown

let handlers: Record<string, Handler> = {}

function builder(table: string) {
  const eqs: Eqs = {}
  let inVals: unknown[] = []
  const resolveRow = () => {
    const handler = handlers[table]
    if (!handler) throw new Error(`no mock handler configured for table "${table}"`)
    return handler(eqs, inVals)
  }
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      eqs[col] = vals
      inVals = vals
      return chain
    },
    order: () => chain,
    single: async () => ({ data: resolveRow() }),
    maybeSingle: async () => ({ data: resolveRow() }),
    then: (onFulfilled: (v: { data: unknown }) => unknown) =>
      Promise.resolve({ data: resolveRow() }).then(onFulfilled),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const verifyToken = vi.fn<(token: string) => { id: string; tid: string; role: string } | null>()
vi.mock('@/app/api/team-portal/auth/token', () => ({
  verifyToken: async (t: string) => verifyToken(t),
}))

import { getPortalAuth, requirePortalPermission, scopedMemberIds } from './team-portal-auth'

function requestWithToken(token?: string): Request {
  const headers = new Headers()
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new Request('https://example.com/api/team-portal/jobs', { headers })
}

beforeEach(() => {
  handlers = {}
  verifyToken.mockReset()
})

describe('getPortalAuth', () => {
  it('returns null when there is no authorization header', async () => {
    expect(await getPortalAuth(requestWithToken())).toBeNull()
    expect(verifyToken).not.toHaveBeenCalled()
  })

  it('strips the Bearer prefix and delegates to verifyToken', async () => {
    verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
    const auth = await getPortalAuth(requestWithToken('tok-123'))
    expect(verifyToken).toHaveBeenCalledWith('tok-123')
    expect(auth).toEqual({ id: 'm-1', tid: 't-1', role: 'worker' })
  })

  it('returns null when verifyToken rejects the token', async () => {
    verifyToken.mockReturnValue(null)
    expect(await getPortalAuth(requestWithToken('forged'))).toBeNull()
  })
})

describe('requirePortalPermission', () => {
  it('returns 401 Unauthorized with no token, and never touches the DB', async () => {
    const result = await requirePortalPermission(requestWithToken(), 'jobs.view_own')
    expect(result.auth).toBeNull()
    expect(result.error!.status).toBe(401)
  })

  it('returns 401 Unauthorized when the token fails verification', async () => {
    verifyToken.mockReturnValue(null)
    const result = await requirePortalPermission(requestWithToken('forged'), 'jobs.view_own')
    expect(result.auth).toBeNull()
    expect(result.error!.status).toBe(401)
  })

  it('returns 401 "Account inactive" when no team_members row matches', async () => {
    verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
    handlers.team_members = () => null

    const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.view_own')
    expect(result.auth).toBeNull()
    const body = await result.error!.json()
    expect(result.error!.status).toBe(401)
    expect(body.error).toBe('Account inactive')
  })

  it('returns 401 "Account inactive" when the member is suspended', async () => {
    verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
    handlers.team_members = () => ({ status: 'suspended' })

    const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.view_own')
    expect(result.auth).toBeNull()
    expect(result.error!.status).toBe(401)
  })

  it('WRONG-TENANT PROBE: an active member id from a different tenant is not treated as this tenant\'s member', async () => {
    verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
    // The member row only "exists" when both id AND tenant_id match — simulates
    // member m-1 being active under tenant t-OTHER, not t-1.
    handlers.team_members = (eqs) =>
      eqs.id === 'm-1' && eqs.tenant_id === 't-1' ? null : { status: 'active' }

    const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.view_own')
    expect(result.auth).toBeNull()
    expect(result.error!.status).toBe(401)
  })

  it.each(['suspended', 'cancelled', 'deleted'])(
    'WRONG-STATUS PROBE: a %s tenant locks out an otherwise-active, otherwise-permitted member (403)',
    async (status) => {
      verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
      handlers.team_members = () => ({ status: 'active' })
      handlers.tenants = () => ({ status })

      const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.view_own')
      expect(result.auth).toBeNull()
      const body = await result.error!.json()
      expect(result.error!.status).toBe(403)
      expect(body.error).toBe('Tenant account is not active')
    },
  )

  it('WRONG-STATUS PROBE: a tenant row that fails to resolve is treated as not-active (fail closed)', async () => {
    verifyToken.mockReturnValue({ id: 'm-1', tid: 't-ghost', role: 'worker' })
    handlers.team_members = () => ({ status: 'active' })
    handlers.tenants = () => null

    const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.view_own')
    expect(result.auth).toBeNull()
    expect(result.error!.status).toBe(403)
  })

  it.each(['setup', 'pending', 'active'])(
    'a %s tenant (still serving) does not block an otherwise-permitted member',
    async (status) => {
      verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
      handlers.team_members = () => ({ status: 'active' })
      handlers.tenants = () => ({ status, selena_config: null })

      const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.view_own')
      expect(result.error).toBeNull()
      expect(result.auth).toEqual({ id: 'm-1', tid: 't-1', role: 'worker' })
    },
  )

  it('returns 403 Forbidden when the role lacks the permission by default', async () => {
    verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
    handlers.team_members = () => ({ status: 'active' })
    handlers.tenants = () => ({ selena_config: null })

    // 'jobs.reassign' is lead/manager-only, not granted to 'worker'.
    const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.reassign')
    expect(result.auth).toBeNull()
    const body = await result.error!.json()
    expect(result.error!.status).toBe(403)
    expect(body.error).toMatch(/Forbidden/)
  })

  it('grants access when the role has the permission by default', async () => {
    verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
    handlers.team_members = () => ({ status: 'active' })
    handlers.tenants = () => ({ selena_config: null })

    const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.view_own')
    expect(result.error).toBeNull()
    expect(result.auth).toEqual({ id: 'm-1', tid: 't-1', role: 'worker' })
  })

  it('respects a tenant override that GRANTS a permission normally denied to the role', async () => {
    verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
    handlers.team_members = () => ({ status: 'active' })
    handlers.tenants = () => ({
      selena_config: { portal_role_permissions: { worker: { 'jobs.reassign': true } } },
    })

    const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.reassign')
    expect(result.error).toBeNull()
  })

  it('respects a tenant override that REVOKES a permission normally allowed to the role', async () => {
    verifyToken.mockReturnValue({ id: 'm-1', tid: 't-1', role: 'worker' })
    handlers.team_members = () => ({ status: 'active' })
    handlers.tenants = () => ({
      selena_config: { portal_role_permissions: { worker: { 'jobs.view_own': false } } },
    })

    const result = await requirePortalPermission(requestWithToken('tok'), 'jobs.view_own')
    expect(result.auth).toBeNull()
    expect(result.error!.status).toBe(403)
  })

  it('WRONG-TENANT PROBE: an override configured for one tenant does not leak into another tenant\'s member with the same role', async () => {
    verifyToken.mockReturnValueOnce({ id: 'm-A', tid: 't-A', role: 'worker' })
    handlers.team_members = () => ({ status: 'active' })
    handlers.tenants = (eqs) =>
      eqs.id === 't-A'
        ? { selena_config: { portal_role_permissions: { worker: { 'jobs.reassign': true } } } }
        : { selena_config: null }

    const resultA = await requirePortalPermission(requestWithToken('tok-A'), 'jobs.reassign')
    expect(resultA.error).toBeNull()

    verifyToken.mockReturnValueOnce({ id: 'm-B', tid: 't-B', role: 'worker' })
    const resultB = await requirePortalPermission(requestWithToken('tok-B'), 'jobs.reassign')
    expect(resultB.auth).toBeNull()
    expect(resultB.error!.status).toBe(403)
  })
})

describe('scopedMemberIds', () => {
  it('manager sees all active field staff in the tenant', async () => {
    handlers.team_members = () => [{ id: 'm-1' }, { id: 'm-2' }, { id: 'm-3' }]

    const ids = await scopedMemberIds({ id: 'm-1', tid: 't-1', role: 'manager' })
    expect(ids.sort()).toEqual(['m-1', 'm-2', 'm-3'])
  })

  it('WRONG-TENANT PROBE: manager query is scoped by tenant_id, excluding other tenants\' staff', async () => {
    handlers.team_members = (eqs) =>
      eqs.tenant_id === 't-1' ? [{ id: 'm-1' }] : [{ id: 'other-tenant-member' }]

    const ids = await scopedMemberIds({ id: 'm-1', tid: 't-1', role: 'manager' })
    expect(ids).toEqual(['m-1'])
  })

  it('lead with no crews sees only themselves', async () => {
    handlers.crew_members = () => []

    const ids = await scopedMemberIds({ id: 'm-1', tid: 't-1', role: 'lead' })
    expect(ids).toEqual(['m-1'])
  })

  it('lead with crews sees themselves plus crewmates, deduped', async () => {
    let call = 0
    handlers.crew_members = (_eqs, inVals) => {
      call += 1
      if (call === 1) return [{ crew_id: 'crew-1' }]
      expect(inVals).toEqual(['crew-1'])
      return [{ team_member_id: 'm-1' }, { team_member_id: 'm-2' }]
    }

    const ids = await scopedMemberIds({ id: 'm-1', tid: 't-1', role: 'lead' })
    expect(new Set(ids)).toEqual(new Set(['m-1', 'm-2']))
    expect(ids.length).toBe(2)
  })

  it('worker sees only themselves', async () => {
    const ids = await scopedMemberIds({ id: 'm-1', tid: 't-1', role: 'worker' })
    expect(ids).toEqual(['m-1'])
  })
})
