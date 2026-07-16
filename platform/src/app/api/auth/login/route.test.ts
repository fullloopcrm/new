/**
 * /api/auth/login — legacy nycmaid admin login (live, public per middleware).
 *
 * Covers 3 real gaps found+fixed on this branch:
 *  1. In-memory rate limiting reset per serverless instance and gave no real
 *     brute-force protection — now backed by rateLimitDb (fail-closed).
 *  2. The PIN fallback (`password === adminPassword`) matched an EMPTY
 *     submitted password whenever ADMIN_PASSWORD was unset ('' === ''), a
 *     zero-config admin-session bypass. Also non-constant-time.
 *  3. The "Admin Login Alert" email built its HTML by interpolating
 *     x-forwarded-for / user-agent (both attacker-controlled request
 *     headers) with zero escaping — stored XSS against the owner reading
 *     the alert in an HTML mail client.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/nycmaid/auth', () => ({
  createSessionCookie: vi.fn((userId?: string) => `session:${userId ?? 'legacy'}`),
  hashPassword: vi.fn((pw: string) => `hash:${pw}`),
}))

const { notifySpy, emailAdminsSpy, rlCounts } = vi.hoisted(() => ({
  notifySpy: vi.fn(async () => {}),
  emailAdminsSpy: vi.fn(async (_subject: string, _html: string, _roles?: string[]) => {}),
  rlCounts: new Map<string, number>(),
}))
const RL_MAX = 5

vi.mock('@/lib/nycmaid/notify', () => ({ notify: notifySpy }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ emailAdmins: emailAdminsSpy }))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async (bucketKey: string) => {
    const count = (rlCounts.get(bucketKey) ?? 0) + 1
    rlCounts.set(bucketKey, count)
    return count <= RL_MAX
      ? { allowed: true, remaining: RL_MAX - count }
      : { allowed: false, remaining: 0 }
  }),
}))

const cookieStore = new Map<string, string>()
const cookieOptions = new Map<string, Record<string, unknown> | undefined>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      cookieStore.set(name, value)
      cookieOptions.set(name, options)
    },
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://x/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  rlCounts.clear()
  cookieStore.clear()
  cookieOptions.clear()
  notifySpy.mockClear()
  emailAdminsSpy.mockClear()
  delete process.env.ADMIN_PASSWORD
})

describe('POST /api/auth/login — empty-password bypass', () => {
  it('rejects an empty submitted password when ADMIN_PASSWORD is unset (was a zero-config bypass)', async () => {
    delete process.env.ADMIN_PASSWORD
    const res = await POST(req({ password: '' }))
    expect(res.status).toBe(401)
    expect(cookieStore.has('admin_session')).toBe(false)
  })

  it('rejects an empty password even when ADMIN_PASSWORD is set but blank/whitespace', async () => {
    process.env.ADMIN_PASSWORD = '   '
    const res = await POST(req({ password: '' }))
    expect(res.status).toBe(401)
    expect(cookieStore.has('admin_session')).toBe(false)
  })

  it('grants the owner session when the PIN matches a real configured ADMIN_PASSWORD', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const res = await POST(req({ password: 'correct-horse-battery-staple' }))
    expect(res.status).toBe(200)
    expect(cookieStore.get('admin_role')).toBe('owner')
  })

  it('rejects a wrong PIN when ADMIN_PASSWORD is configured', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const res = await POST(req({ password: 'wrong' }))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/login — durable rate limiting', () => {
  it('locks out after 5 attempts from the same IP within the window (rateLimitDb-backed)', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const headers = { 'x-forwarded-for': '203.0.113.9' }
    for (let i = 0; i < 5; i++) {
      const res = await POST(req({ password: 'wrong' }, headers))
      expect(res.status).toBe(401)
    }
    // 6th attempt, even with the CORRECT password, is locked out.
    const locked = await POST(req({ password: 'correct-horse-battery-staple' }, headers))
    expect(locked.status).toBe(429)
    expect(cookieStore.has('admin_session')).toBe(false)
  })

  it('does not lock out a different IP', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    for (let i = 0; i < 5; i++) {
      await POST(req({ password: 'wrong' }, { 'x-forwarded-for': '203.0.113.1' }))
    }
    const res = await POST(req({ password: 'correct-horse-battery-staple' }, { 'x-forwarded-for': '203.0.113.2' }))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/auth/login — stored XSS in login-alert email', () => {
  it('escapes attacker-controlled x-forwarded-for and user-agent before building the alert HTML', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const payload = '<img src=x onerror=alert(1)>'
    const res = await POST(req(
      { password: 'correct-horse-battery-staple' },
      { 'x-forwarded-for': payload, 'user-agent': payload },
    ))
    expect(res.status).toBe(200)
    expect(emailAdminsSpy).toHaveBeenCalledTimes(1)
    const html = emailAdminsSpy.mock.calls[0][1]
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

})

describe('POST /api/auth/login — admin_role cookie', () => {
  it('sets admin_role httpOnly so it cannot be read or forged via document.cookie/XSS', async () => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    const res = await POST(req({ password: 'correct-horse-battery-staple' }))
    expect(res.status).toBe(200)
    expect(cookieOptions.get('admin_role')?.httpOnly).toBe(true)
  })
})
