/**
 * PIN-RESET VERIFY_AND_SET — no CAS on consuming the single-use reset code.
 *
 * The SELECT that fetches the stored code only proves it was unused at READ
 * time. The old code then wrote tenant_members.pin_hash unconditionally (no
 * CAS at all) and only marked the code used AFTER, in a separate write that
 * also had no used=false re-check. Two concurrent verify_and_set calls for
 * the same still-valid code (e.g. an attacker racing a leaked/observed code
 * against the legitimate owner's own request, each submitting a different
 * new_pin) both passed the SELECT before either write landed — the later
 * write silently decided the final PIN, and the "mark used" step happily
 * flipped an already-consumed code a second time.
 *
 * FIX: consume the code via a CAS UPDATE (used=false in the WHERE) BEFORE
 * ever touching tenant_members. Only the request that actually flips the row
 * proceeds to set a PIN; the loser is rejected with a clean 400 and never
 * reaches the tenant_members write.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Row } from '@/test/fake-supabase'

const TENANT_ID = 'tenant-1'
const MEMBER_ID = 'member-1'
const CONTACT = 'member@example.com'
const REAL_CODE = '111111'
const CODE_ID = 'code-1'

/** Fires exactly once, right after the route's initial SELECT of
 *  member_pin_reset_codes resolves — the exact TOCTOU gap the CAS fix
 *  closes. Left null between tests / after it fires once. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const real = createFakeSupabase()
  const wrapped = {
    ...real,
    from(table: string) {
      const builder = real.from(table) as unknown as Record<string, unknown>
      if (table !== 'member_pin_reset_codes') return builder
      const origSelect = (builder.select as (...args: unknown[]) => Record<string, unknown>).bind(builder)
      builder.select = (...args: unknown[]) => {
        const qb = origSelect(...args)
        const origMaybeSingle = (qb.maybeSingle as () => Promise<unknown>).bind(qb)
        qb.maybeSingle = async () => {
          const res = await origMaybeSingle()
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

vi.mock('next/headers', () => ({
  headers: async () => new Map([
    ['x-tenant-id', TENANT_ID],
    ['x-tenant-sig', 'sig'],
  ]),
}))

vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: () => true,
}))

vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hash:${pin}`,
  isValidAdminPin: (pin: string) => /^\d{4,8}$/.test(pin),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as import('@/test/fake-supabase').FakeSupabase

function seed(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('tenant_members', [
    { id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Test Member', phone: null, email: CONTACT, pin_hash: null },
  ])
  fake._seed('member_pin_reset_codes', [
    {
      id: CODE_ID,
      tenant_id: TENANT_ID,
      member_id: MEMBER_ID,
      code: REAL_CODE,
      used: false,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      ...overrides,
    },
  ])
}

function verifyReq(newPin: string) {
  return new Request('http://x/api/pin-reset', {
    method: 'POST',
    headers: { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 200) + 1}` },
    body: JSON.stringify({ action: 'verify_and_set', contact: CONTACT, code: REAL_CODE, new_pin: newPin }),
  })
}

beforeEach(() => {
  afterInitialRead.fn = null
  seed()
})

describe('POST /api/pin-reset verify_and_set — single-use code TOCTOU race', () => {
  it('rejects the CAS-consume when a concurrent request flips used=true between the read and the write', async () => {
    // Simulates a second request winning the race in the gap between this
    // request's SELECT (which still sees used=false) and its own CAS UPDATE.
    afterInitialRead.fn = () => {
      const codes = fake._all('member_pin_reset_codes')
      codes[0].used = true
    }

    const res = await POST(verifyReq('9999'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/already used/i)

    // Must never have touched the PIN — the loser is rejected before it
    // reaches tenant_members at all.
    const member = fake._all('tenant_members').find((m) => m.id === MEMBER_ID)
    expect(member?.pin_hash).toBeNull()
  })

  it('a genuinely fresh code still succeeds and sets the PIN (no regression)', async () => {
    const res = await POST(verifyReq('4321'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    const member = fake._all('tenant_members').find((m) => m.id === MEMBER_ID)
    expect(member?.pin_hash).toBe('hash:4321')

    const code = fake._all('member_pin_reset_codes').find((c) => c.id === CODE_ID)
    expect(code?.used).toBe(true)
  })

  it('a code already used at read time is still rejected by the pre-existing SELECT filter (sanity, not the CAS path)', async () => {
    seed({ used: true })
    const res = await POST(verifyReq('9999'))
    expect(res.status).toBe(400)
  })
})
