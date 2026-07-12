import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { safeFetch, SsrfError } from './ssrf'

/**
 * SSRF redirect-revalidation regression [fix 871b38c].
 *
 * assertPublicUrl() alone only guards the FIRST hop. The teeth of the fix are
 * in safeFetch(): it forces `redirect: 'manual'` and re-runs assertPublicUrl on
 * every Location it is handed, so a public URL cannot 3xx the server into
 * 127.0.0.1 / 169.254.169.254 / RFC1918 / IPv6-loopback. If safeFetch ever
 * regresses to native `redirect: 'follow'` (or drops the per-hop check), these
 * fail: the "private hop is never fetched" assertions are the trip wire.
 *
 * fetch is mocked so no network is touched and hops are deterministic. IP-literal
 * targets skip DNS, so assertPublicUrl is synchronous-deterministic here.
 */

// Minimal Response-shaped stubs — safeFetch only reads .status + headers.get('location').
const redirectTo = (location: string) => ({
  status: 302,
  headers: { get: (k: string) => (k.toLowerCase() === 'location' ? location : null) },
})
const ok = (body = 'ok') => ({
  status: 200,
  headers: { get: () => null },
  text: async () => body,
})

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('safeFetch — redirect re-validation (SSRF)', () => {
  it('blocks a public URL that redirects to the cloud metadata endpoint, and never fetches it', async () => {
    fetchMock.mockResolvedValueOnce(redirectTo('http://169.254.169.254/latest/meta-data/'))
    await expect(safeFetch('https://8.8.8.8/')).rejects.toBeInstanceOf(SsrfError)
    // Only the public first hop was fetched; the metadata hop was rejected pre-fetch.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('blocks a public URL that redirects to an RFC1918 loopback (v4)', async () => {
    fetchMock.mockResolvedValueOnce(redirectTo('http://127.0.0.1/admin'))
    await expect(safeFetch('https://8.8.8.8/')).rejects.toBeInstanceOf(SsrfError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('blocks a public URL that redirects to IPv6 loopback ([::1])', async () => {
    fetchMock.mockResolvedValueOnce(redirectTo('http://[::1]:8080/'))
    await expect(safeFetch('https://8.8.8.8/')).rejects.toBeInstanceOf(SsrfError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('blocks a private target before any fetch is issued', async () => {
    await expect(safeFetch('http://10.1.2.3:6379/')).rejects.toBeInstanceOf(SsrfError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('follows a public -> public redirect and returns the final response', async () => {
    fetchMock
      .mockResolvedValueOnce(redirectTo('https://1.1.1.1/next'))
      .mockResolvedValueOnce(ok('final-body'))
    const res = await safeFetch('https://8.8.8.8/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('final-body')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('forces redirect:manual so it controls every hop itself', async () => {
    fetchMock.mockResolvedValueOnce(ok())
    await safeFetch('https://8.8.8.8/', { headers: { 'x-test': '1' } })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.redirect).toBe('manual')
    expect(init.headers).toEqual({ 'x-test': '1' }) // caller init preserved
  })

  it('throws after exceeding the redirect cap on an endless public redirect chain', async () => {
    fetchMock.mockResolvedValue(redirectTo('https://9.9.9.9/loop'))
    await expect(safeFetch('https://8.8.8.8/')).rejects.toThrow(/too many redirects/)
    // MAX_REDIRECTS (5) + the initial hop = 6 fetches, then it gives up.
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })
})
