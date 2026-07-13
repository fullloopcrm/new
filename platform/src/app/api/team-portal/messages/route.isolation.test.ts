import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion + auth-hardening probe — team-portal/messages/route.ts.
 *
 * Two independent gaps fixed in the same pass:
 * 1. The route trusted a caller-supplied `team_member_id` (query param on GET,
 *    body field on POST) with NO token verification at all — unlike every
 *    other /api/team-portal/* route. Anyone with no credentials could read or
 *    send messages as any team member in any tenant. Now requires the same
 *    bearer verifyToken() auth as its siblings; team_member_id/tenant_id come
 *    only from the verified token.
 * 2. Once converted to tenantDb(auth.tid), the comhub RPC calls
 *    (comhub_get_or_create_contact_by_phone / comhub_get_or_create_thread)
 *    were missing their required p_tenant_id argument entirely — a real bug
 *    that would have errored on every first-contact message. Proves the RPC
 *    is invoked with the token's tenant id.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let rpcCalls: { fn: string; args: Record<string, unknown> }[]

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let limit: number | null = null
  let mode: 'select' | 'update' | 'insert' = 'select'
  let payload: Row | Row[] | null = null

  const rows = (): Row[] => {
    let r = (store[table] || []).filter((row) => matchesEq(row, eqs))
    if (limit != null) r = r.slice(0, limit)
    return r
  }

  const chain: Record<string, unknown> = {
    select: () => {
      if (mode === 'insert') {
        const inserted = { id: `new-${table}-${(store[table] || []).length}`, ...(payload as Row) }
        store[table] = [...(store[table] || []), inserted]
        payload = inserted
      }
      return chain
    },
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: (n: number) => {
      limit = n
      return chain
    },
    update: (values: Row) => {
      mode = 'update'
      payload = values
      return chain
    },
    insert: (row: Row) => {
      mode = 'insert'
      payload = row
      return chain
    },
    single: () => {
      if (mode === 'update') {
        store[table] = (store[table] || []).map((row) => (matchesEq(row, eqs) ? { ...row, ...(payload as Row) } : row))
        return Promise.resolve({ data: payload, error: null })
      }
      if (mode === 'insert') return Promise.resolve({ data: payload, error: null })
      return Promise.resolve({ data: rows()[0] || null, error: null })
    },
    then: (resolve: (v: { data: Row[] | null; error: null }) => unknown) => {
      if (mode === 'update') {
        store[table] = (store[table] || []).map((row) => (matchesEq(row, eqs) ? { ...row, ...(payload as Row) } : row))
        return resolve({ data: [payload as Row], error: null })
      }
      return resolve({ data: rows(), error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => builder(table),
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })
      if (fn === 'comhub_get_or_create_contact_by_phone') {
        const contactId = `contact-${args.p_tenant_id}`
        store.comhub_contacts = [
          ...(store.comhub_contacts || []),
          { id: contactId, tenant_id: args.p_tenant_id, phone: args.p_phone },
        ]
        return Promise.resolve({ data: contactId, error: null })
      }
      if (fn === 'comhub_get_or_create_thread') {
        const existing = (store.comhub_threads || []).find(
          (t) => t.tenant_id === args.p_tenant_id && t.contact_id === args.p_contact_id
        )
        if (existing) return Promise.resolve({ data: existing.id as string, error: null })
        const threadId = `thread-${args.p_tenant_id}`
        store.comhub_threads = [
          ...(store.comhub_threads || []),
          { id: threadId, tenant_id: args.p_tenant_id, contact_id: args.p_contact_id },
        ]
        return Promise.resolve({ data: threadId, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    },
  },
}))

vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => {
    try {
      return JSON.parse(token)
    } catch {
      return null
    }
  },
}))

import { GET, POST } from './route'

beforeEach(() => {
  rpcCalls = []
  store = {
    team_members: [
      { id: 'member-A', tenant_id: 'tenant-A', name: 'Alice', phone: '+15550001', email: null },
      { id: 'member-B', tenant_id: 'tenant-B', name: 'Bob', phone: '+15550002', email: null },
    ],
    comhub_contacts: [{ id: 'contact-B', tenant_id: 'tenant-B', team_member_id: 'member-B' }],
    comhub_threads: [
      { id: 'thread-A', tenant_id: 'tenant-A', contact_id: null },
      { id: 'thread-B', tenant_id: 'tenant-B', contact_id: 'contact-B' },
    ],
    comhub_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', thread_id: 'thread-A', direction: 'in', author: 'cleaner', body: 'from A', sent_at: '2026-01-01T00:00:00Z', channel: 'web' },
      { id: 'msg-B1', tenant_id: 'tenant-B', thread_id: 'thread-B', direction: 'in', author: 'cleaner', body: 'from B', sent_at: '2026-01-01T00:00:00Z', channel: 'web' },
    ],
  }
})

function bearer(tid: string, id: string): string {
  return `Bearer ${JSON.stringify({ tid, id })}`
}

describe('team-portal/messages — auth is mandatory', () => {
  it('GET with no Authorization header is rejected before any team_member_id is trusted', async () => {
    const res = await GET(new NextRequest('http://x/api/team-portal/messages?team_member_id=member-B'))
    expect(res.status).toBe(401)
  })

  it('POST with no Authorization header is rejected', async () => {
    const res = await POST(new NextRequest('http://x/api/team-portal/messages', {
      method: 'POST',
      body: JSON.stringify({ team_member_id: 'member-B', body: 'hi' }),
    }))
    expect(res.status).toBe(401)
  })
})

describe('team-portal/messages GET — tenantDb isolation', () => {
  it("member A's thread never surfaces tenant B's messages, even though team_members A has no comhub_contacts row yet", async () => {
    const res = await GET(new NextRequest('http://x/api/team-portal/messages', {
      headers: { authorization: bearer('tenant-A', 'member-A') },
    }))
    const body = await res.json()
    expect((body.messages as { body: string }[]).every((m) => m.body !== 'from B')).toBe(true)
  })

  it('member B sees only its own thread', async () => {
    const res = await GET(new NextRequest('http://x/api/team-portal/messages', {
      headers: { authorization: bearer('tenant-B', 'member-B') },
    }))
    const body = await res.json()
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].body).toBe('from B')
  })
})

describe('team-portal/messages — RPC tenant scoping (p_tenant_id bug fix)', () => {
  it('comhub_get_or_create_contact_by_phone and comhub_get_or_create_thread are called with the token tenant id, not undefined', async () => {
    await GET(new NextRequest('http://x/api/team-portal/messages', {
      headers: { authorization: bearer('tenant-A', 'member-A') },
    }))
    const contactCall = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_contact_by_phone')
    const threadCall = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_thread')
    expect(contactCall?.args.p_tenant_id).toBe('tenant-A')
    expect(threadCall?.args.p_tenant_id).toBe('tenant-A')
  })
})

describe('team-portal/messages POST — tenant id comes from the token, not the body', () => {
  it("a request for tenant A cannot land a message in tenant B's thread even if it claims member B's id", async () => {
    const res = await POST(new NextRequest('http://x/api/team-portal/messages', {
      method: 'POST',
      headers: { authorization: bearer('tenant-A', 'member-A'), 'content-type': 'application/json' },
      body: JSON.stringify({ team_member_id: 'member-B', body: 'spoofed' }),
    }))
    expect(res.status).toBe(200)
    const tenantBMessages = (store.comhub_messages || []).filter((m) => m.tenant_id === 'tenant-B')
    expect(tenantBMessages.every((m) => m.body !== 'spoofed')).toBe(true)
  })
})
