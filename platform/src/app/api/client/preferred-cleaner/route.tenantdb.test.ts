import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/PUT
 * /api/client/preferred-cleaner. A fake PostgREST layer applies every `.eq`
 * predicate against a seeded two-tenant dataset, so a route that silently
 * reverted to unscoped supabaseAdmin would leak a foreign client's
 * preferred-cleaner data, or let a foreign tenant's team member be assigned.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let mode: 'select' | 'update' = 'select'
  let updatePayload: Row = {}
  let limitN: number | null = null
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => {
    const all = rowsOf().filter((r) => filters.every((f) => f(r)))
    return limitN != null ? all.slice(0, limitN) : all
  }
  const c: Record<string, unknown> = {
    select: () => c,
    update: (payload: Row) => { mode = 'update'; updatePayload = payload; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    not: () => c,
    order: () => c,
    limit: (n: number) => { limitN = n; return c },
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
  DB.bookings = []
  DB.team_members = []
  tenantCtx.value = { id: TENANT_A }
})

describe('GET /api/client/preferred-cleaner — tenantDb scoping', () => {
  it('404s when the client belongs to a different tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_B, preferred_team_member_id: 'tm-1' })
    const res = await GET(new Request('https://x?client_id=c-1'))
    expect(res.status).toBe(404)
  })

  it('returns preferred cleaner for the caller tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, preferred_team_member_id: 'tm-1' })
    const res = await GET(new Request('https://x?client_id=c-1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ preferred_cleaner_id: 'tm-1' })
  })
})

describe('PUT /api/client/preferred-cleaner — tenantDb scoping', () => {
  it('rejects a team member that belongs to a different tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, preferred_team_member_id: null })
    DB.team_members.push({ id: 'tm-evil', tenant_id: TENANT_B, active: true })
    const res = await PUT(new Request('https://x', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: 'c-1', preferred_cleaner_id: 'tm-evil' }),
    }))
    expect(res.status).toBe(400)
    expect(DB.clients[0].preferred_team_member_id).toBeNull()
  })

  it('accepts a team member that belongs to the caller tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, preferred_team_member_id: null })
    DB.team_members.push({ id: 'tm-good', tenant_id: TENANT_A, active: true })
    const res = await PUT(new Request('https://x', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: 'c-1', preferred_cleaner_id: 'tm-good' }),
    }))
    expect(res.status).toBe(200)
    expect(DB.clients[0].preferred_team_member_id).toBe('tm-good')
  })
})
