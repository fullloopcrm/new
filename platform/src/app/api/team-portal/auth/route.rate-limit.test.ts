/**
 * team-portal/auth (cleaner PIN login) rate-limited on
 * `team_portal_auth:${tenant_slug}:${pin}` -- keyed by the GUESSED PIN itself,
 * not by requester identity. Since PINs are short (often 4-digit, see
 * schema.sql comment), an attacker could try a different pin on every request
 * and never hit the same bucket key twice, burning through the whole PIN
 * space with zero throttling. Every sibling PIN-login route (/api/client/login)
 * keys on tenant+IP instead. Fixed to match that pattern.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-a'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(pin: string, ip = '9.9.9.9'): Request {
  return new Request('http://x/api/team-portal/auth', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify({ tenant_slug: 'biz-a', pin }),
  })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT_ID, name: 'A Co', slug: 'biz-a', status: 'active', phone: '+15550001' }])
  fake._seed('team_members', [
    { id: 'tm-a', tenant_id: TENANT_ID, name: 'Worker A', pin: '4242', status: 'active', preferred_language: 'en', pay_rate: 20, photo_url: null, role: 'worker' },
  ])
  rateLimitDb.mockReset()
  rateLimitDb.mockResolvedValue({ allowed: true })
})

describe('team-portal/auth — rate limit bucket key', () => {
  it('keys the bucket on tenant+IP, not on the guessed PIN (enumeration guard)', async () => {
    await POST(req('0000'))
    await POST(req('1111'))
    expect(rateLimitDb).toHaveBeenCalledTimes(2)
    const [key1] = rateLimitDb.mock.calls[0]
    const [key2] = rateLimitDb.mock.calls[1]
    // Both guesses from the same IP against the same tenant must share ONE
    // bucket -- if the key varied with the pin, this would fail (proving the
    // old behavior let every distinct PIN guess dodge the throttle).
    expect(key1).toBe(key2)
    expect(key1).toContain('biz-a')
    expect(key1).toContain('9.9.9.9')
    expect(key1).not.toContain('0000')
    expect(key1).not.toContain('1111')
  })

  it('still logs the real member in once their correct PIN is guessed', async () => {
    const res = await POST(req('4242'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.id).toBe('tm-a')
  })

  it('rejects with 429 once the shared tenant+IP bucket is exhausted, regardless of which PIN is tried', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false })
    const res = await POST(req('9999'))
    expect(res.status).toBe(429)
  })
})
