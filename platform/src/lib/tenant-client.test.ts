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

  it('throws when tenantId is null or undefined (never mints an unscoped token)', () => {
    // A token with no tenant_id claim would read every tenant's rows under the
    // policy `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid` — fail closed instead.
    expect(() => signTenantToken(null as unknown as string)).toThrow(/tenantId/)
    expect(() => signTenantToken(undefined as unknown as string)).toThrow(/tenantId/)
  })
})

describe('signTenantToken — cross-tenant rejection (the tenant_id is signature-bound)', () => {
  const TENANT_B = 'b7f3e2a1-0000-4000-8000-000000000000'

  it('mints a distinct tenant_id AND a distinct signature per tenant (no token replay across tenants)', () => {
    const nowMs = 1_760_000_000_000
    const tokenA = signTenantToken(TENANT, { nowMs })
    const tokenB = signTenantToken(TENANT_B, { nowMs })

    expect(decodePayload(tokenA).tenant_id).toBe(TENANT)
    expect(decodePayload(tokenB).tenant_id).toBe(TENANT_B)
    // Same secret + same instant, yet the whole token differs — the tenant_id is
    // inside the HMAC input, so A's token cannot stand in for B's.
    expect(tokenA).not.toBe(tokenB)
    expect(tokenA.split('.')[2]).not.toBe(tokenB.split('.')[2])
  })

  it('swapping the tenant_id claim on a valid token invalidates the signature (cannot forge tenant B from tenant A)', () => {
    // Attacker takes a legit token scoped to TENANT and rewrites the payload to
    // TENANT_B. Because they lack SECRET, the signature no longer matches the
    // tampered payload — Supabase (verifying HS256) would reject it. We prove the
    // binding: a real HMAC over the forged payload differs from the carried sig.
    const token = signTenantToken(TENANT, { nowMs: 1_760_000_000_000 })
    const [h, , sig] = token.split('.')
    const forgedClaims = { ...decodePayload(token), tenant_id: TENANT_B }
    const forgedPayload = Buffer.from(JSON.stringify(forgedClaims)).toString('base64url')

    const sigOverForged = createHmac('sha256', SECRET).update(`${h}.${forgedPayload}`).digest('base64url')
    expect(sig).not.toBe(sigOverForged) // carried sig does not cover the forged tenant_id
  })
})

describe('signTenantToken — injection attempts cannot smuggle claims', () => {
  it('a tenant_id crafted to break out of JSON is carried verbatim; role stays authenticated', () => {
    // If tenant_id were concatenated into the token rather than JSON-encoded, this
    // payload would inject a role:service_role claim. JSON.stringify escapes it into
    // a single string value, so it round-trips as data and cannot elevate role.
    const evil = 'a","role":"service_role","x":"'
    const claims = decodePayload(signTenantToken(evil))
    expect(claims.tenant_id).toBe(evil) // exact round-trip, no truncation
    expect(claims.role).toBe('authenticated') // NOT service_role
  })

  it('a tenant_id containing a dot does not add JWT segments', () => {
    // A dot is the JWT segment delimiter. It lives inside a base64url-encoded
    // payload here, so the token still has exactly 3 segments.
    const token = signTenantToken('11111111.2222.3333', { nowMs: 1_760_000_000_000 })
    expect(token.split('.')).toHaveLength(3)
    expect(decodePayload(token).tenant_id).toBe('11111111.2222.3333')
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

  it('throws (no client created) for empty / null / undefined tenantId', () => {
    // Never hand back a client carrying an unscoped token — fail closed before createClient.
    for (const bad of ['', null, undefined]) {
      expect(() => tenantClient(bad as unknown as string)).toThrow(/tenantId/)
    }
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('disables session persistence and auto-refresh (token is per-request, must not be stored/refreshed)', () => {
    // A persisted or auto-refreshed session would outlive the one request and could be
    // reused across tenants — exactly the bypass tenantClient exists to prevent. Pin the
    // per-request, no-storage posture at the factory boundary.
    tenantClient(TENANT)
    const [, , opts] = createClientMock.mock.calls[0] as unknown as [
      string,
      string,
      { auth: { persistSession: boolean; autoRefreshToken: boolean } },
    ]
    expect(opts.auth.persistSession).toBe(false)
    expect(opts.auth.autoRefreshToken).toBe(false)
  })

  it('does NOT fail closed on a missing anon key — passes "" (Bearer token, not anon key, carries the claims)', () => {
    // Only URL + JWT secret are fail-closed invariants. The anon key merely selects the
    // apikey header; PostgREST reads the DB role + tenant_id from the Bearer JWT. Document
    // that absence of the anon key still yields a (tenant-scoped) client with "" anon.
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    expect(() => tenantClient(TENANT)).not.toThrow()
    const [, anon, opts] = createClientMock.mock.calls[0] as unknown as [
      string,
      string,
      { global: { headers: { Authorization: string } } },
    ]
    expect(anon).toBe('')
    // The scope still comes from the Bearer token, not the (empty) anon key.
    const claims = decodePayload(opts.global.headers.Authorization.slice('Bearer '.length))
    expect(claims.tenant_id).toBe(TENANT)
  })
})

describe('signTenantToken — encoding + numeric-claim edge cases', () => {
  it('every segment is base64url (no +, /, or = padding) so the JWT is URL/header-safe', () => {
    const token = signTenantToken(TENANT, { nowMs: 1_760_000_000_123 })
    for (const seg of token.split('.')) {
      expect(seg).not.toMatch(/[+/=]/)
      expect(seg.length).toBeGreaterThan(0)
    }
  })

  it('iat and exp are integer epoch SECONDS even for a non-round clock (Math.floor, no fractions)', () => {
    // A fractional exp is a spec violation and some verifiers reject it. 1_760_000_000_123ms
    // must floor to 1_760_000_000s, not 1_760_000_000.123.
    const claims = decodePayload(signTenantToken(TENANT, { nowMs: 1_760_000_000_123 }))
    expect(claims.iat).toBe(1_760_000_000)
    expect(claims.exp).toBe(1_760_000_000 + TOKEN_TTL_SECONDS)
    expect(Number.isInteger(claims.iat)).toBe(true)
    expect(Number.isInteger(claims.exp)).toBe(true)
    expect((claims.exp as number) - (claims.iat as number)).toBe(TOKEN_TTL_SECONDS)
  })

  it('a positive opts.secret override actually signs the token (verifies under that secret)', () => {
    // Complements the "different secret does NOT verify against SECRET" test with the
    // positive direction: opts.secret is the real signing key, not ignored.
    const override = 'a-different-but-valid-secret'
    const token = signTenantToken(TENANT, { secret: override, nowMs: 1_760_000_000_000 })
    const [h, p, sig] = token.split('.')
    const reference = createHmac('sha256', override).update(`${h}.${p}`).digest('base64url')
    expect(sig).toBe(reference)
  })
})
