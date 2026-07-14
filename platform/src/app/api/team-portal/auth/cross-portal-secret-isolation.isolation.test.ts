import { describe, it, expect, afterAll } from 'vitest'
import { createToken as createPortalToken, verifyPortalToken } from '@/app/api/portal/auth/token'
import { createToken as createTeamToken, verifyToken as verifyTeamToken } from '@/app/api/team-portal/auth/token'

/**
 * W4 config-risk regression (latent risk flagged 10:44).
 *
 * The client portal (PORTAL_SECRET) and the field-staff/team portal
 * (TEAM_PORTAL_SECRET) mint STRUCTURALLY-COMPATIBLE HMAC bearer tokens:
 *   client: { id, tid, exp }
 *   team:   { id, tid, pr, r, exp }
 * Each verifier only checks HMAC(payload, itsOwnSecret), expiry, and reads id/tid.
 *
 * The ONLY thing keeping the two portals isolated is that the two secrets are
 * DIFFERENT. If they were ever set equal — one shared value, a copy-paste, a
 * shared fallback — the boundary collapses SILENTLY: a client-portal token would
 * verify as a team-portal (worker-tier) field-staff session and vice-versa. And
 * the existing portal-token-verify.isolation.test would STILL pass, because it
 * hard-codes two different test secrets. Nothing guards the actual invariant.
 *
 * This file makes that invariant explicit with a non-vacuous paired control:
 *   1. equal secrets   → cross-portal tokens ARE accepted (collapse demonstrated)
 *   2. distinct secrets → same tokens are rejected across portals, yet each still
 *                         verifies on its OWN portal (isolation holds; not vacuous)
 *   3. config guard     → the ACTUAL configured secrets, when both are present in
 *                         the environment, must not be equal
 */

// Capture the real environment BEFORE any test mutates it, so the config guard
// checks the deployed values rather than a test fixture.
const ORIG = {
  portal: process.env.PORTAL_SECRET,
  team: process.env.TEAM_PORTAL_SECRET,
}

afterAll(() => {
  if (ORIG.portal === undefined) delete process.env.PORTAL_SECRET
  else process.env.PORTAL_SECRET = ORIG.portal
  if (ORIG.team === undefined) delete process.env.TEAM_PORTAL_SECRET
  else process.env.TEAM_PORTAL_SECRET = ORIG.team
})

describe('cross-portal token isolation depends on PORTAL_SECRET != TEAM_PORTAL_SECRET', () => {
  it('COLLAPSE: equal secrets let a client-portal token verify as a team (field-staff) session, and vice-versa', () => {
    process.env.PORTAL_SECRET = 'shared-secret-danger'
    process.env.TEAM_PORTAL_SECRET = 'shared-secret-danger'

    // A client-portal token is accepted by the TEAM verifier → worker-tier field
    // access (role defaults to 'worker' since the client payload has no `r`).
    const clientTok = createPortalToken('client-A', 'tenant-A')
    expect(verifyTeamToken(clientTok)).toEqual({ id: 'client-A', tid: 'tenant-A', role: 'worker' })

    // ...and the reverse: a team token is accepted by the CLIENT verifier.
    const teamTok = createTeamToken('member-A', 'tenant-A')
    expect(verifyPortalToken(teamTok)).toMatchObject({ id: 'member-A', tid: 'tenant-A' })
  })

  it('CONTROL: distinct secrets reject cross-portal tokens, yet each verifies on its OWN portal', () => {
    process.env.PORTAL_SECRET = 'portal-secret-distinct'
    process.env.TEAM_PORTAL_SECRET = 'team-secret-distinct'

    const clientTok = createPortalToken('client-A', 'tenant-A')
    const teamTok = createTeamToken('member-A', 'tenant-A')

    // Non-vacuous: each verifier still accepts its own portal's token.
    expect(verifyPortalToken(clientTok)).toMatchObject({ id: 'client-A', tid: 'tenant-A' })
    expect(verifyTeamToken(teamTok)).toEqual({ id: 'member-A', tid: 'tenant-A', role: 'worker' })

    // Isolation holds: neither token crosses to the other portal.
    expect(verifyTeamToken(clientTok)).toBeNull()
    expect(verifyPortalToken(teamTok)).toBeNull()
  })

  // Fires in any environment where BOTH secrets are configured (staging/prod CI
  // with real secrets, or a developer .env). Skipped — not silently passed — when
  // either is absent, since there is nothing real to compare. The behavioral
  // tests above carry the regression signal everywhere.
  const bothConfigured = Boolean(ORIG.portal) && Boolean(ORIG.team)
  it.skipIf(!bothConfigured)('CONFIG GUARD: the configured PORTAL_SECRET and TEAM_PORTAL_SECRET are not equal', () => {
    expect(ORIG.portal).not.toBe(ORIG.team)
  })
})
