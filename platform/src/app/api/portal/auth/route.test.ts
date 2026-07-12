import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Portal auth — cross-tenant verification regression test.
 *
 * BUG (fixed here): `verify_code` looked up the stored phone/code row by phone
 * alone and never scoped to the tenant the user was logging into. A code row
 * belonging to tenant B could therefore satisfy a login for tenant A on a
 * phone+code collision — cross-tenant authentication.
 *
 * FIX: verify_code now requires `tenant_slug`, resolves the tenant, and filters
 * the code lookup (and the mark-used update) by `tenant_id`.
 *
 * We mock the Supabase client with a small chainable query builder. `.single()`
 * results are decided by a per-test resolver keyed on (table, eq-filters). We
 * record the eq-filters used on `portal_auth_codes` to prove tenant scoping.
 */

type Eqs = Record<string, unknown>

// The single stored code row lives in tenant B.
const STORED_TENANT_ID = 'tid-b'
const STORED_PHONE = '+15551234567'
const STORED_CODE = '123456'

const SLUG_TO_ID: Record<string, string> = {
  'tenant-a': 'tid-a',
  'tenant-b': 'tid-b',
}

// eq-filters captured for every portal_auth_codes SELECT that reached .single()
let codeLookupEqs: Eqs[]

function resolveSingle(table: string, eqs: Eqs): { data: unknown; error: unknown } {
  if (table === 'tenants') {
    if ('slug' in eqs) {
      const id = SLUG_TO_ID[String(eqs.slug)]
      return id ? { data: { id }, error: null } : { data: null, error: { code: 'PGRST116' } }
    }
    // lookup by id (post-verify tenant info)
    return { data: { id: eqs.id, name: 'B Biz', primary_color: null, logo_url: null }, error: null }
  }

  if (table === 'portal_auth_codes') {
    codeLookupEqs.push({ ...eqs })
    // The stored row is only returned when the query is scoped to its tenant.
    if (eqs.tenant_id === STORED_TENANT_ID && eqs.phone === STORED_PHONE) {
      return {
        data: {
          code: STORED_CODE,
          tenant_id: STORED_TENANT_ID,
          client_id: 'client-1',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
        error: null,
      }
    }
    return { data: null, error: { code: 'PGRST116' } }
  }

  if (table === 'clients') {
    return { data: { id: eqs.id, name: 'Pat' }, error: null }
  }

  return { data: null, error: { code: 'PGRST116' } }
}

function builder(table: string) {
  const eqs: Eqs = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    update: () => chain,
    delete: () => chain,
    insert: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    gt: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => resolveSingle(table, eqs),
    maybeSingle: async () => resolveSingle(table, eqs),
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))

// rate limiter is irrelevant to verify_code; keep it permissive.
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 5 }),
}))

import { POST } from './route'

// The route calls request.json() and request.headers.get() (the verify_code
// per-IP throttle reads x-forwarded-for). A minimal stub avoids env-specific
// Request/Response construction differences; the header getter returns null so
// the IP falls back to 'unknown'.
function req(body: unknown): Request {
  return {
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}

beforeEach(() => {
  codeLookupEqs = []
  process.env.PORTAL_SECRET = 'test-portal-secret'
})

describe('portal auth verify_code — tenant scoping', () => {
  it('refuses a wrong-tenant phone+code: code stored in tenant B cannot log into tenant A', async () => {
    const res = await POST(
      req({ action: 'verify_code', phone: STORED_PHONE, code: STORED_CODE, tenant_slug: 'tenant-a' })
    )

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.token).toBeUndefined()
    expect(data.error).toBe('Code expired or not found')

    // The code lookup must have been scoped to the resolved (wrong) tenant id,
    // not left unscoped by phone alone.
    expect(codeLookupEqs).toHaveLength(1)
    expect(codeLookupEqs[0].tenant_id).toBe('tid-a')
    expect(codeLookupEqs[0].phone).toBe(STORED_PHONE)
  })

  it('accepts the correct tenant (positive control): tenant B code logs into tenant B', async () => {
    const res = await POST(
      req({ action: 'verify_code', phone: STORED_PHONE, code: STORED_CODE, tenant_slug: 'tenant-b' })
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data.token).toBe('string')
    expect(data.token.length).toBeGreaterThan(0)
    expect(codeLookupEqs[0].tenant_id).toBe('tid-b')
  })

  it('rejects verify_code without a tenant_slug', async () => {
    const res = await POST(req({ action: 'verify_code', phone: STORED_PHONE, code: STORED_CODE }))

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Phone, code, and tenant required')
    // No code lookup should run when the request is malformed.
    expect(codeLookupEqs).toHaveLength(0)
  })
})
