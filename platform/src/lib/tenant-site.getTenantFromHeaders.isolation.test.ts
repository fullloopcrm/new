import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { signTenantHeader } from './tenant-header-sig'

/**
 * `getTenantFromHeaders()` (tenant-site.ts) resolves the tenant for public
 * /site + /api requests from the `x-tenant-id` header. Because the platform runs
 * on the service_role key, trusting a caller-supplied x-tenant-id would let a
 * curl-er impersonate ANY tenant. The guard: only middleware knows the signing
 * secret, so the helper must verify the companion `x-tenant-sig` (real HMAC via
 * tenant-header-sig.ts) BEFORE looking the tenant up. It must fail CLOSED:
 *
 *   - no x-tenant-id            -> null (no lookup)
 *   - missing x-tenant-sig      -> null (forged header)
 *   - wrong / foreign-signed sig -> null
 *   - a sig minted for tenant-A replayed on an x-tenant-id of tenant-B -> null
 *
 * The signature check is the REAL verifier (only next/headers + supabase are
 * stubbed), and supabase is a faithful id->row lookup, so the positive control
 * (correct id+sig returns THAT tenant's row) proves the null cases aren't
 * vacuous "always null".
 */

const SECRET = 'tenant-header-sig-secret-under-test'
const FOREIGN_SECRET = 'a-totally-different-sig-secret'
const ORIG_SECRET = process.env.TENANT_HEADER_SIG_SECRET

// Controllable request headers (reset per test).
const hdr = vi.hoisted(() => ({ map: {} as Record<string, string> }))
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => hdr.map[k.toLowerCase()] ?? null }),
}))

// Faithful tenants table: .eq('id', x).single() returns the row iff x matches.
const store = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }))
vi.mock('@/lib/supabase', () => {
  function builder() {
    let idFilter: unknown
    const b = {
      select: () => b,
      eq: (col: string, val: unknown) => {
        if (col === 'id') idFilter = val
        return b
      },
      single: async () => {
        const row = store.rows.find((r) => r.id === idFilter) ?? null
        return { data: row, error: row ? null : { message: 'no rows' } }
      },
    }
    return b
  }
  return { supabaseAdmin: { from: () => builder() } }
})

import { getTenantFromHeaders } from './tenant-site'

/** Foreign HMAC in the exact hex shape of a real sig, but wrong key. */
function foreignSig(tenantId: string): string {
  const saved = process.env.TENANT_HEADER_SIG_SECRET
  process.env.TENANT_HEADER_SIG_SECRET = FOREIGN_SECRET
  const sig = signTenantHeader(tenantId)
  process.env.TENANT_HEADER_SIG_SECRET = saved
  return sig
}

function setHeaders(tenantId?: string, sig?: string) {
  hdr.map = {}
  if (tenantId !== undefined) hdr.map['x-tenant-id'] = tenantId
  if (sig !== undefined) hdr.map['x-tenant-sig'] = sig
}

beforeEach(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
  store.rows = [
    { id: 'tenant-A', name: 'Tenant A' },
    { id: 'tenant-B', name: 'Tenant B' },
  ]
})

afterAll(() => {
  if (ORIG_SECRET === undefined) delete process.env.TENANT_HEADER_SIG_SECRET
  else process.env.TENANT_HEADER_SIG_SECRET = ORIG_SECRET
})

describe('getTenantFromHeaders — positive control (correctly signed header resolves)', () => {
  it('returns THIS tenant’s row when x-tenant-id has a valid x-tenant-sig', async () => {
    setHeaders('tenant-A', signTenantHeader('tenant-A'))
    const t = await getTenantFromHeaders()
    expect(t).toEqual({ id: 'tenant-A', name: 'Tenant A' })
  })
})

describe('getTenantFromHeaders — fail closed on forged / missing headers', () => {
  it('null when x-tenant-id is absent', async () => {
    setHeaders(undefined, undefined)
    expect(await getTenantFromHeaders()).toBeNull()
  })

  it('null when x-tenant-sig is missing (unsigned, caller-supplied id)', async () => {
    setHeaders('tenant-A', undefined)
    expect(await getTenantFromHeaders()).toBeNull()
  })

  it('null when x-tenant-sig is empty', async () => {
    setHeaders('tenant-A', '')
    expect(await getTenantFromHeaders()).toBeNull()
  })

  it('null for a sig signed with a foreign secret (shape is right, key is wrong)', async () => {
    setHeaders('tenant-A', foreignSig('tenant-A'))
    expect(await getTenantFromHeaders()).toBeNull()
  })

  it('null for a garbage sig', async () => {
    setHeaders('tenant-A', 'deadbeef')
    expect(await getTenantFromHeaders()).toBeNull()
  })
})

describe('getTenantFromHeaders — cross-tenant sig replay', () => {
  it("null when a valid sig for tenant-A is replayed on an x-tenant-id of tenant-B", async () => {
    // A curl-er who observed tenant-A's signed pair cannot reuse the sig to be B.
    setHeaders('tenant-B', signTenantHeader('tenant-A'))
    expect(await getTenantFromHeaders()).toBeNull()

    // Control: B's own correct sig DOES resolve B, proving the reject above is the
    // id/sig binding, not a blanket failure.
    setHeaders('tenant-B', signTenantHeader('tenant-B'))
    expect(await getTenantFromHeaders()).toEqual({ id: 'tenant-B', name: 'Tenant B' })
  })
})
