import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — portal/messages/route.ts.
 * Converts the comhub_contacts/comhub_threads/comhub_messages reads and
 * writes to tenantDb(tenantId) once the client's own tenant is resolved.
 * The comhub_messages thread query previously carried NO .eq('tenant_id')
 * at all, trusting the thread id resolved one query earlier. Proves a
 * client's thread never surfaces another tenant's messages even when
 * another tenant's thread/messages exist in the same tables.
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
          { id: contactId, tenant_id: args.p_tenant_id, client_id: args.p_client_id },
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

vi.mock('@/lib/nycmaid/auth', () => ({
  protectClientAPI: () => Promise.resolve({ clientId: currentClientId }),
}))

import { GET, POST } from './route'

let currentClientId = 'client-A'

beforeEach(() => {
  rpcCalls = []
  currentClientId = 'client-A'
  store = {
    clients: [
      { id: 'client-A', tenant_id: 'tenant-A', phone: '+15550001', email: null, name: 'Client A' },
      { id: 'client-B', tenant_id: 'tenant-B', phone: '+15550002', email: null, name: 'Client B' },
    ],
    comhub_contacts: [{ id: 'contact-B', tenant_id: 'tenant-B', client_id: 'client-B' }],
    comhub_threads: [
      { id: 'thread-B', tenant_id: 'tenant-B', contact_id: 'contact-B' },
    ],
    comhub_messages: [
      { id: 'msg-B1', tenant_id: 'tenant-B', thread_id: 'thread-B', direction: 'in', author: 'customer', body: 'from B', sent_at: '2026-01-01T00:00:00Z', channel: 'web' },
    ],
  }
})

describe('portal/messages GET — tenantDb isolation', () => {
  it("client A's first-time thread (no comhub_contacts row yet) never surfaces tenant B's messages", async () => {
    const res = await GET()
    const body = await res.json()
    expect((body.messages as { body: string }[]).every((m) => m.body !== 'from B')).toBe(true)
  })

  it('client B sees only its own thread', async () => {
    currentClientId = 'client-B'
    const res = await GET()
    const body = await res.json()
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].body).toBe('from B')
  })
})

describe('portal/messages — RPC tenant scoping', () => {
  it('comhub_get_or_create_contact_by_phone and comhub_get_or_create_thread receive the client\'s own tenant id', async () => {
    await GET()
    const contactCall = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_contact_by_phone')
    const threadCall = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_thread')
    expect(contactCall?.args.p_tenant_id).toBe('tenant-A')
    expect(threadCall?.args.p_tenant_id).toBe('tenant-A')
  })
})

describe('portal/messages POST', () => {
  it('client A sending a message never lands in tenant B\'s thread', async () => {
    const res = await POST(new NextRequest('http://x/api/portal/messages', {
      method: 'POST',
      body: JSON.stringify({ body: 'hello from A' }),
    }))
    expect(res.status).toBe(200)
    const tenantBMessages = (store.comhub_messages || []).filter((m) => m.tenant_id === 'tenant-B')
    expect(tenantBMessages.every((m) => m.body !== 'hello from A')).toBe(true)
  })
})
