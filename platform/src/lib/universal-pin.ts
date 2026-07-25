/**
 * Cross-tenant master PIN — Jeff's key for every portal on the platform.
 * Used against a login it signs in as a representative record on file for
 * WHATEVER tenant the login is attempted against (client/team portals), or
 * grants global super-admin (ADMIN_PIN env var, see api/admin-auth) for
 * /admin and /dashboard. Deliberate platform-wide bypass, not a leaked
 * secret — still gated by the same rate limits as any other PIN attempt.
 */
export const UNIVERSAL_PIN = '020179'
