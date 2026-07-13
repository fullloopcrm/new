/**
 * INSTANT-REVOCATION fix — isAdminAuthenticated()/requireAdmin() (nycmaid
 * legacy admin_session flow, ~132 call sites across the NYC Maid admin API).
 *
 * LEADER finding (2026-07-13): isAdminAuthenticated() only checked the
 * session cookie's signature + 24h expiry. Disabling/removing an admin_users
 * row (getAdminUser() already does this check, but it has only 1 call site)
 * had zero effect on that admin's already-issued admin_session cookie until
 * its natural 24h expiry -- the same class already fixed correctly on
 * team-portal (requirePortalPermission re-checks status every call) and just
 * fixed on the tenant-admin_token path (tenant-query.ts). Fixed by
 * re-reading the admin_users row's current status on every call for
 * new-format (userId-bearing) sessions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

const cookieValue = vi.hoisted(() => ({ current: undefined as string | undefined }))
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'admin_session' && cookieValue.current !== undefined
      ? { name, value: cookieValue.current }
      : undefined),
  }),
}))

const statusRow = vi.hoisted(() => ({ current: null as { status: string } | null }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: statusRow.current }),
        }),
      }),
    }),
  },
}))

import { createSessionCookie, isAdminAuthenticated } from './auth'

const SECRET = 'test-admin-password'
const USER_ID = 'admin-1'

beforeEach(() => {
  process.env.ADMIN_PASSWORD = SECRET
  cookieValue.current = undefined
  statusRow.current = null
})

describe('isAdminAuthenticated — instant revocation on admin_users.status', () => {
  it('an active admin with a valid cookie is authenticated', async () => {
    cookieValue.current = createSessionCookie(USER_ID)
    statusRow.current = { status: 'active' }
    expect(await isAdminAuthenticated()).toBe(true)
  })

  it('a disabled admin is rejected even with a still-cryptographically-valid cookie', async () => {
    cookieValue.current = createSessionCookie(USER_ID)
    statusRow.current = { status: 'disabled' }
    expect(await isAdminAuthenticated()).toBe(false)
  })

  it('a removed admin_users row (no match) is rejected even with a valid cookie', async () => {
    cookieValue.current = createSessionCookie(USER_ID)
    statusRow.current = null
    expect(await isAdminAuthenticated()).toBe(false)
  })

  it('a legacy no-userId session is still treated as owner (unchanged behavior)', async () => {
    cookieValue.current = createSessionCookie()
    expect(await isAdminAuthenticated()).toBe(true)
  })

  it('no cookie at all is rejected', async () => {
    cookieValue.current = undefined
    expect(await isAdminAuthenticated()).toBe(false)
  })

  it('a tampered cookie is rejected before any DB lookup', async () => {
    const cookie = createSessionCookie(USER_ID)
    cookieValue.current = cookie.slice(0, -4) + createHmac('sha256', 'wrong').update('x').digest('hex').slice(0, 4)
    statusRow.current = { status: 'active' }
    expect(await isAdminAuthenticated()).toBe(false)
  })
})
