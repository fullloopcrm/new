import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 regression lock: comhub_get_or_create_contact_by_phone and
 * comhub_get_or_create_thread both require p_tenant_id (no default in the
 * Postgres function signature — see migrations/2026_05_19_comhub.sql). This
 * route called both RPCs WITHOUT p_tenant_id, which — against the REAL
 * Postgres function — fails to resolve (missing required argument) on every
 * call for a team member with no pre-existing comhub_contacts row, silently
 * short-circuiting to an empty thread (GET) or a misleading 404 "team member
 * not found" (POST). The pre-existing messages-authz tests mock the RPC
 * ignoring the params object entirely, so they could never catch this. This
 * mock asserts on args to close that gap.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const MEMBER_A = '11111111-0000-0000-0000-000000000001'

const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      insert: () => c,
      update: () => c,
      eq: () => c,
      in: () => c,
      not: () => c,
      order: () => c,
      limit: async () => ({ data: [], error: null }),
      single: async () => {
        if (table === 'team_members') return { data: { id: MEMBER_A, name: 'M', phone: '+15551234567', email: 'm@x.com', tenant_id: TENANT, status: 'active' }, error: null }
        if (table === 'tenants') return { data: { selena_config: null }, error: null }
        if (table === 'comhub_messages') return { data: { id: 'msg-1', sent_at: 't' }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => res({ data: [], error: null }),
    }
    return c
  }
  return {
    supabaseAdmin: {
      from: (t: string) => chain(t),
      // Mirrors the REAL Postgres function contract: p_tenant_id is required
      // (no DEFAULT) for both RPCs — a call missing it must fail, exactly
      // like PostgREST would against the actual function signature.
      rpc: async (fn: string, params: Record<string, unknown> = {}) => {
        rpcCalls.push({ fn, params })
        if (fn === 'comhub_get_or_create_contact_by_phone') {
          if (!params.p_tenant_id) return { data: null, error: { message: 'p_tenant_id required' } }
          return { data: 'contact-1', error: null }
        }
        if (fn === 'comhub_get_or_create_thread') {
          if (!params.p_tenant_id) return { data: null, error: { message: 'p_tenant_id required' } }
          return { data: 'thread-1', error: null }
        }
        return { data: null, error: null }
      },
    },
  }
})

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { GET, POST } from './route'

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  rpcCalls.length = 0
})

describe('team-portal/messages — get-or-create RPCs are called with the resolved tenant_id', () => {
  it('passes p_tenant_id to comhub_get_or_create_contact_by_phone on GET', async () => {
    const token = createToken(MEMBER_A, TENANT, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/messages', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const call = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_contact_by_phone')
    expect(call).toBeDefined()
    expect(call!.params.p_tenant_id).toBe(TENANT)
  })

  it('passes p_tenant_id to comhub_get_or_create_thread on GET', async () => {
    const token = createToken(MEMBER_A, TENANT, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/messages', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const call = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_thread')
    expect(call).toBeDefined()
    expect(call!.params.p_tenant_id).toBe(TENANT)
  })

  it('does not 404 "team member not found" on POST for a first-time sender', async () => {
    const token = createToken(MEMBER_A, TENANT, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/messages', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ body: 'hello office' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
