/**
 * Cross-tenant master PIN — Jeff's key for every portal on the platform.
 * Used against a login it signs in as a representative record on file for
 * WHATEVER tenant the login is attempted against (client/team portals).
 * Deliberate platform-wide bypass, not a leaked secret — still gated by the
 * same rate limits as any other PIN attempt, and every successful use is
 * now recorded to audit_logs (action: 'auth.universal_pin_login') by the
 * two consumers (api/portal/auth, api/team-portal/auth).
 *
 * Rotatable via the UNIVERSAL_PORTAL_PIN env var without a code deploy —
 * falls back to the historical hardcoded value only so this keeps working
 * in any environment where the env var hasn't been set yet.
 *
 * NOTE: this does NOT gate /admin or /dashboard super-admin login — that's
 * the separate ADMIN_PIN env var checked in api/admin-auth, which never
 * reads this constant.
 */
import { safeEqual } from './timing-safe-equal'

export const UNIVERSAL_PIN = process.env.UNIVERSAL_PORTAL_PIN || '020179'

/** Constant-time check against the platform-wide master PIN. */
export function isUniversalPin(pin: string): boolean {
  return safeEqual(pin, UNIVERSAL_PIN)
}
