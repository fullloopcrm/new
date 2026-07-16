import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Portal auth `send_code` — cross-tenant rate-limit-bucket DoS.
 *
 * BUG (fixed here): the `send_code` rate-limit bucket was keyed
 * `portal_auth:${phone}` — phone alone, no tenant. Since a phone number can
 * belong to clients of multiple tenants (or the bucket is consumed before the
 * tenant_slug is even validated — the rate-limit check ran BEFORE the tenant
 * lookup), an attacker sending 5 `send_code` requests for a victim's phone
 * number against ANY tenant_slug (even a garbage/nonexistent one) exhausted
 * the shared 5-per-15-min budget for that phone number across EVERY tenant on
 * the platform — a cross-tenant denial-of-service on portal self-service
 * login, the same "shared budget with no tenant boundary" class as the
 * P38/P39 cross-tenant-DoS entries already in the leak register.
 *
 * FIX: tenant is now resolved first, and the bucket key is
 * `portal_auth:${tenant.id}:${phone}` — matching every sibling rate-limited
 * auth route in this codebase (`portal_auth_verify`, `client-send-code`,
 * `pin_reset`, `team_portal_auth`).
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'
const PHONE = '+15551234567'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const rateLimitDb = vi.fn(async () => ({ allowed: true, remaining: 4 }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...(args as [])) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ sent: true })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ sent: true })) }))

import { POST } from './route'

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  rateLimitDb.mockReset()
  rateLimitDb.mockResolvedValue({ allowed: true, remaining: 4 })

  h = createTenantDbHarness({
    tenants: [
      { id: TENANT_A, slug: 'tenant-a', status: 'active', name: 'A Biz', telnyx_api_key: 'k', telnyx_phone: '+15550000000' },
      { id: TENANT_B, slug: 'tenant-b', status: 'active', name: 'B Biz', telnyx_api_key: 'k', telnyx_phone: '+15550000001' },
    ],
    clients: [
      { id: 'client-a', tenant_id: TENANT_A, name: 'Alice', phone: PHONE, email: 'alice@example.com' },
      { id: 'client-b', tenant_id: TENANT_B, name: 'Bob', phone: PHONE, email: 'bob@example.com' },
    ],
    portal_auth_codes: [],
  })
  holder.from = h.from
})

describe('portal auth send_code — rate-limit bucket is tenant-scoped, not shared across tenants', () => {
  it('WRONG-TENANT PROBE: the bucket key includes the resolved tenant id, not phone alone', async () => {
    await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'tenant-a' }))

    expect(rateLimitDb).toHaveBeenCalledWith(
      `portal_auth:${TENANT_A}:${PHONE}`,
      5,
      15 * 60 * 1000,
      { failClosed: true },
    )
  })

  it("a phone number's bucket for tenant A is independent of the same phone's bucket for tenant B", async () => {
    await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'tenant-a' }))
    await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'tenant-b' }))

    const keys = (rateLimitDb.mock.calls as unknown as unknown[][]).map((c) => c[0])
    expect(keys).toContain(`portal_auth:${TENANT_A}:${PHONE}`)
    expect(keys).toContain(`portal_auth:${TENANT_B}:${PHONE}`)
    // Two distinct keys means exhausting tenant A's budget can never also
    // block tenant B's legitimate client with the same phone number.
    expect(new Set(keys).size).toBe(2)
  })

  it('a nonexistent tenant_slug 404s WITHOUT ever consuming a rate-limit slot for any real tenant', async () => {
    const res = await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'no-such-tenant' }))

    expect(res.status).toBe(404)
    expect(rateLimitDb).not.toHaveBeenCalled()
  })

  it('CONTROL: rate-limited on its own tenant bucket still 429s normally', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })

    const res = await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'tenant-a' }))

    expect(res.status).toBe(429)
    expect(rateLimitDb).toHaveBeenCalledWith(
      `portal_auth:${TENANT_A}:${PHONE}`,
      5,
      15 * 60 * 1000,
      { failClosed: true },
    )
  })
})
