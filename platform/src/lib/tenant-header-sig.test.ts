import { describe, it, expect, beforeAll } from 'vitest'
import { createHmac } from 'crypto'
import { signTenantHeader, verifyTenantHeaderSig } from './tenant-header-sig'

/**
 * The signed companion to x-tenant-id. Middleware holds the secret; downstream
 * trusts a request's tenant id ONLY if the sig verifies. A forgeable sig =
 * cross-tenant access. This is a hand-rolled Edge-compatible HMAC-SHA256, so the
 * first job is proving it actually equals a real HMAC — a self-consistent but
 * wrong implementation would round-trip fine yet be cryptographically broken.
 */

const SECRET = 'tenant-header-test-secret'
const ref = (msg: string, key = SECRET) =>
  createHmac('sha256', key).update(msg).digest('hex')

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

describe('signTenantHeader — correctness vs reference HMAC', () => {
  it.each([
    '24d94cd6-9fc0-4882-b544-fa25a4542e9e',
    't-1',
    '',
    'a'.repeat(200),
  ])('matches Node crypto HMAC-SHA256 for %s', (id) => {
    expect(signTenantHeader(id)).toBe(ref(id))
  })

  it('matches reference even when the secret is longer than the 64-byte block (key gets hashed)', () => {
    const longSecret = 'x'.repeat(100)
    process.env.TENANT_HEADER_SIG_SECRET = longSecret
    expect(signTenantHeader('t-long')).toBe(ref('t-long', longSecret))
    process.env.TENANT_HEADER_SIG_SECRET = SECRET
  })
})

describe('verifyTenantHeaderSig', () => {
  it('accepts a signature it produced for the same tenant', () => {
    const id = 'tenant-A'
    expect(verifyTenantHeaderSig(id, signTenantHeader(id))).toBe(true)
  })

  it('rejects another tenant\'s valid signature (no cross-tenant reuse)', () => {
    const sigForB = signTenantHeader('tenant-B')
    expect(verifyTenantHeaderSig('tenant-A', sigForB)).toBe(false)
  })

  it('rejects a tampered signature', () => {
    const id = 'tenant-A'
    const sig = signTenantHeader(id)
    const tampered = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0')
    expect(verifyTenantHeaderSig(id, tampered)).toBe(false)
  })

  it('rejects a wrong-length signature (constant-time guard)', () => {
    expect(verifyTenantHeaderSig('tenant-A', 'abc')).toBe(false)
  })

  it.each([
    ['null sig', null],
    ['undefined sig', undefined],
    ['empty sig', ''],
  ])('rejects %s', (_l, sig) => {
    expect(verifyTenantHeaderSig('tenant-A', sig as string | null | undefined)).toBe(false)
  })

  it('rejects an empty tenant id even with some signature', () => {
    expect(verifyTenantHeaderSig('', signTenantHeader(''))).toBe(false)
  })
})
