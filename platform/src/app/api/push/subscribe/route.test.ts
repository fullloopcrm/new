/**
 * POST /api/push/subscribe — identity-ownership gate.
 *
 * Previously used getCurrentTenant(), which resolves a tenant from the
 * PUBLIC, unauthenticated x-tenant-id/x-tenant-sig header (any visitor to a
 * tenant's own domain gets this header) with no further auth. Combined with
 * fully caller-controlled `role`/`team_member_id`/`client_id` in the body,
 * this let anyone:
 *  - subscribe as role:'admin' (the default) and silently receive every
 *    admin push notification for that tenant (sendPushToTenantAdmins), or
 *  - subscribe as role:'team_member'/'client' with an arbitrary
 *    team_member_id/client_id and intercept that identity's push
 *    notifications (sendPushToTeamMember/sendPushToClient in lib/push.ts
 *    aren't even tenant-scoped, so this reached across tenants too).
 *
 * The fix requires the caller to actually AUTHENTICATE as the identity they
 * claim: getTenantForRequest() (real admin/dashboard session) for role
 * 'admin', getPortalAuth() (portal bearer token) matching team_member_id for
 * role 'team_member', and protectClientAPI() matching client_id for role
 * 'client'. These tests prove each forged claim is now rejected and that a
 * genuinely-authenticated identity still works.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_ID = 'tenant-A'
const VICTIM_TEAM_MEMBER_ID = 'team-member-victim'
const VICTIM_CLIENT_ID = 'client-victim'

const { MockAuthError } = vi.hoisted(() => ({
  MockAuthError: class MockAuthError extends Error {
    status = 401
  },
}))

let tenantForRequestResult: { tenantId: string } | 'throw-auth-error'
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => {
    if (tenantForRequestResult === 'throw-auth-error') {
      throw new MockAuthError('Not authenticated')
    }
    return tenantForRequestResult
  },
  AuthError: MockAuthError,
}))

let portalAuthResult: { id: string; tid: string; role: string } | null
vi.mock('@/lib/team-portal-auth', () => ({
  getPortalAuth: () => portalAuthResult,
}))

let clientAuthResult: { clientId: string } | NextResponse
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => clientAuthResult,
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  tenantForRequestResult = 'throw-auth-error'
  portalAuthResult = null
  clientAuthResult = NextResponse.json({ error: 'Not logged in' }, { status: 401 })
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://x/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function subsFor(role: string): Promise<Array<Record<string, unknown>>> {
  const { data } = await fake.from('push_subscriptions').select('*')
  return ((data as Array<Record<string, unknown>> | null) || []).filter((r) => r.role === role)
}

describe('POST /api/push/subscribe — role:team_member', () => {
  it('rejects a claimed team_member_id with no portal auth at all', async () => {
    const res = await POST(req({
      subscription: { endpoint: 'https://push.example/attacker' },
      role: 'team_member',
      team_member_id: VICTIM_TEAM_MEMBER_ID,
    }))
    expect(res.status).toBe(401)
    expect(await subsFor('team_member')).toHaveLength(0)
  })

  it("rejects a portal token for a DIFFERENT member than the claimed team_member_id", async () => {
    portalAuthResult = { id: 'attacker-member', tid: TENANT_ID, role: 'worker' }
    const res = await POST(req({
      subscription: { endpoint: 'https://push.example/attacker' },
      role: 'team_member',
      team_member_id: VICTIM_TEAM_MEMBER_ID,
    }))
    expect(res.status).toBe(401)
    expect(await subsFor('team_member')).toHaveLength(0)
  })

  it('accepts a portal token that matches its own team_member_id', async () => {
    portalAuthResult = { id: VICTIM_TEAM_MEMBER_ID, tid: TENANT_ID, role: 'worker' }
    const res = await POST(req({
      subscription: { endpoint: 'https://push.example/own-device' },
      role: 'team_member',
      team_member_id: VICTIM_TEAM_MEMBER_ID,
    }))
    expect(res.status).toBe(200)
    const rows = await subsFor('team_member')
    expect(rows).toHaveLength(1)
    expect(rows[0].team_member_id).toBe(VICTIM_TEAM_MEMBER_ID)
    expect(rows[0].tenant_id).toBe(TENANT_ID)
  })
})

describe('POST /api/push/subscribe — role:client', () => {
  it('rejects a claimed client_id with no client session', async () => {
    clientAuthResult = NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    const res = await POST(req({
      subscription: { endpoint: 'https://push.example/attacker' },
      role: 'client',
      client_id: VICTIM_CLIENT_ID,
    }))
    expect(res.status).toBe(401)
    expect(await subsFor('client')).toHaveLength(0)
  })

  it('accepts a client session that matches its own client_id', async () => {
    clientAuthResult = { clientId: VICTIM_CLIENT_ID }
    const res = await POST(req({
      subscription: { endpoint: 'https://push.example/own-device' },
      role: 'client',
      client_id: VICTIM_CLIENT_ID,
    }))
    expect(res.status).toBe(200)
    const rows = await subsFor('client')
    expect(rows).toHaveLength(1)
    expect(rows[0].client_id).toBe(VICTIM_CLIENT_ID)
  })
})

describe('POST /api/push/subscribe — role:admin (default)', () => {
  it('rejects an unauthenticated caller (public tenant-domain header is not a session)', async () => {
    tenantForRequestResult = 'throw-auth-error'
    const res = await POST(req({
      subscription: { endpoint: 'https://push.example/attacker' },
    }))
    expect(res.status).toBe(401)
    expect(await subsFor('admin')).toHaveLength(0)
  })

  it('accepts a real authenticated dashboard session', async () => {
    tenantForRequestResult = { tenantId: TENANT_ID }
    const res = await POST(req({
      subscription: { endpoint: 'https://push.example/real-admin-device' },
    }))
    expect(res.status).toBe(200)
    const rows = await subsFor('admin')
    expect(rows).toHaveLength(1)
    expect(rows[0].tenant_id).toBe(TENANT_ID)
  })
})
