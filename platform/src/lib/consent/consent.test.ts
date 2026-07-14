import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  EU_REGION_COOKIE,
  DNS_COOKIE,
  NOTICE_COOKIE,
  CONSENT_RECORD_COOKIE,
  CONSENT_POLICY_VERSION,
  CONSENT_MAX_AGE_DAYS,
  getCookie,
  setCookie,
  hasGpcSignal,
  isEuVisitor,
  getConsentRecord,
  setConsentRecord,
  isConsentRecordCurrent,
  shouldLoadAnalytics,
  shouldShowBanner,
} from './consent'

function clearAllCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; path=/; max-age=0`
  })
}

describe('consent cookie helpers', () => {
  beforeEach(() => clearAllCookies())
  afterEach(() => clearAllCookies())

  it('round-trips a cookie value', () => {
    setCookie('x', 'hello world')
    expect(getCookie('x')).toBe('hello world')
  })

  it('returns null for a cookie that was never set', () => {
    expect(getCookie('nope')).toBeNull()
  })
})

describe('isEuVisitor', () => {
  beforeEach(() => clearAllCookies())
  afterEach(() => clearAllCookies())

  it('is false when the edge region cookie is absent', () => {
    expect(isEuVisitor()).toBe(false)
  })

  it('is false when the edge region cookie is 0', () => {
    setCookie(EU_REGION_COOKIE, '0')
    expect(isEuVisitor()).toBe(false)
  })

  it('is true only when the edge region cookie is exactly 1', () => {
    setCookie(EU_REGION_COOKIE, '1')
    expect(isEuVisitor()).toBe(true)
  })
})

describe('consent record', () => {
  beforeEach(() => clearAllCookies())
  afterEach(() => clearAllCookies())

  it('is null when never set', () => {
    expect(getConsentRecord()).toBeNull()
  })

  it('is null on malformed JSON', () => {
    setCookie(CONSENT_RECORD_COOKIE, '{not json')
    expect(getConsentRecord()).toBeNull()
  })

  it('round-trips analytics=true with the current policy version', () => {
    setConsentRecord(true)
    const record = getConsentRecord()
    expect(record?.analytics).toBe(true)
    expect(record?.policyVersion).toBe(CONSENT_POLICY_VERSION)
    expect(isConsentRecordCurrent(record)).toBe(true)
  })

  it('round-trips analytics=false (an explicit reject) as current but non-loading', () => {
    setConsentRecord(false)
    const record = getConsentRecord()
    expect(isConsentRecordCurrent(record)).toBe(true)
    expect(record?.analytics).toBe(false)
  })

  it('is not current when the policy version is stale', () => {
    setCookie(
      CONSENT_RECORD_COOKIE,
      JSON.stringify({ analytics: true, policyVersion: 'old-version', timestamp: Date.now() })
    )
    expect(isConsentRecordCurrent(getConsentRecord())).toBe(false)
  })

  it('is not current once past the re-prompt window', () => {
    const expiredTimestamp = Date.now() - (CONSENT_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000
    setCookie(
      CONSENT_RECORD_COOKIE,
      JSON.stringify({ analytics: true, policyVersion: CONSENT_POLICY_VERSION, timestamp: expiredTimestamp })
    )
    expect(isConsentRecordCurrent(getConsentRecord())).toBe(false)
  })

  it('rejects a future-dated record (clock skew / tampering)', () => {
    const futureTimestamp = Date.now() + 24 * 60 * 60 * 1000
    setCookie(
      CONSENT_RECORD_COOKIE,
      JSON.stringify({ analytics: true, policyVersion: CONSENT_POLICY_VERSION, timestamp: futureTimestamp })
    )
    expect(isConsentRecordCurrent(getConsentRecord())).toBe(false)
  })
})

describe('shouldLoadAnalytics — EU/EEA/UK/Switzerland (GDPR opt-in)', () => {
  beforeEach(() => {
    clearAllCookies()
    setCookie(EU_REGION_COOKIE, '1')
  })
  afterEach(() => clearAllCookies())

  it('defaults to NOT loading analytics with no consent record', () => {
    expect(shouldLoadAnalytics()).toBe(false)
  })

  it('loads analytics only after an explicit accept', () => {
    setConsentRecord(true)
    expect(shouldLoadAnalytics()).toBe(true)
  })

  it('does not load analytics after an explicit reject', () => {
    setConsentRecord(false)
    expect(shouldLoadAnalytics()).toBe(false)
  })

  it('stops loading analytics once the consent record expires', () => {
    const expiredTimestamp = Date.now() - (CONSENT_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000
    setCookie(
      CONSENT_RECORD_COOKIE,
      JSON.stringify({ analytics: true, policyVersion: CONSENT_POLICY_VERSION, timestamp: expiredTimestamp })
    )
    expect(shouldLoadAnalytics()).toBe(false)
  })

  it('ignores the US opt-out cookie — GPC/DNS state is irrelevant in the EU opt-in path', () => {
    setConsentRecord(true)
    setCookie(DNS_COOKIE, '1') // a stray US opt-out cookie must not suppress an EU accept
    expect(shouldLoadAnalytics()).toBe(true)
  })
})

describe('shouldLoadAnalytics — everyone else (CCPA/CPRA opt-out)', () => {
  beforeEach(() => clearAllCookies())
  afterEach(() => {
    clearAllCookies()
    vi.unstubAllGlobals()
  })

  it('loads analytics by default with no cookies set', () => {
    expect(shouldLoadAnalytics()).toBe(true)
  })

  it('stops loading analytics once the visitor opts out (fl_dns)', () => {
    setCookie(DNS_COOKIE, '1')
    expect(shouldLoadAnalytics()).toBe(false)
  })

  it('honors a Global Privacy Control signal even without an explicit opt-out cookie', () => {
    vi.stubGlobal('navigator', { ...navigator, globalPrivacyControl: true })
    expect(hasGpcSignal()).toBe(true)
    expect(shouldLoadAnalytics()).toBe(false)
  })
})

describe('shouldShowBanner', () => {
  beforeEach(() => clearAllCookies())
  afterEach(() => clearAllCookies())

  it('EU: shows the banner until a current consent record exists', () => {
    setCookie(EU_REGION_COOKIE, '1')
    expect(shouldShowBanner()).toBe(true)
    setConsentRecord(true)
    expect(shouldShowBanner()).toBe(false)
  })

  it('EU: re-shows the banner once consent expires', () => {
    setCookie(EU_REGION_COOKIE, '1')
    const expiredTimestamp = Date.now() - (CONSENT_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000
    setCookie(
      CONSENT_RECORD_COOKIE,
      JSON.stringify({ analytics: true, policyVersion: CONSENT_POLICY_VERSION, timestamp: expiredTimestamp })
    )
    expect(shouldShowBanner()).toBe(true)
  })

  it('non-EU: shows the banner until acknowledged', () => {
    expect(shouldShowBanner()).toBe(true)
    setCookie(NOTICE_COOKIE, '1')
    expect(shouldShowBanner()).toBe(false)
  })
})
