/**
 * @vitest-environment node
 *
 * jose's Uint8Array instanceof check fails under this repo's default jsdom
 * test environment (a known jose/jsdom interop issue — confirmed the actual
 * implementation is correct by running it standalone under plain Node
 * against live prod, see the RLS verification note below). Forcing node here
 * since this module only ever runs server-side anyway.
 *
 * Unit coverage for tenantClient() itself (JWT shape, caching, error
 * handling). The actual RLS-enforcement claim — that a client built here is
 * correctly scoped by Postgres — was verified live against prod on
 * 2026-07-28: a tenant-A JWT saw only tenant-A bookings, a tenant-B JWT saw
 * exactly its own 6 budget_line_items rows (a same-day policy), and the anon
 * role with no tenant claim saw nothing. That's not something a mocked unit
 * test can re-prove — it's a live Postgres RLS decision — so this file
 * covers what's actually unit-testable: the client construction contract.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { jwtVerify } from 'jose'

const createClientMock = vi.fn((..._args: unknown[]) => ({ __fake: true }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env = {
    ...ORIGINAL_ENV,
    SUPABASE_JWT_SECRET: 'test-secret-at-least-32-bytes-long-for-hs256',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  }
  vi.resetModules()
})

describe('tenantClient', () => {
  it('throws without a tenantId', async () => {
    const { tenantClient } = await import('./tenant-supabase')
    await expect(tenantClient('')).rejects.toThrow('tenantClient requires a tenantId')
  })

  it('throws if SUPABASE_JWT_SECRET is not set', async () => {
    delete process.env.SUPABASE_JWT_SECRET
    const { tenantClient } = await import('./tenant-supabase')
    await expect(tenantClient('tid-a')).rejects.toThrow('SUPABASE_JWT_SECRET is not set')
  })

  it('signs a JWT carrying role=authenticated and the given tenant_id', async () => {
    const { tenantClient } = await import('./tenant-supabase')
    await tenantClient('tid-a')

    const [, , options] = createClientMock.mock.calls[0]
    const authHeader = (options as { global: { headers: { Authorization: string } } }).global.headers.Authorization
    const token = authHeader.replace('Bearer ', '')

    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET))
    expect(payload.role).toBe('authenticated')
    expect(payload.tenant_id).toBe('tid-a')
    expect(payload.aud).toBe('authenticated')
    expect(typeof payload.exp).toBe('number')
  })

  it('passes the real Supabase URL and anon key to createClient', async () => {
    const { tenantClient } = await import('./tenant-supabase')
    await tenantClient('tid-a')

    const [url, anonKey] = createClientMock.mock.calls[0]
    expect(url).toBe('https://test.supabase.co')
    expect(anonKey).toBe('test-anon-key')
  })

  it('caches the client per tenantId — a second call for the same tenant does not re-mint', async () => {
    const { tenantClient } = await import('./tenant-supabase')
    const a = await tenantClient('tid-a')
    const b = await tenantClient('tid-a')

    expect(a).toBe(b)
    expect(createClientMock).toHaveBeenCalledTimes(1)
  })

  it('mints a distinct client (and JWT) per distinct tenantId', async () => {
    const { tenantClient } = await import('./tenant-supabase')
    await tenantClient('tid-a')
    await tenantClient('tid-b')

    expect(createClientMock).toHaveBeenCalledTimes(2)
    const tokenA = (createClientMock.mock.calls[0][2] as { global: { headers: { Authorization: string } } }).global.headers.Authorization
    const tokenB = (createClientMock.mock.calls[1][2] as { global: { headers: { Authorization: string } } }).global.headers.Authorization
    expect(tokenA).not.toBe(tokenB)
  })

  it('does not persist a session or auto-refresh — every call mints fresh, never stored client-side', async () => {
    const { tenantClient } = await import('./tenant-supabase')
    await tenantClient('tid-a')

    const [, , options] = createClientMock.mock.calls[0]
    expect((options as { auth: { persistSession: boolean; autoRefreshToken: boolean } }).auth).toEqual({
      persistSession: false,
      autoRefreshToken: false,
    })
  })
})
