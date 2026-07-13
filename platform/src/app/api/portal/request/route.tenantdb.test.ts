import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/portal/request.
 * The clients lookup and deals read/update/insert used to carry manual
 * .eq('tenant_id', auth.tid) filters — proves the tenantDb() auto-filter still
 * finds/updates only the CALLER's own tenant's open deal when a foreign tenant
 * happens to reuse the same client id.
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
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    order: () => c,
    update: (values: Row) => updateChain(rowsOf(), values),
    insert: (row: Row) => { rowsOf().push({ id: `inserted-${rowsOf().length}`, ...row }); return { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }) } },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(() => Promise.resolve()) }))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { POST } from './route'

beforeEach(() => {
  DB.clients = [
    { id: CLIENT_ID, tenant_id: TENANT_A, name: 'Client A' },
    { id: CLIENT_ID, tenant_id: TENANT_B, name: 'Client B' },
  ]
  DB.deals = [
    { id: 'deal-b-open', tenant_id: TENANT_B, client_id: CLIENT_ID, stage: 'new', notes: 'tenant B pre-existing deal' },
  ]
})

describe('POST /api/portal/request — tenantDb scoping', () => {
  it('creates a NEW deal for tenant A instead of merging into a foreign tenant\'s open deal for the same client id', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/request', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ service_name: 'Deep clean', preferred_date: '2026-08-01', notes: 'please help' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const tenantADeals = DB.deals.filter((d) => d.tenant_id === TENANT_A)
    const tenantBDeal = DB.deals.find((d) => d.id === 'deal-b-open')!
    expect(tenantADeals.length).toBe(1)
    expect(tenantBDeal.notes).toBe('tenant B pre-existing deal')
  })
})
