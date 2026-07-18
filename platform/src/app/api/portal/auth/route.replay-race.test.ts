/**
 * PORTAL-AUTH VERIFY_CODE — no CAS on consuming the single-use login code.
 *
 * The SELECT that fetches the stored code only proves it was unused at READ
 * time. The old "mark as used" UPDATE re-asserted phone+code+tenant_id but
 * NOT used=false, so it matched and succeeded regardless of whether another
 * concurrent verify_code call for the same code had already consumed it —
 * two concurrent requests for one single-use login code could both pass the
 * SELECT before either UPDATE landed, and both would go on to mint a token,
 * same class as the pin-reset CAS gap fixed alongside this.
 *
 * FIX: the "mark used" UPDATE now re-asserts used=false in its own WHERE and
 * checks whether a row actually flipped. The loser gets a clean 401 instead
 * of a second silently-issued session token.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Row } from '@/test/fake-supabase'

const PHONE = '+15551234567'
const TENANT_ID = 'tenant-1'
const TENANT_SLUG = 'test-tenant'
const CLIENT_ID = 'client-1'
const REAL_CODE = '111111'

/** Fires exactly once, right after the route's initial SELECT of
 *  portal_auth_codes resolves — the exact TOCTOU gap the CAS fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const real = createFakeSupabase()
  const wrapped = {
    ...real,
    from(table: string) {
      const builder = real.from(table) as unknown as Record<string, unknown>
      if (table !== 'portal_auth_codes') return builder
      const origSelect = (builder.select as (...args: unknown[]) => Record<string, unknown>).bind(builder)
      builder.select = (...args: unknown[]) => {
        const qb = origSelect(...args)
        const origSingle = (qb.single as () => Promise<unknown>).bind(qb)
        qb.single = async () => {
          const res = await origSingle()
          if (afterInitialRead.fn) {
            const fn = afterInitialRead.fn
            afterInitialRead.fn = null
            fn()
          }
          return res
        }
        return qb
      }
      return builder
    },
  }
  return { supabase: wrapped, supabaseAdmin: wrapped, __fake: real }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as import('@/test/fake-supabase').FakeSupabase

function seed(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('portal_auth_codes', [
    {
      phone: PHONE,
      code: REAL_CODE,
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      used: false,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      ...overrides,
    },
  ])
  fake._seed('clients', [{ id: CLIENT_ID, name: 'Test Client' }])
  fake._seed('tenants', [
    { id: TENANT_ID, slug: TENANT_SLUG, status: 'active', name: 'Test Tenant', primary_color: null, logo_url: null },
  ])
}

function verifyReq() {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'verify_code', phone: PHONE, code: REAL_CODE, tenant_slug: TENANT_SLUG }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'portal-test-secret'
  afterInitialRead.fn = null
  seed()
})

describe('POST /api/portal/auth verify_code — single-use code TOCTOU race', () => {
  it('rejects the CAS-consume when a concurrent request flips used=true between the read and the write', async () => {
    // Simulates a second concurrent verify_code call winning the race in the
    // gap between this request's SELECT (still sees used=false) and its own
    // CAS UPDATE.
    afterInitialRead.fn = () => {
      const codes = fake._all('portal_auth_codes')
      codes[0].used = true
    }

    const res = await POST(verifyReq())
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toMatch(/already used/i)
    expect(body.token).toBeUndefined()
  })

  it('a genuinely fresh code still succeeds and mints a token (no regression)', async () => {
    const res = await POST(verifyReq())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.token).toBeTruthy()

    const code = fake._all('portal_auth_codes')[0]
    expect(code.used).toBe(true)
  })
})
