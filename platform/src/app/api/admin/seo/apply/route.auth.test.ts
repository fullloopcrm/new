/**
 * CRON_SECRET timing-safe compare — /api/admin/seo/apply POST.
 *
 * authorize() accepted the cron Bearer token via a plain `===` string
 * compare instead of the codebase's established safeEqual() helper — the
 * textbook timing side-channel that lets an attacker recover CRON_SECRET
 * byte-by-byte from response latency, exactly the class this session's
 * verifyCronSecret()/safeEqual() hardening already closed on ~30 other cron
 * routes. This route (correctly gated in every other respect — fail-closed
 * to requireAdmin() when the Bearer doesn't match) had never been ported.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const applyOverrideMock = vi.fn()
const revertOverrideMock = vi.fn()
vi.mock('@/lib/seo/overrides', () => ({
  applyOverride: (...args: unknown[]) => applyOverrideMock(...args),
  revertOverride: (...args: unknown[]) => revertOverrideMock(...args),
}))

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: () => requireAdminMock(),
}))

const ORIGINAL_ENV = { ...process.env }

function req(body: unknown, authHeader?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (authHeader !== undefined) headers['authorization'] = authHeader
  return new Request('https://example.com/api/admin/seo/apply', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/seo/apply — CRON_SECRET Bearer gate', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    applyOverrideMock.mockReset().mockResolvedValue(undefined)
    revertOverrideMock.mockReset().mockResolvedValue(undefined)
    requireAdminMock.mockReset()
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('accepts the correct CRON_SECRET Bearer without falling back to requireAdmin', async () => {
    process.env.CRON_SECRET = 'real-cron-secret'
    requireAdminMock.mockResolvedValue(NextResponseUnauthorized())
    const { POST } = await import('./route')

    const res = await POST(req({ url: 'https://tenant.example.com/services' }, 'Bearer real-cron-secret'))

    expect(res.status).toBe(200)
    expect(requireAdminMock).not.toHaveBeenCalled()
  })

  it('rejects a wrong Bearer and falls through to (failing) requireAdmin', async () => {
    process.env.CRON_SECRET = 'real-cron-secret'
    requireAdminMock.mockResolvedValue(NextResponseUnauthorized())
    const { POST } = await import('./route')

    const res = await POST(req({ url: 'https://tenant.example.com/services' }, 'Bearer guessed-secret'))

    expect(res.status).toBe(401)
    expect(applyOverrideMock).not.toHaveBeenCalled()
  })

  it('rejects a missing Authorization header and falls through to (failing) requireAdmin', async () => {
    process.env.CRON_SECRET = 'real-cron-secret'
    requireAdminMock.mockResolvedValue(NextResponseUnauthorized())
    const { POST } = await import('./route')

    const res = await POST(req({ url: 'https://tenant.example.com/services' }))

    expect(res.status).toBe(401)
  })

  it('WITNESS: the Bearer compare uses safeEqual, not a raw === on the secret', () => {
    const src = readFileSync(join(__dirname, 'route.ts'), 'utf8')
    expect(src).toMatch(/safeEqual\(bearer, `Bearer \$\{secret\}`\)/)
    expect(src).not.toMatch(/bearer === `Bearer \$\{secret\}`/)
  })
})

function NextResponseUnauthorized() {
  const { NextResponse } = require('next/server')
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
