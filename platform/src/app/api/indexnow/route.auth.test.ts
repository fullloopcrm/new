/**
 * CRON_SECRET timing-safe compare — /api/indexnow POST (cron-style auth mode).
 *
 * POST accepted the cron Bearer token via a plain `===` string compare
 * instead of the codebase's established safeEqual() helper — same timing
 * side-channel class already closed on ~30 other cron routes via
 * verifyCronSecret()/safeEqual(). global fetch is mocked so a real IndexNow
 * submission is never attempted.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => null),
}))

const getTenantForRequestMock = vi.fn()
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: () => getTenantForRequestMock(),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'

const fake = supabaseAdmin as unknown as FakeSupabase
const ORIGINAL_ENV = { ...process.env }
const TENANT_ID = 'tenant-A'

function postReq(body: unknown, authHeader?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (authHeader !== undefined) headers['authorization'] = authHeader
  return new NextRequest('https://example.com/api/indexnow', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/indexnow — CRON_SECRET Bearer gate', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    fake._store.clear()
    fake._store.set('tenants', [
      { id: TENANT_ID, domain: 'tenant.example.com', selena_config: { indexnow_key: 'tenant-key' } },
    ])
    getTenantForRequestMock.mockReset()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })))
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
  })

  it('accepts the correct CRON_SECRET Bearer without falling back to session auth', async () => {
    process.env.CRON_SECRET = 'real-cron-secret'
    const { POST } = await import('./route')

    const res = await POST(postReq({ tenantId: TENANT_ID, urls: ['https://tenant.example.com/a'] }, 'Bearer real-cron-secret'))

    expect(res.status).toBe(200)
    expect(getTenantForRequestMock).not.toHaveBeenCalled()
  })

  it('rejects a wrong Bearer and falls through to session auth (which fails here)', async () => {
    process.env.CRON_SECRET = 'real-cron-secret'
    const { AuthError } = await import('@/lib/tenant-query')
    getTenantForRequestMock.mockRejectedValue(new AuthError('Unauthorized', 401))
    const { POST } = await import('./route')

    const res = await POST(postReq({ tenantId: TENANT_ID, urls: ['https://tenant.example.com/a'] }, 'Bearer guessed-secret'))

    expect(res.status).toBe(401)
  })

  it('WITNESS: the Bearer compare uses safeEqual, not a raw === on the secret', () => {
    const src = readFileSync(join(__dirname, 'route.ts'), 'utf8')
    expect(src).toMatch(/safeEqual\(authHeader, `Bearer \$\{cronSecret\}`\)/)
    expect(src).not.toMatch(/authHeader === `Bearer \$\{process\.env\.CRON_SECRET\}`/)
  })
})
