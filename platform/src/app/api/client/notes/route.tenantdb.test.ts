import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/PUT /api/client/notes.
 * A fake PostgREST layer applies every `.eq` predicate against a seeded
 * two-tenant dataset, so a route that silently reverted to unscoped
 * supabaseAdmin would leak (or overwrite) the foreign tenant's client note here.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let mode: 'select' | 'update' = 'select'
  let updatePayload: Row = {}
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    update: (payload: Row) => { mode = 'update'; updatePayload = payload; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => {
      const m = matched()
      return m[0] ? { data: m[0], error: null } : { data: null, error: { message: 'not found' } }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      if (mode === 'update') {
        matched().forEach((r) => Object.assign(r, updatePayload))
        return resolve({ data: null, error: null })
      }
      return resolve({ data: matched(), error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const tenantCtx: { value: { id: string } } = { value: { id: TENANT_A } }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async (_t: string, clientId?: string) => ({ clientId }) }))

import { GET, PUT } from './route'

beforeEach(() => {
  DB.clients = []
  tenantCtx.value = { id: TENANT_A }
})

describe('GET /api/client/notes — tenantDb scoping', () => {
  it('404s a note belonging to a different tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_B, notes: 'SECRET_B' })
    const res = await GET(new Request('https://x?client_id=c-1'))
    expect(res.status).toBe(404)
  })

  it('returns the note for the caller tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, notes: 'hello' })
    const res = await GET(new Request('https://x?client_id=c-1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ notes: 'hello' })
  })
})

describe('PUT /api/client/notes — tenantDb scoping', () => {
  it('cannot overwrite a note belonging to a different tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_B, notes: 'SECRET_B' })
    const res = await PUT(new Request('https://x', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: 'c-1', notes: 'PWNED' }),
    }))
    expect(res.status).toBe(200)
    expect(DB.clients[0].notes).toBe('SECRET_B')
  })

  it('updates the note for the caller tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, notes: 'old' })
    const res = await PUT(new Request('https://x', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: 'c-1', notes: 'new' }),
    }))
    expect(res.status).toBe(200)
    expect(DB.clients[0].notes).toBe('new')
  })
})
