import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * team-portal/messages IDOR regression. The route used to take team_member_id
 * from the query/body and resolve that member's office thread with NO auth — so
 * anyone could read or post another team member's (or another tenant's) thread
 * by supplying their id. The member id must come ONLY from the verified bearer
 * token (auth.id); a caller-supplied id is ignored.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const MEMBER_A = '11111111-0000-0000-0000-000000000001'
const MEMBER_B = '22222222-0000-0000-0000-000000000002'

// Records every .single() lookup so we can prove WHICH member id was resolved.
const lookups: Array<{ table: string; select: string; idEq?: string }> = []
const inserts: Array<{ table: string }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let selectStr = ''
    let idEq: string | undefined
    const c: Record<string, unknown> = {
      select: (s = '') => { selectStr = s; return c },
      insert: () => { inserts.push({ table }); return c },
      update: () => c,
      eq: (col: string, val: string) => { if (col === 'id') idEq = val; return c },
      in: () => c,
      not: () => c,
      order: () => c,
      limit: async () => ({ data: [], error: null }),
      single: async () => {
        lookups.push({ table, select: selectStr, idEq })
        if (table === 'team_members' && selectStr.includes('status')) return { data: { status: 'active' }, error: null }
        if (table === 'team_members') return { data: { id: idEq, name: 'M', phone: '+15551234567', email: 'm@x.com', tenant_id: TENANT }, error: null }
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

function profileLookupId(): string | undefined {
  // the resolveThread member-profile select (contains 'phone'), not the auth check
  const profile = lookups.find((l) => l.table === 'team_members' && l.select.includes('phone'))
  return profile?.idEq
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  lookups.length = 0
  inserts.length = 0
})

describe('team-portal/messages auth', () => {
  it('GET REJECTS (401) with no bearer token', async () => {
    const res = await GET(new NextRequest('https://x/api/team-portal/messages'))
    expect(res.status).toBe(401)
  })

  it('POST REJECTS (401) with no bearer token — nothing inserted', async () => {
    const req = new NextRequest('https://x/api/team-portal/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ team_member_id: MEMBER_B, body: 'hi' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(inserts.filter((i) => i.table === 'comhub_messages')).toHaveLength(0)
  })

  it('GET IGNORES a forged ?team_member_id and resolves the TOKEN member', async () => {
    const token = createToken(MEMBER_A, TENANT, 0, 'worker')
    const req = new NextRequest(`https://x/api/team-portal/messages?team_member_id=${MEMBER_B}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    // The office thread resolved was MEMBER_A's (the token), never the forged B.
    expect(profileLookupId()).toBe(MEMBER_A)
    expect(profileLookupId()).not.toBe(MEMBER_B)
  })

  it('POST IGNORES a forged body team_member_id and posts as the TOKEN member', async () => {
    const token = createToken(MEMBER_A, TENANT, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/messages', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ team_member_id: MEMBER_B, body: 'hello office' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(profileLookupId()).toBe(MEMBER_A)
    expect(profileLookupId()).not.toBe(MEMBER_B)
  })
})
