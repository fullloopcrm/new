/**
 * POST /api/admin-auth — global super-admin ADMIN_PIN compare.
 *
 * The super-admin PIN check used a plain `pin === ADMIN_PIN` — a textbook
 * timing side-channel (early-exit on the first mismatched byte) on the
 * single highest-value secret in the platform: this PIN unlocks god-mode
 * access to every tenant, on any host. Every token verifier in this same
 * file (verifyAdminToken, verifyTenantAdminToken) already uses
 * crypto.timingSafeEqual for exactly this reason; the raw PIN compare was
 * the one exception. Fixed with the codebase's established safeEqual()
 * helper (src/lib/secret-compare.ts).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })),
}))

vi.mock('@/lib/login-alert', () => ({
  sendLoginAlert: vi.fn(async () => {}),
}))

vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: vi.fn(() => false),
}))

vi.mock('next/headers', () => ({
  headers: async () => new Map<string, string>(),
}))

const ORIGINAL_ENV = { ...process.env }

function req(body: unknown): Request {
  return new Request('http://x/api/admin-auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetModules()
  process.env = { ...ORIGINAL_ENV, ADMIN_PIN: 'super-secret-pin', ADMIN_TOKEN_SECRET: 'test-admin-token-secret' }
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('POST /api/admin-auth — super-admin PIN compare', () => {
  it('grants super_admin on a correct PIN', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ pin: 'super-secret-pin' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true, role: 'super_admin' })
  })

  it('rejects a wrong PIN of the same length', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ pin: 'super-secret-piX' }))
    expect(res.status).toBe(401)
  })

  it('rejects a wrong PIN of a different length', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ pin: 'x' }))
    expect(res.status).toBe(401)
  })

  it('rejects an empty PIN even when ADMIN_PIN happens to be empty (fail-closed, no vacuous match)', async () => {
    process.env.ADMIN_PIN = ''
    const { POST } = await import('./route')
    const res = await POST(req({ pin: '' }))
    expect(res.status).toBe(401)
  })

  it('WITNESS: the super-admin PIN compare uses safeEqual, not a raw ===', () => {
    const src = readFileSync(join(__dirname, 'route.ts'), 'utf8')
    expect(src).toMatch(/safeEqual\(pin, ADMIN_PIN\)/)
    expect(src).not.toMatch(/pin === ADMIN_PIN/)
  })
})
