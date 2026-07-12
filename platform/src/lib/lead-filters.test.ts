import { describe, it, expect } from 'vitest'
import {
  isSpamReferrer,
  isAdminReferrer,
  isBotUserAgent,
  isBlockedPage,
  isSearchReferrer,
  isCleanClick,
  isEngagementAction,
  findRealVisitorIds,
  type ClickRow,
} from './lead-filters'

/**
 * Lead-traffic filters. These gate which website clicks count as real human
 * traffic vs. spam/bots/admin — attribution and analytics both depend on them.
 * Every case asserts the concrete boolean/set outcome, so weakening a match
 * list or the "real visitor" rule fails the test.
 */
describe('isSpamReferrer', () => {
  it('matches known spam substrings, case-insensitively', () => {
    expect(isSpamReferrer('siteground')).toBe(true)
    expect(isSpamReferrer('https://TWICSY.com/foo')).toBe(true)
  })
  it('does not flag legitimate or empty referrers', () => {
    expect(isSpamReferrer('https://google.com')).toBe(false)
    expect(isSpamReferrer(null)).toBe(false)
    expect(isSpamReferrer(undefined)).toBe(false)
  })
})

describe('isAdminReferrer', () => {
  it('flags internal admin/team/portal paths', () => {
    expect(isAdminReferrer('https://site.com/admin')).toBe(true)
    expect(isAdminReferrer('https://site.com/team')).toBe(true)
    expect(isAdminReferrer('https://site.com/portal/dashboard')).toBe(true)
    expect(isAdminReferrer('https://site.com/administrator')).toBe(true)
  })
  it('does not flag public pages or empty referrers', () => {
    expect(isAdminReferrer('https://site.com/pricing')).toBe(false)
    expect(isAdminReferrer(null)).toBe(false)
  })
})

describe('isBotUserAgent', () => {
  it('flags known bot/crawler/tool user agents', () => {
    expect(isBotUserAgent('Googlebot/2.1')).toBe(true)
    expect(isBotUserAgent('curl/7.88.1')).toBe(true)
    expect(isBotUserAgent('python-requests/2.31')).toBe(true)
  })
  it('does not flag a normal browser UA or empty input', () => {
    expect(isBotUserAgent('Mozilla/5.0 (Macintosh) AppleWebKit Safari')).toBe(false)
    expect(isBotUserAgent(null)).toBe(false)
  })
})

describe('isBlockedPage', () => {
  it('blocks pages that start with a protected prefix', () => {
    expect(isBlockedPage('/admin/settings')).toBe(true)
    expect(isBlockedPage('/team')).toBe(true)
    expect(isBlockedPage('/portal/dashboard/overview')).toBe(true)
  })
  it('allows public pages and empty input', () => {
    expect(isBlockedPage('/pricing')).toBe(false)
    expect(isBlockedPage(null)).toBe(false)
  })
})

describe('isSearchReferrer', () => {
  it('recognizes search-engine referrers', () => {
    expect(isSearchReferrer('https://www.google.com/search?q=x')).toBe(true)
    expect(isSearchReferrer('https://bing.com/search')).toBe(true)
    expect(isSearchReferrer('https://search.brave.com/')).toBe(true)
  })
  it('treats direct / non-search / empty as not search', () => {
    expect(isSearchReferrer('direct')).toBe(false)
    expect(isSearchReferrer('https://example.com')).toBe(false)
    expect(isSearchReferrer(null)).toBe(false)
  })
})

describe('isEngagementAction', () => {
  it('recognizes only real engagement actions', () => {
    expect(isEngagementAction('call')).toBe(true)
    expect(isEngagementAction('scroll_50')).toBe(true)
    expect(isEngagementAction('form_success')).toBe(true)
  })
  it('rejects passive/unknown/empty actions', () => {
    expect(isEngagementAction('visit')).toBe(false)
    expect(isEngagementAction('random')).toBe(false)
    expect(isEngagementAction(null)).toBe(false)
  })
})

describe('isCleanClick', () => {
  const base: ClickRow = {
    referrer: 'https://google.com',
    user_agent: 'Mozilla/5.0 Safari',
    page: '/pricing',
    action: 'visit',
  }
  it('accepts a click that trips none of the filters', () => {
    expect(isCleanClick(base)).toBe(true)
  })
  it('rejects when any single filter trips', () => {
    expect(isCleanClick({ ...base, referrer: 'siteground' })).toBe(false)
    expect(isCleanClick({ ...base, referrer: 'https://x.com/admin' })).toBe(false)
    expect(isCleanClick({ ...base, user_agent: 'Googlebot/2.1' })).toBe(false)
    expect(isCleanClick({ ...base, page: '/admin/x' })).toBe(false)
  })
})

describe('findRealVisitorIds', () => {
  it('keeps visitors whose first visit has a non-direct referrer, drops the rest', () => {
    const events: ClickRow[] = [
      { visitor_id: 'v1', action: 'visit', referrer: 'https://google.com' }, // real
      { visitor_id: 'v2', action: 'visit', referrer: 'direct' },              // direct → drop
      { visitor_id: 'v3', action: 'visit', referrer: null },                  // no referrer → drop
      { session_id: 's4', action: 'visit', referrer: 'https://bing.com' },    // session_id fallback → real
      { action: 'visit', referrer: 'https://google.com' },                    // no id at all → skipped
      // v5's FIRST event is a non-visit/direct; the 'visit' event carries the real referrer.
      // Relies on selecting the visit event, not events[0].
      { visitor_id: 'v5', action: 'call', referrer: 'direct' },
      { visitor_id: 'v5', action: 'visit', referrer: 'https://google.com' },
    ]
    const real = findRealVisitorIds(events)
    expect(real).toEqual(new Set(['v1', 's4', 'v5']))
    expect(real.has('v2')).toBe(false)
    expect(real.has('v3')).toBe(false)
    expect(real.size).toBe(3)
  })
})
