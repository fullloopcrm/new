import { describe, it, expect, afterEach } from 'vitest'
import { verifyCronSecret } from './cron-auth'

describe('verifyCronSecret', () => {
  const ORIGINAL_SECRET = process.env.CRON_SECRET

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = ORIGINAL_SECRET
  })

  it('rejects with 500 when CRON_SECRET is unset, even if the caller sends the literal fallback header', async () => {
    delete process.env.CRON_SECRET
    // Bug this guards against: `Bearer ${process.env.CRON_SECRET}` silently
    // becomes the string 'Bearer undefined' when the env var is missing, so
    // this exact header used to authenticate against an unconfigured secret.
    const req = new Request('https://example.com/api/cron/whatever', {
      headers: { authorization: 'Bearer undefined' },
    })

    const result = verifyCronSecret(req)

    expect(result).not.toBeNull()
    expect(result?.status).toBe(500)
    const body = await result?.json()
    expect(body.error).toMatch(/misconfigur/i)
  })

  it('rejects with 500 when CRON_SECRET is an empty string, before comparing', async () => {
    process.env.CRON_SECRET = ''
    const req = new Request('https://example.com/api/cron/whatever', {
      headers: { authorization: 'Bearer ' },
    })

    const result = verifyCronSecret(req)

    expect(result).not.toBeNull()
    expect(result?.status).toBe(500)
  })

  it('rejects with 401 when CRON_SECRET is set but the header is wrong', () => {
    process.env.CRON_SECRET = 'correct-secret'
    const req = new Request('https://example.com/api/cron/whatever', {
      headers: { authorization: 'Bearer wrong-secret' },
    })

    const result = verifyCronSecret(req)

    expect(result).not.toBeNull()
    expect(result?.status).toBe(401)
  })

  it('allows the request through (returns null) when the header matches a configured secret', () => {
    process.env.CRON_SECRET = 'correct-secret'
    const req = new Request('https://example.com/api/cron/whatever', {
      headers: { authorization: 'Bearer correct-secret' },
    })

    const result = verifyCronSecret(req)

    expect(result).toBeNull()
  })
})
