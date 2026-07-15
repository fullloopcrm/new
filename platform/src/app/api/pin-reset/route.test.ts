import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PIN reset (`verify_and_set`) — brute-force guard + cross-tenant isolation.
 *
 * BUG (fixed here): the 6-digit reset code has only 900,000 possible values
 * and stays valid for 10 minutes, but `verify_and_set` had NO rate limit —
 * unlike `send_code`, which is capped at 5/15min. An attacker who knew (or
 * guessed) a member's on-file phone/email could hammer `verify_and_set` with
 * unlimited code guesses inside the 10-minute window and take over the PIN.
 *
 * FIX: `verify_and_set` is now rate-limited the same as `send_code` (5 per
 * 15 min, fail-closed), bucketed per tenant+contact.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'
const PHONE = '+15551112222' // shared by both tenants' members on purpose,
                              // to prove the wrong-tenant probe below.
const CODE_A = '654321'
const CODE_B = '111111'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const mockHeaderStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => mockHeaderStore.get(name) ?? null }),
}))

vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (tenantId: string, sig: string | null) => sig === `sig-for-${tenantId}`,
}))

const rateLimitDb = vi.fn(async () => ({ allowed: true, remaining: 4 }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...(args as [])) }))

function req(body: unknown): Request {
  return { json: async () => body, headers: new Headers() } as unknown as Request
}

function setTenantHeader(tenantId: string) {
  mockHeaderStore.set('x-tenant-id', tenantId)
  mockHeaderStore.set('x-tenant-sig', `sig-for-${tenantId}`)
}

let h: Harness
// admin-pin.ts reads ADMIN_TOKEN_SECRET at module-load time (a top-level
// `const SECRET = process.env...`), so the env var must be set BEFORE route.ts
// (which transitively imports admin-pin.ts) is evaluated. A static top-level
// `import` runs before any of this file's own top-level statements, so we
// reset the module registry each test and import route.ts dynamically here.
let POST: typeof import('./route').POST
beforeEach(async () => {
  vi.resetModules()
  process.env.ADMIN_TOKEN_SECRET = 'test-admin-secret'
  ;({ POST } = await import('./route'))

  mockHeaderStore.clear()
  rateLimitDb.mockReset()
  rateLimitDb.mockResolvedValue({ allowed: true, remaining: 4 })

  const future = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  h = createTenantDbHarness({
    tenant_members: [
      { id: 'member-a', tenant_id: TENANT_A, name: 'Alice', phone: PHONE, email: null, pin_hash: 'old-hash-a' },
      { id: 'member-b', tenant_id: TENANT_B, name: 'Bob', phone: PHONE, email: null, pin_hash: 'old-hash-b' },
    ],
    member_pin_reset_codes: [
      { id: 'code-a', tenant_id: TENANT_A, member_id: 'member-a', code: CODE_A, used: false, expires_at: future, created_at: future },
      { id: 'code-b', tenant_id: TENANT_B, member_id: 'member-b', code: CODE_B, used: false, expires_at: future, created_at: future },
    ],
  })
  holder.from = h.from
})

describe('pin-reset verify_and_set — brute-force guard', () => {
  it('blocks the attempt once rate-limited, before touching stored codes or the PIN', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    setTenantHeader(TENANT_A)

    const res = await POST(
      req({ action: 'verify_and_set', contact: PHONE, code: '000000', new_pin: '1234' })
    )

    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toMatch(/too many attempts/i)
    expect(h.capture.updates).toHaveLength(0)
  })

  it('rate-limit bucket is scoped per tenant+contact', async () => {
    setTenantHeader(TENANT_A)
    await POST(req({ action: 'verify_and_set', contact: PHONE, code: CODE_A, new_pin: '4321' }))

    expect(rateLimitDb).toHaveBeenCalledWith(
      `pin_reset_verify:${TENANT_A}:${PHONE}`,
      5,
      15 * 60 * 1000,
      { failClosed: true },
    )
  })

  it('succeeds and consumes the code when allowed and the code is correct (positive control)', async () => {
    setTenantHeader(TENANT_A)
    const res = await POST(
      req({ action: 'verify_and_set', contact: PHONE, code: CODE_A, new_pin: '4321' })
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    const memberA = h.seed.tenant_members.find((r) => r.id === 'member-a')
    expect(memberA?.pin_hash).not.toBe('old-hash-a')
    const codeA = h.seed.member_pin_reset_codes.find((r) => r.id === 'code-a')
    expect(codeA?.used).toBe(true)
  })
})

describe('pin-reset verify_and_set — wrong-tenant probe', () => {
  it('refuses tenant B\'s valid code when the (signed) request context is tenant A, despite a shared phone number', async () => {
    setTenantHeader(TENANT_A)

    const res = await POST(
      req({ action: 'verify_and_set', contact: PHONE, code: CODE_B, new_pin: '9999' })
    )

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/code expired or incorrect/i)

    // Neither member's PIN changed and tenant B's code stays unused.
    expect(h.capture.updates).toHaveLength(0)
    const codeB = h.seed.member_pin_reset_codes.find((r) => r.id === 'code-b')
    expect(codeB?.used).toBe(false)
  })

  it('accepts tenant A\'s own code under the tenant A context (positive control)', async () => {
    setTenantHeader(TENANT_A)

    const res = await POST(
      req({ action: 'verify_and_set', contact: PHONE, code: CODE_A, new_pin: '9999' })
    )

    expect(res.status).toBe(200)
    const memberB = h.seed.tenant_members.find((r) => r.id === 'member-b')
    expect(memberB?.pin_hash).toBe('old-hash-b') // tenant B untouched
  })
})
