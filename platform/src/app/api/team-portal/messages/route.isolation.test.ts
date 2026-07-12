import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * team-portal/messages — confirmed IDOR regression test.
 *
 * BUG (fixed here): `team_member_id` came straight from the query string /
 * request body with NO token check anywhere in the file. Any unauthenticated
 * caller could read AND post to any team member's admin-comms thread
 * (deploy-prep/none-write-routes-triage.md row 9).
 *
 * FIX: requires a team-portal Bearer token (verifyToken, same as
 * checkin/checkout); team_member_id is derived from the token.
 */

const TOKEN_A = 'token-for-member-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    // comhub_get_or_create_thread — resolveThread's thread lookup.
    rpc: async (_fn: string, args: Record<string, unknown>) => ({ data: `thread-for-${args.p_contact_id}`, error: null }),
  },
}))
vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => (token === TOKEN_A ? { id: 'member-a', tid: 'tid-a', role: 'worker' } : null),
}))

import { GET, POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    team_members: [
      { id: 'member-a', tenant_id: 'tid-a', name: 'Alice', phone: '5551110000', email: null },
      { id: 'member-b', tenant_id: 'tid-b', name: 'Bob', phone: '5552220000', email: null },
    ],
    comhub_contacts: [
      { id: 'contact-a', team_member_id: 'member-a' },
      { id: 'contact-b', team_member_id: 'member-b' },
    ],
    comhub_messages: [],
    comhub_threads: [],
  })
  holder.from = h.from
})

function getReq(headers: Record<string, string> = {}) {
  return new NextRequest('http://t/api/team-portal/messages', { headers })
}
function postReq(headers: Record<string, string>, body: unknown) {
  return new NextRequest('http://t/api/team-portal/messages', { method: 'POST', headers, body: JSON.stringify(body) })
}

describe('team-portal/messages — IDOR fixed', () => {
  it('GET without a token → 401', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('POST without a token → 401, no message inserted', async () => {
    const res = await POST(postReq({}, { body: 'hello' }))
    expect(res.status).toBe(401)
    expect(h.capture.inserts.find((i) => i.table === 'comhub_messages')).toBeUndefined()
  })

  it('wrong-tenant probe: a valid token for member A can never post as member B', async () => {
    const res = await POST(postReq({ authorization: `Bearer ${TOKEN_A}` }, { body: 'hi office' }))
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'comhub_messages')
    expect(ins).toBeDefined()
    expect(ins!.rows.every((r) => r.tenant_id === 'tid-a')).toBe(true)
    expect(ins!.rows.every((r) => r.contact_id === 'contact-a')).toBe(true)
  })
})
