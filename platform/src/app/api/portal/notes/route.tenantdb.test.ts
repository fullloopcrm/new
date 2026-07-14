import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/PUT /api/portal/notes.
 * The clients notes read/write used to carry a manual .eq('tenant_id', auth.tid).
 * Proves a client reading/writing their own notes never touches a foreign
 * tenant's clients row sharing the same client id.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const CLIENT_ID = 'shared-client-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      rows.filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, values))
      resolve({ data: null, error: null })
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    update: (values: Row) => updateChain(rowsOf(), values),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { GET, PUT } from './route'

beforeEach(() => {
  DB.clients = [
    { id: CLIENT_ID, tenant_id: TENANT_A, notes: 'A own note' },
    { id: CLIENT_ID, tenant_id: TENANT_B, notes: 'B foreign note' },
  ]
})

describe('GET /api/portal/notes — tenantDb scoping', () => {
  it('reads only the caller tenant\'s own notes, not a foreign tenant row sharing the client id', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/notes', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notes).toBe('A own note')
  })
})

describe('PUT /api/portal/notes — tenantDb scoping', () => {
  it('updates only the caller tenant\'s row, never the foreign tenant\'s row sharing the client id', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/notes', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ notes: 'updated by A' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)

    const clientA = DB.clients.find((r) => r.tenant_id === TENANT_A)!
    const clientB = DB.clients.find((r) => r.tenant_id === TENANT_B)!
    expect(clientA.notes).toBe('updated by A')
    expect(clientB.notes).toBe('B foreign note')
  })
})
