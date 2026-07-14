import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane for the team-portal/messages IDOR fix
 * (d66219e2).
 *
 * Fix d66219e2 gated GET/POST on requirePortalPermission and resolves the
 * office thread from the VERIFIED token (auth.id) only — a caller-supplied
 * team_member_id is ignored. The fix's own suite (messages-authz.test.ts)
 * proves no-token -> 401 and that a forged ?team_member_id / body id resolves
 * the TOKEN member's profile.
 *
 * This independently-authored suite locks THREE complementary properties that
 * sibling does NOT assert:
 *
 *   1. INSTANT REVOCATION — a member whose status flipped to inactive is locked
 *      out (401) on a still-valid token, and NOTHING is inserted. The pre-fix
 *      route had no auth at all, so a suspended member (or anyone) posted freely.
 *
 *   2. MALFORMED TOKEN — a garbage bearer token is rejected (401) with zero
 *      inserts (token signature verification, not just presence).
 *
 *   3. CROSS-TENANT WRITE SCOPING — with a valid token for member A in tenant A
 *      and a FORGED body team_member_id pointing at member B in tenant B, the
 *      comhub_messages insert carries tenant_id = A's tenant. The write follows
 *      the token, so a forged id cannot redirect the post into another tenant.
 *
 * createToken runs for real against TEAM_PORTAL_SECRET.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-000000000002'
const MEMBER_A = '11111111-0000-0000-0000-000000000001'
const MEMBER_B = '22222222-0000-0000-0000-000000000002'

const memberTenant: Record<string, string> = { [MEMBER_A]: TENANT_A, [MEMBER_B]: TENANT_B }
const state = { status: 'active' as string }
const inserts: Array<{ table: string; values: Record<string, unknown> }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let selectStr = ''
    let idEq: string | undefined
    let insertValues: Record<string, unknown> | null = null
    const c: Record<string, unknown> = {
      select: (s = '') => { selectStr = s; return c },
      insert: (v: Record<string, unknown>) => { insertValues = v; inserts.push({ table, values: v }); return c },
      update: () => c,
      eq: (col: string, val: string) => { if (col === 'id') idEq = val; return c },
      in: () => c,
      not: () => c,
      order: () => c,
      limit: async () => ({ data: [], error: null }),
      single: async () => {
        if (table === 'team_members' && selectStr.includes('status')) return { data: { status: state.status }, error: null }
        if (table === 'team_members') return { data: { id: idEq, name: 'M', phone: '+15551234567', email: 'm@x.com', tenant_id: memberTenant[idEq || ''] || null }, error: null }
        if (table === 'tenants') return { data: { selena_config: null }, error: null }
        if (table === 'comhub_messages') return { data: { id: 'msg-1', sent_at: 't' }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => { void insertValues; return res({ data: [], error: null }) },
    }
    return c
  }
  return {
    supabaseAdmin: {
      from: (t: string) => chain(t),
      rpc: async (fn: string) => {
        if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-1', error: null }
        if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
        return { data: null, error: null }
      },
    },
  }
})

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { GET, POST } from './route'

const comhubInserts = () => inserts.filter((i) => i.table === 'comhub_messages')

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  state.status = 'active'
  inserts.length = 0
})

// ── 1. Instant revocation ───────────────────────────────────────────────────

describe('W4 messages: an inactive member is locked out on a valid token', () => {
  it('GET REJECTS (401) when the member status is not active', async () => {
    state.status = 'suspended'
    const token = createToken(MEMBER_A, TENANT_A, 0, 'worker')
    const res = await GET(new NextRequest('https://x/api/team-portal/messages', { headers: { authorization: `Bearer ${token}` } }))
    expect(res.status).toBe(401)
  })

  it('POST REJECTS (401) when inactive — nothing inserted', async () => {
    state.status = 'removed'
    const token = createToken(MEMBER_A, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/messages', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ body: 'hi' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(comhubInserts()).toHaveLength(0)
  })
})

// ── 2. Malformed token ──────────────────────────────────────────────────────

describe('W4 messages: a malformed bearer token is rejected', () => {
  it('POST REJECTS (401) a garbage token — nothing inserted', async () => {
    const req = new NextRequest('https://x/api/team-portal/messages', {
      method: 'POST',
      headers: { authorization: 'Bearer not.a.real.token', 'content-type': 'application/json' },
      body: JSON.stringify({ body: 'hi' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(comhubInserts()).toHaveLength(0)
  })
})

// ── 3. Cross-tenant write scoping ───────────────────────────────────────────

describe('W4 messages: the insert tenant follows the token, not a forged id', () => {
  it('POST with a valid MEMBER_A token and forged body team_member_id=MEMBER_B inserts under TENANT_A', async () => {
    const token = createToken(MEMBER_A, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/messages', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ team_member_id: MEMBER_B, body: 'hello office' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(comhubInserts()).toHaveLength(1)
    // The write's tenant is A (the token member), never B (the forged id's tenant).
    expect(comhubInserts()[0].values.tenant_id).toBe(TENANT_A)
    expect(comhubInserts()[0].values.tenant_id).not.toBe(TENANT_B)
  })
})
