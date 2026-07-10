/**
 * Consent cookie helpers (CCPA/CPRA opt-out model).
 *
 * US home-services tenants run an opt-out model: analytics/measurement is on by
 * default, and the customer can opt out of "sale/share" of personal info. That
 * opt-out is recorded in the `fl_dns` cookie and ALSO honored automatically when
 * the browser sends a Global Privacy Control signal (Sec-GPC: 1), which CPRA
 * treats as a valid opt-out request.
 *
 * The server layout reads these to decide whether to load the analytics script;
 * the opt-out is therefore functional, not decorative.
 */

/** Do Not Sell/Share opt-out. '1' = opted out. */
export const DNS_COOKIE = 'fl_dns'
/** Cookie notice acknowledged. '1' = dismissed. */
export const NOTICE_COOKIE = 'fl_cookie_notice'

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

export function setConsentCookie(name: string, value: string, maxAge = ONE_YEAR_SECONDS): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`
}

export function getConsentCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

/** True when the browser advertises Global Privacy Control. */
export function hasGpcSignal(): boolean {
  if (typeof navigator === 'undefined') return false
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
}
