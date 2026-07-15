import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/notes/route.ts field-separation probe.
 * clients.notes is the internal staff/operator note field (dashboard
 * client-drawer "Operator" tab); clients.special_instructions is the
 * client-facing "notes for your team member" field. A client-portal caller
 * must only ever read/write special_instructions, never notes.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let updateValues: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    update: (values: Row) => { updateValues = values; return chain },
    single: async () => {
      const rows = (store[table] || []).filter((r) => Object.entries(eqs).every(([k, v]) => r[k] === v))
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}` } }
      return { data: rows[0], error: null }
    },
    then: (resolve: (v: { data: null; error: null }) => unknown) => {
      const rows = (store[table] || []).filter((r) => Object.entries(eqs).every(([k, v]) => r[k] === v))
      if (updateValues) for (const row of rows) Object.assign(row, updateValues)
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: 'tenant-A' }),
}))

vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => ({ clientId: 'client-a' }),
}))

import { GET, PUT } from './route'

beforeEach(() => {
  store = {
    clients: [
      { id: 'client-a', tenant_id: 'tenant-A', special_instructions: 'Door code 1234', notes: 'internal: chronic late payer' },
    ],
  }
})

function req(method = 'GET', body?: unknown): Request {
  const url = method === 'GET' ? 'http://x/api/client/notes?client_id=client-a' : 'http://x/api/client/notes'
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('client/notes GET — field separation', () => {
  it('returns special_instructions, not the internal operator note', async () => {
    const res = await GET(req())
    const body = await res.json()
    expect(body.notes).toBe('Door code 1234')
    expect(body.notes).not.toBe('internal: chronic late payer')
  })
})

describe('client/notes PUT — field separation', () => {
  it('writes special_instructions and never touches the internal operator note', async () => {
    const res = await PUT(req('PUT', { client_id: 'client-a', notes: 'Ring bell twice' }))
    expect(res.status).toBe(200)

    const row = store.clients[0]
    expect(row.special_instructions).toBe('Ring bell twice')
    expect(row.notes).toBe('internal: chronic late payer')
  })
})
