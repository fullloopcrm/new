import { NextRequest } from 'next/server'

/**
 * Shared identity-key resolution for the management-application draft flow
 * (draft/route.ts + the sibling route.ts submit handler's own draft cleanup —
 * both must agree on the same key or the cleanup silently misses the row the
 * client actually saved under).
 *
 * Keyed on an opaque client_id the browser generates once and persists
 * (localStorage, see src/lib/apply-client-id.ts) instead of the raw IP —
 * applicants sharing a public IP (mobile-carrier CGNAT, campus/corporate NAT,
 * coffee-shop wifi, VPN exit node) would otherwise collide on the same draft
 * row. Falls back to IP only when no client_id is supplied (e.g. JS
 * disabled), matching the pre-fix (weaker) behavior rather than breaking the
 * feature outright. No schema change: the value is stored in the existing
 * `ip_address` column, which was already just an opaque dedup key, never
 * validated as an actual IP shape.
 */

const CLIENT_ID_RE = /^[A-Za-z0-9-]{8,64}$/

export function getRequestIp(request: NextRequest | Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export function resolveVisitorKey(clientId: unknown, ip: string): string | null {
  if (typeof clientId === 'string' && CLIENT_ID_RE.test(clientId)) return clientId
  return ip === 'unknown' ? null : ip
}
