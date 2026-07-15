import { describe, it, expect, beforeEach } from 'vitest'

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-comhub-voice-credential-secret'
})

describe('comhub-voice-credential-token', () => {
  it('CONTROL: a token minted for (credentialId, tenantId) verifies for that exact pair', async () => {
    const { signCredentialOwner, verifyCredentialOwner } = await import('./comhub-voice-credential-token')
    const token = signCredentialOwner('cred-1', 'tid-a')
    expect(verifyCredentialOwner(token, 'cred-1', 'tid-a')).toBe(true)
  })

  it('LOCK: a token minted for tenant A does not verify for tenant B (cross-tenant reuse)', async () => {
    const { signCredentialOwner, verifyCredentialOwner } = await import('./comhub-voice-credential-token')
    const token = signCredentialOwner('cred-1', 'tid-a')
    expect(verifyCredentialOwner(token, 'cred-1', 'tid-b')).toBe(false)
  })

  it('LOCK: a token minted for one credentialId does not verify for a different credentialId', async () => {
    const { signCredentialOwner, verifyCredentialOwner } = await import('./comhub-voice-credential-token')
    const token = signCredentialOwner('cred-1', 'tid-a')
    expect(verifyCredentialOwner(token, 'cred-2', 'tid-a')).toBe(false)
  })

  it('LOCK: missing token never verifies', async () => {
    const { verifyCredentialOwner } = await import('./comhub-voice-credential-token')
    expect(verifyCredentialOwner(undefined, 'cred-1', 'tid-a')).toBe(false)
    expect(verifyCredentialOwner('', 'cred-1', 'tid-a')).toBe(false)
  })

  it('LOCK: tampered signature never verifies', async () => {
    const { signCredentialOwner, verifyCredentialOwner } = await import('./comhub-voice-credential-token')
    const token = signCredentialOwner('cred-1', 'tid-a')
    const tampered = token.slice(0, -4) + 'dead'
    expect(verifyCredentialOwner(tampered, 'cred-1', 'tid-a')).toBe(false)
  })

  it('LOCK: expired token never verifies', async () => {
    const { verifyCredentialOwner } = await import('./comhub-voice-credential-token')
    const crypto = await import('crypto')
    const secret = process.env.ADMIN_TOKEN_SECRET!
    const expiredExp = Date.now() - 1000
    const payload = `cred-1.tid-a.${expiredExp}`
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const expiredToken = `${payload}.${sig}`
    expect(verifyCredentialOwner(expiredToken, 'cred-1', 'tid-a')).toBe(false)
  })
})
