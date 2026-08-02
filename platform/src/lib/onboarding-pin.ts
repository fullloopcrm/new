/**
 * PIN gate layered on top of the signed /onboard/[token] link (see
 * onboarding-token.ts). The token is the real security — unguessable,
 * HMAC-signed, expiring — the PIN is friction on top for anyone who has the
 * link but shouldn't (e.g. it was forwarded without context). PIN = the last
 * 4 digits of the tenant's phone on file, so it needs no generation step or
 * storage of its own: it's a pure function of a field every tenant-creation
 * path already sets (see onboarding-link.ts, called from all 4 of them).
 */
import { stripPhone } from './phone'

interface TenantPhoneFields {
  phone?: string | null
  owner_phone?: string | null
}

/** Null when the tenant has no phone on file to derive a PIN from. */
export function expectedOnboardingPin(tenant: TenantPhoneFields): string | null {
  const digits = stripPhone(tenant.phone || tenant.owner_phone || '')
  if (digits.length < 4) return null
  return digits.slice(-4)
}
