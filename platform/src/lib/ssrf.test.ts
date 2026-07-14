import { describe, it, expect } from 'vitest'
import { isPrivateAddress, assertPublicUrl, SsrfError } from './ssrf'

describe('isPrivateAddress', () => {
  it('flags loopback, RFC1918, link-local and metadata addresses', () => {
    for (const ip of [
      '127.0.0.1', '10.0.0.5', '172.16.4.4', '172.31.255.255', '192.168.1.1',
      '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true)
    }
  })

  it('allows normal public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34']) {
      expect(isPrivateAddress(ip), ip).toBe(false)
    }
  })

  it('flags IPv6 loopback, ULA, link-local and mapped-private', () => {
    for (const ip of ['::1', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:127.0.0.1']) {
      expect(isPrivateAddress(ip), ip).toBe(true)
    }
  })

  it('treats non-IP strings as unsafe', () => {
    expect(isPrivateAddress('not-an-ip')).toBe(true)
  })
})

describe('assertPublicUrl', () => {
  // IP-literal hosts resolve without a network lookup, so these are deterministic.
  it('rejects a loopback IP-literal URL', async () => {
    await expect(assertPublicUrl('http://127.0.0.1/admin')).rejects.toBeInstanceOf(SsrfError)
  })

  it('rejects the cloud metadata endpoint', async () => {
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data/')).rejects.toBeInstanceOf(SsrfError)
  })

  it('rejects a private RFC1918 IP-literal URL', async () => {
    await expect(assertPublicUrl('http://10.1.2.3:6379/')).rejects.toBeInstanceOf(SsrfError)
  })

  it('rejects non-http(s) schemes', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toBeInstanceOf(SsrfError)
    await expect(assertPublicUrl('gopher://127.0.0.1/')).rejects.toBeInstanceOf(SsrfError)
  })

  it('rejects a malformed URL', async () => {
    await expect(assertPublicUrl('not a url')).rejects.toBeInstanceOf(SsrfError)
  })

  it('accepts a public IP-literal URL', async () => {
    const url = await assertPublicUrl('https://8.8.8.8/')
    expect(url.hostname).toBe('8.8.8.8')
  })
})
