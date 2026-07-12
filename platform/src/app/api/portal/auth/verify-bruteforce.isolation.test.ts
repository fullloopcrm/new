import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

/**
 * W4 independent isolation regression for portal/auth verify_code (fix 90af6b9).
 *
 * The sibling file verify-bruteforce.test.ts pins the source IP (8.8.8.8) and
 * proves 5×401→429 for one phone plus that both buckets are failClosed. This
 * file proves the COMPLEMENTARY properties from the verification lane — the ones
 * that actually determine whether the throttle defeats a real attacker and
 * doesn't harm a real user:
 *
 *   1. The per-phone lockout is IP-INDEPENDENT. An attacker rotating source IPs
 *      (the realistic distributed brute-force) still gets locked out after 5
 *      wrong guesses against ONE phone's code. If the fix were reverted, or the
 *      lockout were keyed only on IP, rotating IPs would grant unlimited guesses.
 *   2. The looser per-IP bucket independently caps one host spraying wrong codes
 *      across MANY phones (30/window) — even when no single phone bucket trips.
 *   3. A CORRECT code within budget still authenticates (200 + token). The
 *      throttle runs before the code lookup but must not lock out legitimate
 *      verification.
 */

// Rate-limit mock: real per-key cap, records keys + opts. Mirrors the buckets
// the route consults so IP-rotation vs per-phone behaviour is exercised for real.
const rlKeys: string[] = []
const rlCounts = new Map<string, number>()

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, max: number) => {
    rlKeys.push(bucketKey)
    const n = rlCounts.get(bucketKey) ?? 0
    if (n >= max) return { allowed: false, remaining: 0 }
    rlCounts.set(bucketKey, n + 1)
    return { allowed: true, remaining: max - n - 1 }
  },
}))

const STORED_CODE = '135790'

vi.mock('@/lib/supabase', () => {
  function chain(table: string): Record<string, unknown> {
    const c: Record<string, unknown> = {
      select: () => c,
      eq: () => c,
      gt: () => c,
      order: () => c,
      limit: () => c,
      update: () => c,
      delete: () => c,
      // Awaiting a terminal (update().eq().eq(), delete().eq()...) resolves.
      then: (resolve: (v: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
      single: async () => {
        if (table === 'portal_auth_codes') {
          return {
            data: {
              code: STORED_CODE,
              tenant_id: 'tenant-1',
              client_id: 'client-1',
              expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            },
            error: null,
          }
        }
        if (table === 'clients') return { data: { id: 'client-1', name: 'Real Client' }, error: null }
        if (table === 'tenants') return { data: { id: 'tenant-1', name: 'Real Tenant' }, error: null }
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        if (table === 'portal_auth_codes') {
          return {
            data: {
              code: STORED_CODE,
              tenant_id: 'tenant-1',
              client_id: 'client-1',
              expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            },
            error: null,
          }
        }
        if (table === 'clients') return { data: { id: 'client-1', name: 'Real Client' }, error: null }
        if (table === 'tenants') return { data: { id: 'tenant-1', name: 'Real Tenant' }, error: null }
        return { data: null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { POST } from './route'

function guess(opts: { phone: string; code: string; ip: string }) {
  return new Request('https://x/api/portal/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': opts.ip },
    body: JSON.stringify({ action: 'verify_code', phone: opts.phone, code: opts.code }),
  })
}

beforeAll(() => {
  process.env.PORTAL_SECRET = 'w4-isolation-portal-secret'
})

beforeEach(() => {
  rlKeys.length = 0
  rlCounts.clear()
})

describe('portal/auth verify_code — brute-force lockout is IP-independent', () => {
  it('locks out one phone after 5 wrong guesses even when every guess comes from a DIFFERENT IP', async () => {
    const PHONE = '+15551239999'
    const statuses: number[] = []
    // Six wrong guesses at ONE phone's code, each from a fresh source IP —
    // the distributed brute-force the per-phone bucket exists to defeat.
    for (let i = 0; i < 6; i++) {
      const res = await POST(guess({ phone: PHONE, code: '000000', ip: `10.0.0.${i + 1}` }))
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true)
    expect(statuses[5]).toBe(429)
    // The lockout came from the phone bucket, which was consulted every time and
    // is keyed on phone alone (no IP) — so rotating IPs could not reset it.
    expect(rlKeys.filter((k) => k === `portal_verify:${PHONE}`)).toHaveLength(6)
  })

  it('caps one host spraying wrong codes across many phones via the per-IP bucket (no single phone bucket trips)', async () => {
    const IP = '203.0.113.7'
    const statuses: number[] = []
    // 31 DISTINCT phones from one IP: each phone bucket sees a single attempt
    // (never reaches its cap of 5), so only the per-IP bucket (30/window) can
    // stop the spray. The 31st is throttled.
    for (let i = 0; i < 31; i++) {
      const res = await POST(guess({ phone: `+1555000${String(i).padStart(4, '0')}`, code: '000000', ip: IP }))
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 30).every((s) => s === 401)).toBe(true)
    expect(statuses[30]).toBe(429)
    expect(rlKeys).toContain(`portal_verify_ip:${IP}`)
  })

  it('a CORRECT code within budget still authenticates (throttle does not block legitimate verify)', async () => {
    const res = await POST(guess({ phone: '+15550001111', code: STORED_CODE, ip: '198.51.100.5' }))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { token?: string }
    expect(typeof json.token).toBe('string')
    expect(json.token!.length).toBeGreaterThan(0)
  })
})
