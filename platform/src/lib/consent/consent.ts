/**
 * Shared cookie-consent core for every tenant marketing site (template-driven
 * and bespoke alike).
 *
 * Two jurisdictions, two lawful models:
 *  - US (default): CCPA/CPRA opt-out. Analytics loads by default; a visitor
 *    can opt out of "sale/share", and a Global Privacy Control browser signal
 *    is honored automatically as a valid opt-out request.
 *  - EU/EEA/UK/Switzerland: GDPR + ePrivacy Art. 5(3) opt-in. Analytics does
 *    NOT load until the visitor affirmatively accepts. Rejecting is exactly
 *    as easy as accepting (same-size buttons, same click count).
 *
 * `EU_REGION_COOKIE` is set at the edge (middleware, `rewriteToSite`) from the
 * Vercel geo header, so the region is known on first paint without forcing
 * marketing pages into dynamic rendering.
 */

/** '1' when the edge geo-detected the visitor as EU/EEA/UK/Switzerland. */
export const EU_REGION_COOKIE = 'fl_region_eu'

/** CCPA/CPRA "Do Not Sell or Share" opt-out. '1' = opted out. Non-EU only. */
export const DNS_COOKIE = 'fl_dns'
/** Cookie notice acknowledged (non-EU banner dismissed). '1' = dismissed. */
export const NOTICE_COOKIE = 'fl_cookie_notice'
/** GDPR opt-in consent record (EU visitors). JSON-encoded {@link ConsentRecord}. */
export const CONSENT_RECORD_COOKIE = 'fl_consent'

/** Bump when the cookie/consent notice copy changes materially. */
export const CONSENT_POLICY_VERSION = '2026-07-14'

/** How long a GDPR opt-in consent stays valid before the banner re-prompts. */
export const CONSENT_MAX_AGE_DAYS = 365

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

export interface ConsentRecord {
  analytics: boolean
  policyVersion: string
  /** Epoch milliseconds when the choice was recorded. */
  timestamp: number
}

export function setCookie(name: string, value: string, maxAge = ONE_YEAR_SECONDS): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

/** True when the browser advertises Global Privacy Control (a valid CPRA opt-out signal). */
export function hasGpcSignal(): boolean {
  if (typeof navigator === 'undefined') return false
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
}

/** True when the edge geo-detected this visitor as EU/EEA/UK/Switzerland. */
export function isEuVisitor(): boolean {
  return getCookie(EU_REGION_COOKIE) === '1'
}

export function getConsentRecord(): ConsentRecord | null {
  const raw = getCookie(CONSENT_RECORD_COOKIE)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.timestamp !== 'number') return null
    return {
      analytics: parsed.analytics,
      policyVersion: parsed.policyVersion ?? '',
      timestamp: parsed.timestamp,
    }
  } catch {
    return null
  }
}

export function setConsentRecord(analytics: boolean): void {
  const record: ConsentRecord = {
    analytics,
    policyVersion: CONSENT_POLICY_VERSION,
    timestamp: Date.now(),
  }
  setCookie(CONSENT_RECORD_COOKIE, JSON.stringify(record))
}

/** A GDPR consent record is only valid for the current policy and within the re-prompt window. */
export function isConsentRecordCurrent(record: ConsentRecord | null): record is ConsentRecord {
  if (!record) return false
  if (record.policyVersion !== CONSENT_POLICY_VERSION) return false
  const ageMs = Date.now() - record.timestamp
  return ageMs >= 0 && ageMs <= CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Whether non-essential analytics/measurement scripts may load right now.
 *  - EU visitor: only after a current, affirmative opt-in record.
 *  - Everyone else: on by default, unless opted out (fl_dns) or GPC is present.
 */
export function shouldLoadAnalytics(): boolean {
  if (isEuVisitor()) {
    const record = getConsentRecord()
    return isConsentRecordCurrent(record) && record.analytics
  }
  return getCookie(DNS_COOKIE) !== '1' && !hasGpcSignal()
}

/** Whether the consent banner should be shown right now. */
export function shouldShowBanner(): boolean {
  if (isEuVisitor()) {
    return !isConsentRecordCurrent(getConsentRecord())
  }
  return getCookie(NOTICE_COOKIE) !== '1'
}
