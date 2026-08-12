/**
 * Cross-tenant master PIN — Jeff's key for every portal on the platform.
 * Used against a login it signs in as a representative record on file for
 * WHATEVER tenant the login is attempted against (client/team portals).
 * Deliberate platform-wide bypass, not a leaked secret — still gated by the
 * same rate limits as any other PIN attempt, and every successful use is
 * now recorded to audit_logs (action: 'auth.universal_pin_login') by the
 * two consumers (api/portal/auth, api/team-portal/auth).
 *
 * Rotatable via the UNIVERSAL_PORTAL_PIN env var without a code deploy.
 * No hardcoded fallback — the historical literal used to live here as a
 * default for environments where the env var wasn't set yet, but that
 * meant the same fixed value was sitting in git history as this platform's
 * cross-tenant master key. If the env var is unset, this now fails closed
 * (isUniversalPin always returns false) instead of falling back to a value
 * anyone with repo read access already has.
 *
 * NOTE: this does NOT gate /admin or /dashboard super-admin login — that's
 * the separate ADMIN_PIN env var checked in api/admin-auth, which never
 * reads this constant.
 */
import { safeEqual } from './timing-safe-equal'

export const UNIVERSAL_PIN = process.env.UNIVERSAL_PORTAL_PIN || null

/** Constant-time check against the platform-wide master PIN. Always false if unconfigured. */
export function isUniversalPin(pin: string): boolean {
  if (!UNIVERSAL_PIN) return false
  return safeEqual(pin, UNIVERSAL_PIN)
}
