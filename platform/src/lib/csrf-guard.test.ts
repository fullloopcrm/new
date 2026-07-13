import { describe, it, expect } from 'vitest'
import { isCrossSiteRequest } from './csrf-guard'

function headers(secFetchSite: string | null): Headers {
  const h = new Headers()
  if (secFetchSite !== null) h.set('sec-fetch-site', secFetchSite)
  return h
}

describe('isCrossSiteRequest', () => {
  it('is true only for an explicit cross-site value', () => {
    expect(isCrossSiteRequest(headers('cross-site'))).toBe(true)
  })

  it.each(['same-origin', 'same-site', 'none'])('is false for %s', (value) => {
    expect(isCrossSiteRequest(headers(value))).toBe(false)
  })

  it('is false (cannot tell) when the header is absent', () => {
    expect(isCrossSiteRequest(headers(null))).toBe(false)
  })
})
