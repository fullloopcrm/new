import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/push/subscribe used to trust role/team_member_id/client_id
 * straight from the request body, gated only on getCurrentTenant() -- which
 * resolves for ANY visitor on a tenant's own domain via middleware's signed
 * x-tenant-id header, not just logged-in admins/team-members/clients. Any
 * anonymous website visitor could POST {role:'admin'} and silently start
 * receiving that tenant's operational admin push notifications, or claim an
 * arbitrary team_member_id/client_id to intercept another identity's
 * notifications.
 *
 * Fix derives tenant_id/team_member_id/client_id ONLY from a verified
 * session/token — the body can no longer assert an identity. This proves:
 *   1. role:'admin' with no dashboard session is rejected (401), no write.
 *   2. role:'team_member' with no portal bearer token is rejected (401).
 *   3. role:'client' with no bearer token and no session cookie is rejected.
 *   4. A legitimate authenticated caller in each role still succeeds and the
 *      identity written to the DB comes from the verified session, not body.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const MEMBER_A = 'member-aaa'
const CLIENT_A = 'client-aaa'

const writes: Array<{ op: 'insert' | 'update'; row: Record<string, unknown> }> = []

vi.mock('@/lib/supabase', () => {
  function chain() {
    const c: Record<string, unknown> = {
      select: () => c,
      eq: () => c,
      limit: async () => ({ data: [], error: null }),
      insert: (row: Record<string, unknown>) => { writes.push({ op: 'insert', row }); return c },
      update: (row: Record<string, unknown>) => { writes.push({ op: 'update', row }); return c },
    }
    return c
  }
  return { supabaseAdmin: { from: () => chain() } }
})

let adminTenant: { tenantId: string } | null = null
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => {
    if (!adminTenant) throw new Error('no session')
    return adminTenant
  },
}))

let portalAuth: { id: string; tid: string; role: string } | null = null
vi.mock('@/lib/team-portal-auth', () => ({
  getPortalAuth: () => portalAuth,
}))

let clientBearerAuth: { id: string; tid: string } | null = null
vi.mock('@/app/api/portal/auth/token', () => ({
  verifyPortalToken: (token: string) => (token === 'valid-client-token' ? clientBearerAuth : null),
}))

const mockCookie = { value: undefined as string | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (_name: string) => (mockCookie.value ? { value: mockCookie.value } : undefined),
  }),
}))

let clientCookieSession: { clientId: string; tenantId: string } | null = null
vi.mock('@/lib/client-auth', () => ({
  verifyClientSessionToken: () => clientCookieSession,
  clientSessionCookieOptions: () => ({ name: 'client_session' }),
}))

import { POST } from './route'

function req(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('http://test.local/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/push/subscribe — identity hijack via unauthenticated body-supplied role/id', () => {
  beforeEach(() => {
    writes.length = 0
    adminTenant = null
    portalAuth = null
    clientBearerAuth = null
    clientCookieSession = null
    mockCookie.value = undefined
  })

  it('rejects role:admin with no dashboard session (401, no write)', async () => {
    const res = await POST(req({ subscription: { endpoint: 'ep-1' }, role: 'admin' }))
    expect(res.status).toBe(401)
    expect(writes).toHaveLength(0)
  })

  it('rejects role:team_member with a forged team_member_id but no portal token (401, no write)', async () => {
    const res = await POST(req({ subscription: { endpoint: 'ep-2' }, role: 'team_member', team_member_id: 'not-mine' }))
    expect(res.status).toBe(401)
    expect(writes).toHaveLength(0)
  })

  it('rejects role:client with a forged client_id and no bearer/cookie session (401, no write)', async () => {
    const res = await POST(req({ subscription: { endpoint: 'ep-3' }, role: 'client', client_id: 'not-mine' }))
    expect(res.status).toBe(401)
    expect(writes).toHaveLength(0)
  })

  it('a real admin session succeeds and writes the SESSION tenant, ignoring any body override', async () => {
    adminTenant = { tenantId: TENANT_A }
    const res = await POST(req({ subscription: { endpoint: 'ep-4' }, role: 'admin' }))
    expect(res.status).toBe(200)
    expect(writes).toHaveLength(1)
    expect(writes[0].row.tenant_id).toBe(TENANT_A)
  })

  it('a real team_member portal token succeeds and writes the TOKEN identity, ignoring a forged body team_member_id', async () => {
    portalAuth = { id: MEMBER_A, tid: TENANT_A, role: 'cleaner' }
    const res = await POST(
      req({ subscription: { endpoint: 'ep-5' }, role: 'team_member', team_member_id: 'attacker-id' }, { Authorization: 'Bearer valid-team-token' }),
    )
    expect(res.status).toBe(200)
    expect(writes).toHaveLength(1)
    expect(writes[0].row.team_member_id).toBe(MEMBER_A)
    expect(writes[0].row.tenant_id).toBe(TENANT_A)
  })

  it('a real client bearer token succeeds and writes the TOKEN identity, ignoring a forged body client_id', async () => {
    clientBearerAuth = { id: CLIENT_A, tid: TENANT_A }
    const res = await POST(
      req({ subscription: { endpoint: 'ep-6' }, role: 'client', client_id: 'attacker-id' }, { Authorization: 'Bearer valid-client-token' }),
    )
    expect(res.status).toBe(200)
    expect(writes).toHaveLength(1)
    expect(writes[0].row.client_id).toBe(CLIENT_A)
    expect(writes[0].row.tenant_id).toBe(TENANT_A)
  })

  it('a real client_session cookie (fallback path) succeeds and writes the COOKIE identity', async () => {
    mockCookie.value = 'signed-cookie-value'
    clientCookieSession = { clientId: CLIENT_A, tenantId: TENANT_A }
    const res = await POST(req({ subscription: { endpoint: 'ep-7' }, role: 'client', client_id: 'attacker-id' }))
    expect(res.status).toBe(200)
    expect(writes).toHaveLength(1)
    expect(writes[0].row.client_id).toBe(CLIENT_A)
  })
})
