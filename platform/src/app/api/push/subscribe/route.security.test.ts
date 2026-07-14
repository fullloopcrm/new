/**
 * POST /api/push/subscribe previously trusted `role`, `team_member_id`, and
 * `client_id` straight from the request body, gated only on getCurrentTenant()
 * — which resolves successfully for ANY visitor on a tenant's own domain via
 * middleware's signed x-tenant-id header, not just logged-in admins. That
 * meant an anonymous, unauthenticated website visitor could POST
 * { role: 'admin' } and start silently receiving that tenant's operational
 * admin push notifications (new-booking / running-late alerts containing
 * client names, appointment times, team member names), or claim an arbitrary
 * team_member_id/client_id to intercept notifications meant for someone else.
 *
 * Fix derives tenant_id/team_member_id/client_id ONLY from a verified
 * session/token (getTenantForRequest for admin, the team-portal bearer token
 * for team_member, the client-portal bearer token or client_session cookie
 * for client) — the request body can no longer assert an identity.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.PORTAL_SECRET = 'portal-test-secret'
process.env.TEAM_PORTAL_SECRET = 'team-portal-test-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

// Controls the admin-auth outcome per test without exercising the full
// cookie/Clerk resolution chain (covered elsewhere) — this suite is only
// about push/subscribe trusting its result correctly.
let adminTenantId: string | null = null
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: () =>
    adminTenantId ? Promise.resolve({ tenantId: adminTenantId }) : Promise.reject(new Error('Unauthorized')),
}))

let cookieJar = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { createClientSession } from '@/lib/client-auth'
import { createToken as createPortalToken } from '@/app/api/portal/auth/token'
import { createToken as createTeamPortalToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const TEAM_MEMBER_A = 'tm-a'
const CLIENT_A = 'client-a'

function req(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('http://test.local/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  adminTenantId = null
  cookieJar = new Map()
})

describe('POST /api/push/subscribe — admin role', () => {
  it('rejects an anonymous caller (no authenticated admin session), even with a subscription payload claiming role:admin', async () => {
    const res = await POST(req({ subscription: { endpoint: 'https://push.example/ep-anon' }, role: 'admin' }))
    expect(res.status).toBe(401)
    expect(fake._store.get('push_subscriptions') || []).toHaveLength(0)
  })

  it('rejects when role is omitted (defaults to admin) and there is no authenticated session', async () => {
    const res = await POST(req({ subscription: { endpoint: 'https://push.example/ep-anon2' } }))
    expect(res.status).toBe(401)
    expect(fake._store.get('push_subscriptions') || []).toHaveLength(0)
  })

  it('accepts an authenticated admin session and stores tenant_id from the session, not the body', async () => {
    adminTenantId = TENANT_A
    const res = await POST(
      req({ subscription: { endpoint: 'https://push.example/ep-admin' }, role: 'admin', tenant_id: TENANT_B }),
    )
    expect(res.status).toBe(200)
    const rows = fake._store.get('push_subscriptions') || []
    expect(rows).toHaveLength(1)
    expect(rows[0].tenant_id).toBe(TENANT_A)
    expect(rows[0].role).toBe('admin')
  })
})

describe('POST /api/push/subscribe — team_member role', () => {
  it('rejects a caller-supplied team_member_id with no portal bearer token', async () => {
    const res = await POST(
      req({ subscription: { endpoint: 'https://push.example/ep-tm-anon' }, role: 'team_member', team_member_id: TEAM_MEMBER_A }),
    )
    expect(res.status).toBe(401)
    expect(fake._store.get('push_subscriptions') || []).toHaveLength(0)
  })

  it('rejects a valid token for a DIFFERENT team member than the one claimed in the body', async () => {
    const token = createTeamPortalToken('someone-else', TENANT_A)
    const res = await POST(
      req(
        { subscription: { endpoint: 'https://push.example/ep-tm-imposter' }, role: 'team_member', team_member_id: TEAM_MEMBER_A },
        { Authorization: `Bearer ${token}` },
      ),
    )
    expect(res.status).toBe(200)
    const rows = fake._store.get('push_subscriptions') || []
    // Identity comes from the token, never the body — the impersonation attempt is a no-op.
    expect(rows[0].team_member_id).toBe('someone-else')
    expect(rows[0].team_member_id).not.toBe(TEAM_MEMBER_A)
  })

  it('accepts a valid team-portal bearer token and derives tenant_id + team_member_id from it', async () => {
    const token = createTeamPortalToken(TEAM_MEMBER_A, TENANT_A)
    const res = await POST(
      req({ subscription: { endpoint: 'https://push.example/ep-tm-ok' }, role: 'team_member' }, { Authorization: `Bearer ${token}` }),
    )
    expect(res.status).toBe(200)
    const rows = fake._store.get('push_subscriptions') || []
    expect(rows[0].tenant_id).toBe(TENANT_A)
    expect(rows[0].team_member_id).toBe(TEAM_MEMBER_A)
    expect(rows[0].client_id).toBeNull()
  })
})

describe('POST /api/push/subscribe — client role', () => {
  it('rejects a caller-supplied client_id with no bearer token and no client_session cookie', async () => {
    const res = await POST(
      req({ subscription: { endpoint: 'https://push.example/ep-client-anon' }, role: 'client', client_id: CLIENT_A }),
    )
    expect(res.status).toBe(401)
    expect(fake._store.get('push_subscriptions') || []).toHaveLength(0)
  })

  it('accepts a valid client-portal bearer token and derives tenant_id + client_id from it', async () => {
    const token = createPortalToken(CLIENT_A, TENANT_A)
    const res = await POST(
      req({ subscription: { endpoint: 'https://push.example/ep-client-bearer' }, role: 'client' }, { Authorization: `Bearer ${token}` }),
    )
    expect(res.status).toBe(200)
    const rows = fake._store.get('push_subscriptions') || []
    expect(rows[0].tenant_id).toBe(TENANT_A)
    expect(rows[0].client_id).toBe(CLIENT_A)
  })

  it('accepts a valid client_session cookie as a fallback when no bearer token is sent', async () => {
    const cookieValue = createClientSession(CLIENT_A, TENANT_A)
    cookieJar.set('client_session', { value: cookieValue })
    const res = await POST(req({ subscription: { endpoint: 'https://push.example/ep-client-cookie' }, role: 'client' }))
    expect(res.status).toBe(200)
    const rows = fake._store.get('push_subscriptions') || []
    expect(rows[0].tenant_id).toBe(TENANT_A)
    expect(rows[0].client_id).toBe(CLIENT_A)
  })

  it('rejects an expired/forged client_session cookie', async () => {
    cookieJar.set('client_session', { value: 'forged.tenant-a.123.deadbeef' })
    const res = await POST(req({ subscription: { endpoint: 'https://push.example/ep-client-forged' }, role: 'client' }))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/push/subscribe — invalid role', () => {
  it('rejects an unrecognized role', async () => {
    const res = await POST(req({ subscription: { endpoint: 'https://push.example/ep-bad-role' }, role: 'super_admin' }))
    expect(res.status).toBe(400)
  })
})
