import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHmac } from 'crypto'

// verifyToken now re-checks the token's tenant status AND the member's
// team_members.status / hr_status (terminated) in the DB on every call
// (async). Mock supabaseAdmin's `tenants`/`team_members`/`hr_employee_profiles`
// lookups so signature/expiry tests aren't coupled to a real DB; status-gate
// behavior gets its own describe blocks below.
const dbState = vi.hoisted(() => ({
  tenantStatuses: {} as Record<string, string | null | undefined>,
  // keyed by `${tenantId}:${memberId}`
  memberStatuses: {} as Record<string, string | null | undefined>,
  terminatedMembers: new Set<string>(),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        let queriedId: string | undefined
        const chain = {
          select: () => chain,
          eq: (_col: string, val: string) => {
            queriedId = val
            return chain
          },
          single: async () => {
            const status = queriedId !== undefined ? dbState.tenantStatuses[queriedId] : undefined
            return { data: status === undefined ? null : { status } }
          },
        }
        return chain
      }
      if (table === 'team_members') {
        let queriedId: string | undefined
        let queriedTenant: string | undefined
        const chain = {
          select: () => chain,
          eq: (col: string, val: string) => {
            if (col === 'id') queriedId = val
            if (col === 'tenant_id') queriedTenant = val
            return chain
          },
          single: async () => {
            const key = `${queriedTenant}:${queriedId}`
            const status = dbState.memberStatuses[key]
            return { data: status === undefined ? null : { status } }
          },
        }
        return chain
      }
      if (table === 'hr_employee_profiles') {
        let queriedTenant: string | undefined
        const chain = {
          select: () => chain,
          eq: (col: string, val: string) => {
            if (col === 'tenant_id') queriedTenant = val
            return chain
          },
          in: (_col: string, vals: string[]) => {
            const matched = vals.filter((id) => dbState.terminatedMembers.has(`${queriedTenant}:${id}`))
            return Promise.resolve({ data: matched.map((id) => ({ team_member_id: id })) })
          },
        }
        return chain
      }
      throw new Error(`unexpected table in mock: ${table}`)
    },
  },
}))

import { createToken, verifyToken } from './token'

const SECRET = 'test-team-portal-secret'
// Set at module load too — `it.each` table arguments are evaluated eagerly,
// before any `beforeEach` runs, and one of them mints a token.
process.env.TEAM_PORTAL_SECRET = SECRET

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = SECRET
  dbState.tenantStatuses = { 'tenant-1': 'active' }
  dbState.memberStatuses = { 'tenant-1:member-1': 'active' }
  dbState.terminatedMembers = new Set()
})

describe('team-portal token — round trip', () => {
  it('round-trips a valid token', async () => {
    const token = createToken('member-1', 'tenant-1', 12, 'lead')
    expect(await verifyToken(token)).toEqual({ id: 'member-1', tid: 'tenant-1', role: 'lead' })
  })

  it('defaults role to worker when omitted (legacy tokens)', async () => {
    const token = createToken('member-1', 'tenant-1')
    expect(await verifyToken(token)).toEqual({ id: 'member-1', tid: 'tenant-1', role: 'worker' })
  })
})

describe('team-portal token — forgery and tampering rejected', () => {
  // BUG (fixed this pass): verifyToken compared the signature with a plain
  // `sig !== expected` string compare instead of a constant-time compare —
  // the only HMAC-token verifier in this codebase still doing that (every
  // sibling: portal/auth/token, phone-fixup-token, referrer-portal-auth,
  // unsubscribe-token, webhook-verify, admin-auth all use timingSafeEqual).
  // These prove the fix rejects the same forgeries the old code rejected —
  // constant-time compare must not change the accept/reject outcome, only
  // remove the timing side-channel.
  it('rejects a tampered payload id (signature no longer matches)', async () => {
    const token = createToken('victim-member', 'tenant-1')
    const [payloadB64, sig] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    const tamperedB64 = Buffer.from(JSON.stringify({ ...payload, id: 'attacker-member' })).toString('base64')
    expect(await verifyToken(`${tamperedB64}.${sig}`)).toBeNull()
  })

  it('rejects a token signed with a different secret', async () => {
    const payload = JSON.stringify({ id: 'member-1', tid: 'tenant-1', pr: 0, r: 'worker', exp: Date.now() + 3600_000 })
    const wrongSig = createHmac('sha256', 'not-the-secret').update(payload).digest('hex')
    const forged = Buffer.from(payload).toString('base64') + '.' + wrongSig
    expect(await verifyToken(forged)).toBeNull()
  })

  it('rejects an expired token even with a valid signature', async () => {
    const token = createToken('member-1', 'tenant-1')
    const [payloadB64] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    const expiredPayload = JSON.stringify({ ...payload, exp: Date.now() - 1000 })
    const sig = createHmac('sha256', SECRET).update(expiredPayload).digest('hex')
    const expiredToken = Buffer.from(expiredPayload).toString('base64') + '.' + sig
    expect(await verifyToken(expiredToken)).toBeNull()
  })

  it.each([
    ['empty string', ''],
    ['no separator', 'garbage'],
    ['non-hex signature', 'AQID.not-hex-at-all!!'],
    ['truncated signature', (() => {
      const token = createToken('member-1', 'tenant-1')
      const [payloadB64, sig] = token.split('.')
      return `${payloadB64}.${sig.slice(0, 10)}`
    })()],
  ])('rejects %s without throwing', async (_label, input) => {
    await expect(verifyToken(input)).resolves.not.toThrow()
    expect(await verifyToken(input)).toBeNull()
  })
})

describe('team-portal token — fails closed when TEAM_PORTAL_SECRET is unconfigured', () => {
  beforeEach(() => {
    delete process.env.TEAM_PORTAL_SECRET
  })

  it('createToken throws instead of minting with no secret', () => {
    expect(() => createToken('member-1', 'tenant-1')).toThrow(/TEAM_PORTAL_SECRET/)
  })

  it('verifyToken fails closed (does not throw) with no secret configured', async () => {
    await expect(verifyToken('anything.anything')).resolves.not.toThrow()
    expect(await verifyToken('anything.anything')).toBeNull()
  })
})

describe('team-portal token — tenant status gate', () => {
  // A valid, unexpired, correctly-signed token must still be rejected once
  // its tenant goes dark — closes the gap where direct verifyToken() callers
  // (checkout, jobs, etc.) kept trusting a suspended/cancelled/deleted
  // tenant's tokens for up to 24h. Same NON_SERVING_STATUSES set as
  // tenant-status.ts / requirePortalPermission.
  it.each(['suspended', 'cancelled', 'deleted'])(
    'rejects an otherwise-valid token when its tenant is %s',
    async (status) => {
      dbState.tenantStatuses = { 'tenant-1': status }
      const token = createToken('member-1', 'tenant-1')
      expect(await verifyToken(token)).toBeNull()
    },
  )

  it.each(['setup', 'pending', 'active'])(
    'accepts a valid token when its tenant is %s (still serving)',
    async (status) => {
      dbState.tenantStatuses = { 'tenant-1': status }
      const token = createToken('member-1', 'tenant-1')
      expect(await verifyToken(token)).toEqual({ id: 'member-1', tid: 'tenant-1', role: 'worker' })
    },
  )

  it('fails closed when the tenant row does not resolve', async () => {
    dbState.tenantStatuses = {}
    const token = createToken('member-1', 'tenant-ghost')
    expect(await verifyToken(token)).toBeNull()
  })

  it('WRONG-TENANT PROBE: rejects based on the token\'s own tenant status, not an unrelated active tenant', async () => {
    // tenant-1 is active; tenant-2 (this token's tenant) is suspended. If the
    // status lookup weren't scoped correctly by the token's own tid, a bug
    // here could fall through to some other tenant's status.
    dbState.tenantStatuses = { 'tenant-1': 'active', 'tenant-2': 'suspended' }
    const token = createToken('member-1', 'tenant-2')
    expect(await verifyToken(token)).toBeNull()
  })

  it('WRONG-TENANT PROBE: accepts a token for its own active tenant even while a different tenant is suspended', async () => {
    dbState.tenantStatuses = { 'tenant-1': 'active', 'tenant-2': 'suspended' }
    const token = createToken('member-1', 'tenant-1')
    expect(await verifyToken(token)).toEqual({ id: 'member-1', tid: 'tenant-1', role: 'worker' })
  })
})

describe('team-portal token — member status gate (BUG FOUND + FIXED this pass)', () => {
  // BUG: verifyToken only re-checked tenant status, never the member's own
  // team_members.status or hr_status. requirePortalPermission (team-portal-auth.ts)
  // already re-checked both on every gated call, but ~14 routes call
  // verifyToken() directly and skip that wrapper entirely — including
  // checkin and checkout, the two routes where it matters most: a fired or
  // suspended worker's existing token (up to 24h life) could still check in,
  // check out, and get paid. Fixed by baking the same member check into
  // verifyToken() itself, mirroring the tenant-status fix above.
  it.each(['suspended', 'inactive'])(
    'rejects an otherwise-valid token when the member is %s',
    async (status) => {
      dbState.memberStatuses = { 'tenant-1:member-1': status }
      const token = createToken('member-1', 'tenant-1')
      expect(await verifyToken(token)).toBeNull()
    },
  )

  it('accepts a valid token when the member is active and not terminated', async () => {
    const token = createToken('member-1', 'tenant-1')
    expect(await verifyToken(token)).toEqual({ id: 'member-1', tid: 'tenant-1', role: 'worker' })
  })

  it('fails closed when the member row does not resolve', async () => {
    const token = createToken('ghost-member', 'tenant-1')
    expect(await verifyToken(token)).toBeNull()
  })

  it('rejects a terminated member (hr_status) even though team_members.status is still active', async () => {
    dbState.terminatedMembers = new Set(['tenant-1:member-1'])
    const token = createToken('member-1', 'tenant-1')
    expect(await verifyToken(token)).toBeNull()
  })

  it('WRONG-TENANT PROBE: scopes the member-status lookup by (tenant_id, id), not id alone', async () => {
    // The same member id is active under tenant-1 but suspended under
    // tenant-2. If the status lookup weren't scoped by the token's own tid,
    // the tenant-2 token could fall through to tenant-1's active status.
    dbState.tenantStatuses = { 'tenant-1': 'active', 'tenant-2': 'active' }
    dbState.memberStatuses = { 'tenant-1:member-1': 'active', 'tenant-2:member-1': 'suspended' }
    const tokenT1 = createToken('member-1', 'tenant-1')
    const tokenT2 = createToken('member-1', 'tenant-2')
    expect(await verifyToken(tokenT1)).toEqual({ id: 'member-1', tid: 'tenant-1', role: 'worker' })
    expect(await verifyToken(tokenT2)).toBeNull()
  })

  it('WRONG-TENANT PROBE: scopes the terminated-member check by tenant, not member id alone', async () => {
    // member-1 is terminated under tenant-2 only; tenant-1's copy must stay
    // unaffected — proves getTerminatedTeamMemberIds' tenant_id filter is
    // actually exercised by verifyToken, not just present in the query.
    dbState.tenantStatuses = { 'tenant-1': 'active', 'tenant-2': 'active' }
    dbState.memberStatuses = { 'tenant-1:member-1': 'active', 'tenant-2:member-1': 'active' }
    dbState.terminatedMembers = new Set(['tenant-2:member-1'])
    const tokenT1 = createToken('member-1', 'tenant-1')
    const tokenT2 = createToken('member-1', 'tenant-2')
    expect(await verifyToken(tokenT1)).toEqual({ id: 'member-1', tid: 'tenant-1', role: 'worker' })
    expect(await verifyToken(tokenT2)).toBeNull()
  })
})
