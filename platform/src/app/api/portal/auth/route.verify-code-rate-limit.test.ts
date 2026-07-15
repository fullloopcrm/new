import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Portal auth `verify_code` — brute-force guard.
 *
 * BUG (fixed here): the 6-digit login code has only 900,000 possible values
 * and stays valid for 10 minutes, but `verify_code` had NO rate limit —
 * unlike `send_code`, which is capped at 5/15min. An attacker who knew a
 * client's phone number could hammer `verify_code` with unlimited guesses
 * inside the 10-minute window and log in as that client.
 *
 * FIX: `verify_code` is now rate-limited the same as `send_code` (5 per
 * 15 min, fail-closed), bucketed per phone (`portal_verify:<phone>`) — plus a
 * looser secondary per-IP cap (30/15min, `portal_verify_ip:<ip>`) so one host
 * can't spray guesses across many phones.
 */

const TENANT_A = 'tid-a'
const PHONE = '+15551234567'
const CODE = '654321'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const rateLimitDb = vi.fn(async () => ({ allowed: true, remaining: 4 }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...(args as [])) }))

process.env.PORTAL_SECRET = 'test-portal-secret'

import { POST } from './route'

function req(body: unknown): Request {
  return { json: async () => body, headers: new Headers() } as unknown as Request
}

let h: Harness
beforeEach(() => {
  rateLimitDb.mockReset()
  rateLimitDb.mockResolvedValue({ allowed: true, remaining: 4 })

  const future = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  h = createTenantDbHarness({
    tenants: [{ id: TENANT_A, slug: 'tenant-a', status: 'active', name: 'A Biz' }],
    clients: [{ id: 'client-a', tenant_id: TENANT_A, name: 'Alice' }],
    portal_auth_codes: [
      { id: 'code-a', tenant_id: TENANT_A, client_id: 'client-a', phone: PHONE, code: CODE, used: false, expires_at: future, created_at: future },
    ],
  })
  holder.from = h.from
})

describe('portal auth verify_code — brute-force guard', () => {
  it('blocks the attempt once rate-limited, before touching the stored code', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })

    const res = await POST(req({ action: 'verify_code', phone: PHONE, code: '000000', tenant_slug: 'tenant-a' }))

    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toMatch(/too many attempts/i)
    expect(h.capture.updates).toHaveLength(0)
  })

  it('rate-limit bucket is scoped per phone, plus a secondary per-IP cap', async () => {
    await POST(req({ action: 'verify_code', phone: PHONE, code: CODE, tenant_slug: 'tenant-a' }))

    expect(rateLimitDb).toHaveBeenCalledWith(
      `portal_verify:${PHONE}`,
      5,
      15 * 60 * 1000,
      { failClosed: true },
    )
    expect(rateLimitDb).toHaveBeenCalledWith(
      'portal_verify_ip:unknown',
      30,
      15 * 60 * 1000,
      { failClosed: true },
    )
  })

  it('succeeds and consumes the code when allowed and the code is correct (positive control)', async () => {
    const res = await POST(req({ action: 'verify_code', phone: PHONE, code: CODE, tenant_slug: 'tenant-a' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data.token).toBe('string')

    const stored = h.seed.portal_auth_codes.find((r) => r.id === 'code-a')
    expect(stored?.used).toBe(true)
  })
})
