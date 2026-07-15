import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { verifySsl } from './onboarding-verify'

/**
 * verifySsl() fetches `https://${domain}/` where `domain` is tenant.domain —
 * admin-editable data (businesses/[id] PATCH allow-list includes 'domain'),
 * not a hardcoded host. Every other domain-derived fetch in this codebase
 * (site-readiness, tenant-health, seo/remediate, seo/technical, seo/enrich)
 * already routes through safeFetch()'s SSRF guard; this one was missed.
 * IP-literal "domains" skip DNS in assertPublicUrl, so these are
 * synchronous-deterministic — no real network or DNS mocking needed.
 */

const ok = (status = 200) => ({
  status,
  headers: { get: () => null },
})

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('verifySsl — SSRF guard on admin-editable tenant.domain', () => {
  it('rejects a domain that resolves to the cloud metadata address, never hitting fetch', async () => {
    const result = await verifySsl('169.254.169.254')
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/HTTPS fetch failed/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a loopback domain (self-SSRF against the platform runtime itself)', async () => {
    const result = await verifySsl('127.0.0.1')
    expect(result.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an RFC1918 private-network domain', async () => {
    const result = await verifySsl('10.0.0.5')
    expect(result.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still verifies a genuine public domain (positive control)', async () => {
    fetchMock.mockResolvedValueOnce(ok(200))
    const result = await verifySsl('8.8.8.8')
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns not-ok without calling fetch when domain is empty', async () => {
    const result = await verifySsl('')
    expect(result.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
