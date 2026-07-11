/**
 * CROSS-TENANT SELF-ATTACK — cryptographic gates.
 *
 * Provisions two test tenants (A, B) and, for every credential the platform
 * trusts to scope a request to ONE tenant, tries to make tenant A's credential
 * act on tenant B. Every cross-tenant / forged attempt MUST be rejected.
 *
 * This file covers the pure (no-DB) gates:
 *   - forged / cross-tenant signed headers      (tenant-header-sig)
 *   - capability tokens: super vs per-tenant     (admin-auth: verifyAdminToken / verifyTenantAdminToken)
 *   - impersonation cookie                        (impersonation)
 *   - client-portal session                       (client-auth)
 *   - team-portal bearer token                    (team-portal/auth/token)
 *   - referrer-portal bearer token                (referrer-portal-auth)
 *
 * Foreign-id DB isolation lives in cross-tenant-db.test.ts;
 * the request resolver lives in cross-tenant-resolver.test.ts.
 *
 * Secrets are set via vi.hoisted so they exist BEFORE admin-auth/route.ts reads
 * ADMIN_TOKEN_SECRET at module load. These are throwaway TEST secrets.
 */
import { describe, it, expect, vi } from 'vitest'
import crypto from 'crypto'

vi.hoisted(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-admin-token-secret'
  process.env.TENANT_HEADER_SIG_SECRET = 'test-tenant-header-secret'
  process.env.PORTAL_SECRET = 'test-portal-secret'
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

import { signTenantHeader, verifyTenantHeaderSig } from './tenant-header-sig'
import {
  createAdminToken,
  verifyAdminToken,
  createTenantAdminToken,
  verifyTenantAdminToken,
} from '@/app/api/admin-auth/route'
import { signImpersonation, verifyImpersonationCookie } from './impersonation'
import { createClientSession, verifyClientSessionToken } from './client-auth'
import { createToken as createTeamToken, verifyToken as verifyTeamToken } from '@/app/api/team-portal/auth/token'
import { createReferrerToken, verifyReferrerToken } from './referrer-portal-auth'

// --- Two provisioned tenants -------------------------------------------------
const A = {
  id: '11111111-1111-1111-1111-111111111111',
  memberId: 'aaaa-member',
  clientId: 'aaaa-client',
  referrerId: 'aaaa-referrer',
}
const B = {
  id: '22222222-2222-2222-2222-222222222222',
  memberId: 'bbbb-member',
  clientId: 'bbbb-client',
  referrerId: 'bbbb-referrer',
}

/** Swap the tenantId inside a base64.hmac token WITHOUT re-signing — the exact
 *  move an attacker who holds a valid tenant-A token but not the secret can make. */
function forgePayloadTenant(token: string, newTenantId: string): string {
  const [payloadB64, sig] = token.split('.')
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
  payload.tenantId = newTenantId
  payload.tid = newTenantId
  return Buffer.from(JSON.stringify(payload)).toString('base64') + '.' + sig
}

describe('CROSS-TENANT ATTACK · signed tenant header (forged headers)', () => {
  it('accepts a genuine sig for its own tenant (positive control)', () => {
    expect(verifyTenantHeaderSig(A.id, signTenantHeader(A.id))).toBe(true)
  })

  it('REJECTS tenant A being claimed with no sig', () => {
    expect(verifyTenantHeaderSig(A.id, undefined)).toBe(false)
    expect(verifyTenantHeaderSig(A.id, null)).toBe(false)
    expect(verifyTenantHeaderSig(A.id, '')).toBe(false)
  })

  it("REJECTS reusing tenant A's sig to assert tenant B (cross-tenant header replay)", () => {
    const sigForA = signTenantHeader(A.id)
    expect(verifyTenantHeaderSig(B.id, sigForA)).toBe(false)
  })

  it('REJECTS a tampered sig (single flipped nibble)', () => {
    const sig = signTenantHeader(A.id)
    const flipped = (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1)
    expect(verifyTenantHeaderSig(A.id, flipped)).toBe(false)
  })

  it('REJECTS a truncated / wrong-length sig', () => {
    const sig = signTenantHeader(A.id)
    expect(verifyTenantHeaderSig(A.id, sig.slice(0, -4))).toBe(false)
  })
})

describe('CROSS-TENANT ATTACK · capability tokens (per-tenant admin token)', () => {
  it('per-tenant token for A authorizes A (positive control)', () => {
    const tokenA = createTenantAdminToken(A.id, A.memberId, 'owner')
    expect(verifyTenantAdminToken(tokenA, A.id)).toEqual({ memberId: A.memberId, role: 'owner' })
  })

  it("REJECTS tenant A's admin token when presented for tenant B", () => {
    const tokenA = createTenantAdminToken(A.id, A.memberId, 'owner')
    expect(verifyTenantAdminToken(tokenA, B.id)).toBeNull()
  })

  it('REJECTS a token whose tenantId was swapped to B without re-signing', () => {
    const tokenA = createTenantAdminToken(A.id, A.memberId, 'owner')
    const forged = forgePayloadTenant(tokenA, B.id)
    expect(verifyTenantAdminToken(forged, B.id)).toBeNull()
    expect(verifyTenantAdminToken(forged, A.id)).toBeNull()
  })

  it('REJECTS a super-admin token at the per-tenant gate (no downgrade confusion)', () => {
    const superTok = createAdminToken()
    expect(verifyTenantAdminToken(superTok, A.id)).toBeNull()
  })

  it('REJECTS a per-tenant token at the super-admin gate (no privilege escalation)', () => {
    const tokenA = createTenantAdminToken(A.id, A.memberId, 'owner')
    expect(verifyAdminToken(tokenA)).toBe(false)
  })

  it('REJECTS an expired per-tenant token even for its own tenant', () => {
    // Hand-craft a correctly-signed but already-expired token.
    const payload = JSON.stringify({
      role: 'tenant_admin',
      tenantId: A.id,
      memberId: A.memberId,
      memberRole: 'owner',
      exp: Date.now() - 1000,
    })
    const hmac = crypto.createHmac('sha256', process.env.ADMIN_TOKEN_SECRET!).update(payload).digest('hex')
    const expired = Buffer.from(payload).toString('base64') + '.' + hmac
    expect(verifyTenantAdminToken(expired, A.id)).toBeNull()
  })
})

describe('CROSS-TENANT ATTACK · impersonation cookie', () => {
  it('genuine signed cookie resolves to its own tenant (positive control)', () => {
    expect(verifyImpersonationCookie(signImpersonation(A.id))).toBe(A.id)
  })

  it('REJECTS a raw unsigned tenant id (no forging fl_impersonate=<victim>)', () => {
    delete process.env.IMPERSONATION_ALLOW_UNSIGNED
    expect(verifyImpersonationCookie(B.id)).toBeNull()
  })

  it("REJECTS tenant B's id carried under tenant A's signature", () => {
    const sigForA = signImpersonation(A.id) // "<A>.<hmac(A)>"
    const hmacA = sigForA.split('.')[1]
    const forged = `${B.id}.${hmacA}`
    expect(verifyImpersonationCookie(forged)).toBeNull()
  })
})

describe('CROSS-TENANT ATTACK · client-portal session', () => {
  it('genuine session is bound to (client, tenant) it was minted for (positive control)', () => {
    const s = createClientSession(A.clientId, A.id)
    expect(verifyClientSessionToken(s)).toEqual({ clientId: A.clientId, tenantId: A.id })
  })

  it("REJECTS retargeting tenant A's client session to tenant B", () => {
    const s = createClientSession(A.clientId, A.id)
    const parts = s.split('.') // clientId.tenantId.ts.hmac
    const retargeted = [parts[0], B.id, parts[2], parts[3]].join('.')
    expect(verifyClientSessionToken(retargeted)).toBeNull()
  })

  it('REJECTS a session with a tampered client id', () => {
    const s = createClientSession(A.clientId, A.id)
    const parts = s.split('.')
    const swapped = [B.clientId, parts[1], parts[2], parts[3]].join('.')
    expect(verifyClientSessionToken(swapped)).toBeNull()
  })

  it('REJECTS malformed sessions', () => {
    expect(verifyClientSessionToken(undefined)).toBeNull()
    expect(verifyClientSessionToken('a.b.c')).toBeNull()
    expect(verifyClientSessionToken('...')).toBeNull()
  })
})

describe('CROSS-TENANT ATTACK · team-portal bearer token', () => {
  it('genuine token carries its own tenant id (positive control)', () => {
    const t = createTeamToken(A.memberId, A.id, 0, 'manager')
    expect(verifyTeamToken(t)).toEqual({ id: A.memberId, tid: A.id, role: 'manager' })
  })

  it('REJECTS a token whose tenant id was swapped to B without re-signing', () => {
    const t = createTeamToken(A.memberId, A.id, 0, 'manager')
    const forged = forgePayloadTenant(t, B.id)
    expect(verifyTeamToken(forged)).toBeNull()
  })

  it('a genuine tenant-A token can NEVER report tid=B — downstream .eq(tenant_id) is bound to A', () => {
    const t = createTeamToken(A.memberId, A.id, 0, 'worker')
    const decoded = verifyTeamToken(t)
    expect(decoded?.tid).toBe(A.id)
    expect(decoded?.tid).not.toBe(B.id)
  })
})

describe('CROSS-TENANT ATTACK · referrer-portal bearer token', () => {
  it('genuine referrer token carries its own tenant id (positive control)', () => {
    const t = createReferrerToken(A.referrerId, A.id)
    expect(verifyReferrerToken(t)).toEqual({ rid: A.referrerId, tid: A.id })
  })

  it('REJECTS a referrer token whose tenant id was swapped to B without re-signing', () => {
    const t = createReferrerToken(A.referrerId, A.id)
    const forged = forgePayloadTenant(t, B.id)
    expect(verifyReferrerToken(forged)).toBeNull()
  })

  it('REJECTS a team-portal token replayed against the referrer verifier (scope gate)', () => {
    // Same signing secret (TEAM_PORTAL_SECRET) — only the scope:"ref" field
    // stops a team token from being accepted as a referrer token.
    const teamTok = createTeamToken(A.memberId, A.id, 0, 'manager')
    expect(verifyReferrerToken(teamTok)).toBeNull()
  })
})
