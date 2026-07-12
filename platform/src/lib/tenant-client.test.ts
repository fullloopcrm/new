import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHmac } from 'crypto'

/**
 * tenantClient is the factory that makes RLS non-vacuous: it must mint a JWT that
 * carries role:"authenticated" + the correct tenant_id claim, sign it with a REAL
 * HMAC-SHA256 (a self-consistent-but-wrong signer would round-trip yet be rejected
 * by Supabase), and FAIL CLOSED — never silently fall back to service_role/anon —
 * when the secret is missing. Those three properties are what this suite pins.
 */

const SECRET = 'jwt-secret-for-tests-only'
const URL = 'https://proj.supabase.co'
const ANON = 'anon-key-xyz'
const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

// Capture what tenantClient passes to createClient without a real network client.
const createClientMock = vi.fn((..._args: unknown[]) => ({ __fake: true }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

// Import AFTER the mock is registered.
import { signTenantToken, tenantClient, TOKEN_TTL_SECONDS } from './tenant-client'

function decodePayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.')
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

beforeEach(() => {
  process.env.SUPABASE_JWT_SECRET = SECRET
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON
  createClientMock.mockClear()
})

afterEach(() => {
  delete process.env.SUPABASE_JWT_SECRET
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

describe('signTenantToken — claims', () => {
  it('carries role:authenticated, the tenant_id, aud, and default sub', () => {
    const claims = decodePayload(signTenantToken(TENANT))
    expect(claims.role).toBe('authenticated')
    expect(claims.tenant_id).toBe(TENANT)
    expect(claims.aud).toBe('authenticated')
    expect(claims.sub).toBe('operator')
  })

  it('uses the provided userId as sub', () => {
    const claims = decodePayload(signTenantToken(TENANT, { userId: 'user-42' }))
    expect(claims.sub).toBe('user-42')
  })

  it('sets exp = iat + TTL (default 300s) and honors a custom ttl', () => {
    const nowMs = 1_760_000_000_000
    const def = decodePayload(signTenantToken(TENANT, { nowMs }))
    expect(def.iat).toBe(Math.floor(nowMs / 1000))
    expect(def.exp).toBe(Math.floor(nowMs / 1000) + TOKEN_TTL_SECONDS)

    const custom = decodePayload(signTenantToken(TENANT, { nowMs, ttlSeconds: 60 }))
    expect(custom.exp).toBe(Math.floor(nowMs / 1000) + 60)
  })

  it('emits a valid HS256 header', () => {
    const [header] = signTenantToken(TENANT).split('.')
    expect(JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))).toEqual({
      alg: 'HS256',
      typ: 'JWT',
    })
  })
})

describe('signTenantToken — signature is a real HMAC-SHA256 (not self-consistent-only)', () => {
  it('signature equals an independent Node crypto HMAC over header.payload', () => {
    const token = signTenantToken(TENANT, { nowMs: 1_760_000_000_000 })
    const [h, p, sig] = token.split('.')
    const reference = createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')
    expect(sig).toBe(reference)
  })

  it('a token signed with a different secret does NOT verify against SECRET', () => {
    const token = signTenantToken(TENANT, { secret: 'attacker-secret', nowMs: 1_760_000_000_000 })
    const [h, p, sig] = token.split('.')
    const underRealSecret = createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')
    expect(sig).not.toBe(underRealSecret)
  })
})

describe('signTenantToken — fail closed', () => {
  it('throws when SUPABASE_JWT_SECRET is absent (never falls back)', () => {
    delete process.env.SUPABASE_JWT_SECRET
    expect(() => signTenantToken(TENANT)).toThrow(/SUPABASE_JWT_SECRET/)
  })

  it('throws when tenantId is empty', () => {
    expect(() => signTenantToken('')).toThrow(/tenantId/)
  })
})

describe('tenantClient — factory wiring', () => {
  it('creates a client with the url, anon key, and a Bearer token scoped to the tenant', () => {
    tenantClient(TENANT, 'user-7')

    expect(createClientMock).toHaveBeenCalledTimes(1)
    const [url, anon, opts] = createClientMock.mock.calls[0] as unknown as [
      string,
      string,
      { global: { headers: { Authorization: string } } },
    ]
    expect(url).toBe(URL)
    expect(anon).toBe(ANON)

    const auth = opts.global.headers.Authorization
    expect(auth).toMatch(/^Bearer /)
    const claims = decodePayload(auth.slice('Bearer '.length))
    expect(claims.role).toBe('authenticated')
    expect(claims.tenant_id).toBe(TENANT)
    expect(claims.sub).toBe('user-7')
  })

  it('throws (no client created) when the JWT secret is missing', () => {
    delete process.env.SUPABASE_JWT_SECRET
    expect(() => tenantClient(TENANT)).toThrow(/SUPABASE_JWT_SECRET/)
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('throws (no client created) when the Supabase URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(() => tenantClient(TENANT)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
