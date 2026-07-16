import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHmac } from 'crypto'

// verifyPortalToken now re-checks the token's tenant status in the DB on
// every call (async). Mock supabaseAdmin's `tenants` lookup so signature/
// expiry tests aren't coupled to a real DB; tenant-status behavior gets its
// own describe block below.
const tenantStatuses = vi.hoisted(() => ({ current: {} as Record<string, string | null | undefined> }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'tenants') throw new Error(`unexpected table in mock: ${table}`)
      let queriedId: string | undefined
      const chain = {
        select: () => chain,
        eq: (_col: string, val: string) => {
          queriedId = val
          return chain
        },
        single: async () => {
          const status = queriedId !== undefined ? tenantStatuses.current[queriedId] : undefined
          return { data: status === undefined ? null : { status } }
        },
      }
      return chain
    },
  },
}))

import { createToken, verifyPortalToken } from './token'

const SECRET = 'test-portal-secret'
// Set at module load too — `it.each` table arguments are evaluated eagerly,
// before any `beforeEach` runs, and one of them mints a token.
process.env.PORTAL_SECRET = SECRET

beforeEach(() => {
  process.env.PORTAL_SECRET = SECRET
  tenantStatuses.current = { 'tenant-1': 'active' }
})

describe('client portal token — round trip', () => {
  it('round-trips a valid token', async () => {
    const token = createToken('client-1', 'tenant-1')
    expect(await verifyPortalToken(token)).toEqual(expect.objectContaining({ id: 'client-1', tid: 'tenant-1' }))
  })
})

describe('client portal token — forgery and tampering rejected', () => {
  // BUG (fixed this pass, same class as team-portal/auth/token.ts): the
  // signature compare was a plain `sig !== expected` string comparison, not
  // timing-safe. Every sibling HMAC-token verifier in this codebase
  // (team-portal/auth/token, phone-fixup-token, referrer-portal-auth,
  // unsubscribe-token, webhook-verify, admin-auth) already uses
  // timingSafeEqual. These prove the fix rejects the same forgeries as
  // before — constant-time compare must not change accept/reject outcomes.
  it('rejects a tampered payload id (signature no longer matches)', async () => {
    const token = createToken('victim-client', 'tenant-1')
    const [payloadB64, sig] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    const tamperedB64 = Buffer.from(JSON.stringify({ ...payload, id: 'attacker-client' })).toString('base64')
    expect(await verifyPortalToken(`${tamperedB64}.${sig}`)).toBeNull()
  })

  it('rejects a token signed with a different secret', async () => {
    const payload = JSON.stringify({ id: 'client-1', tid: 'tenant-1', exp: Date.now() + 3600_000 })
    const wrongSig = createHmac('sha256', 'not-the-secret').update(payload).digest('hex')
    const forged = Buffer.from(payload).toString('base64') + '.' + wrongSig
    expect(await verifyPortalToken(forged)).toBeNull()
  })

  it('rejects an expired token even with a valid signature', async () => {
    const expiredPayload = JSON.stringify({ id: 'client-1', tid: 'tenant-1', exp: Date.now() - 1000 })
    const sig = createHmac('sha256', SECRET).update(expiredPayload).digest('hex')
    const expiredToken = Buffer.from(expiredPayload).toString('base64') + '.' + sig
    expect(await verifyPortalToken(expiredToken)).toBeNull()
  })

  it.each([
    ['empty string', ''],
    ['no separator', 'garbage'],
    ['non-hex signature', 'AQID.not-hex-at-all!!'],
    ['truncated signature', (() => {
      const token = createToken('client-1', 'tenant-1')
      const [payloadB64, sig] = token.split('.')
      return `${payloadB64}.${sig.slice(0, 10)}`
    })()],
  ])('rejects %s without throwing', async (_label, input) => {
    await expect(verifyPortalToken(input)).resolves.not.toThrow()
    expect(await verifyPortalToken(input)).toBeNull()
  })
})

describe('client portal token — fails closed when PORTAL_SECRET is unconfigured', () => {
  beforeEach(() => {
    delete process.env.PORTAL_SECRET
  })

  it('createToken throws instead of minting with no secret', () => {
    expect(() => createToken('client-1', 'tenant-1')).toThrow(/PORTAL_SECRET/)
  })

  it('verifyPortalToken fails closed (does not throw) with no secret configured', async () => {
    await expect(verifyPortalToken('anything.anything')).resolves.not.toThrow()
    expect(await verifyPortalToken('anything.anything')).toBeNull()
  })
})

describe('client portal token — tenant status gate', () => {
  // A valid, unexpired, correctly-signed token must still be rejected once
  // its tenant goes dark — closes the gap where direct verifyPortalToken()
  // callers (bookings, availability, etc.) kept trusting a suspended/
  // cancelled/deleted tenant's tokens for up to 24h. Same
  // NON_SERVING_STATUSES set as tenant-status.ts.
  it.each(['suspended', 'cancelled', 'deleted'])(
    'rejects an otherwise-valid token when its tenant is %s',
    async (status) => {
      tenantStatuses.current = { 'tenant-1': status }
      const token = createToken('client-1', 'tenant-1')
      expect(await verifyPortalToken(token)).toBeNull()
    },
  )

  it.each(['setup', 'pending', 'active'])(
    'accepts a valid token when its tenant is %s (still serving)',
    async (status) => {
      tenantStatuses.current = { 'tenant-1': status }
      const token = createToken('client-1', 'tenant-1')
      expect(await verifyPortalToken(token)).toEqual(expect.objectContaining({ id: 'client-1', tid: 'tenant-1' }))
    },
  )

  it('fails closed when the tenant row does not resolve', async () => {
    tenantStatuses.current = {}
    const token = createToken('client-1', 'tenant-ghost')
    expect(await verifyPortalToken(token)).toBeNull()
  })

  it('WRONG-TENANT PROBE: rejects based on the token\'s own tenant status, not an unrelated active tenant', async () => {
    // tenant-1 is active; tenant-2 (this token's tenant) is suspended. If the
    // status lookup weren't scoped correctly by the token's own tid, a bug
    // here could fall through to some other tenant's status.
    tenantStatuses.current = { 'tenant-1': 'active', 'tenant-2': 'suspended' }
    const token = createToken('client-1', 'tenant-2')
    expect(await verifyPortalToken(token)).toBeNull()
  })

  it('WRONG-TENANT PROBE: accepts a token for its own active tenant even while a different tenant is suspended', async () => {
    tenantStatuses.current = { 'tenant-1': 'active', 'tenant-2': 'suspended' }
    const token = createToken('client-1', 'tenant-1')
    expect(await verifyPortalToken(token)).toEqual(expect.objectContaining({ id: 'client-1', tid: 'tenant-1' }))
  })
})
