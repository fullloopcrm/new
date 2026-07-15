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
const TOKEN_C = 'token-for-member-c'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
const rpcCalls = vi.hoisted(() => [] as Array<{ fn: string; args: Record<string, unknown> }>)
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })
      if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'new-contact', error: null }
      // comhub_get_or_create_thread — resolveThread's thread lookup.
      return { data: `thread-for-${args.p_contact_id}`, error: null }
    },
  },
}))
vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => {
    if (token === TOKEN_A) return { id: 'member-a', tid: 'tid-a', role: 'worker' }
    if (token === TOKEN_C) return { id: 'member-c', tid: 'tid-a', role: 'worker' }
    return null
  },
}))

import { GET, POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    team_members: [
      { id: 'member-a', tenant_id: 'tid-a', name: 'Alice', phone: '5551110000', email: null, status: 'active' },
      { id: 'member-b', tenant_id: 'tid-b', name: 'Bob', phone: '5552220000', email: null, status: 'active' },
      { id: 'member-c', tenant_id: 'tid-a', name: 'Cara', phone: '5553330000', email: null, status: 'active' },
    ],
    comhub_contacts: [
      { id: 'contact-a', team_member_id: 'member-a' },
      { id: 'contact-b', team_member_id: 'member-b' },
    ],
    comhub_messages: [],
    comhub_threads: [],
  })
  holder.from = h.from
  rpcCalls.length = 0
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

  it('member with no existing comhub_contact: contact-creation RPC is called with p_tenant_id (regression — was omitted, which Postgres rejects since p_tenant_id has no SQL default)', async () => {
    const res = await POST(postReq({ authorization: `Bearer ${TOKEN_C}` }, { body: 'first message' }))
    expect(res.status).toBe(200)

    const contactRpc = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_contact_by_phone')
    expect(contactRpc).toBeDefined()
    expect(contactRpc!.args.p_tenant_id).toBe('tid-a')

    const threadRpc = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_thread')
    expect(threadRpc).toBeDefined()
    expect(threadRpc!.args.p_tenant_id).toBe('tid-a')
  })
})
