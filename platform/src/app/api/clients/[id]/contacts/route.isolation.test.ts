import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — clients/[id]/contacts/route.ts.
 * Proves tenant A can't read another tenant's client_contacts by forging
 * a client id, and that a new contact created by tenant A is always
 * stamped with tenant A's own tenant_id — even though the POST body no
 * longer carries tenant_id explicitly.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let pendingUpdate: Row | null = null
  let insertedRow: Row | null = null

  const rows = (): Row[] => {
    if (insertedRow) return [insertedRow]
    return (store[table] || []).filter((row) => matchesEq(row, eqs))
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    update: (values: Row) => {
      pendingUpdate = values
      return chain
    },
    insert: (payload: Row) => {
      const withId = { id: `${table}-new-${(store[table]?.length || 0) + 1}`, ...payload }
      store[table] = [...(store[table] || []), withId]
      insertedRow = withId
      return chain
    },
    single: () => {
      if (pendingUpdate) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).map((r) => (ids.has(r.id) ? { ...r, ...pendingUpdate } : r))
      }
      const r = rows()
      return Promise.resolve({ data: r[0] || null, error: r.length ? null : { message: 'not found' } })
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      if (pendingUpdate) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).map((r) => (ids.has(r.id) ? { ...r, ...pendingUpdate } : r))
        return resolve({ data: store[table].filter((r) => ids.has(r.id)), error: null })
      }
      return resolve({ data: rows(), error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenant }, error: null }),
}))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    clients: [
      { id: 'client-shared', tenant_id: 'tenant-A' },
    ],
    client_contacts: [
      { id: 'contact-A1', tenant_id: 'tenant-A', client_id: 'client-1', name: 'Alice', is_primary: false },
      { id: 'contact-B1', tenant_id: 'tenant-B', client_id: 'client-1', name: 'Bob', is_primary: false },
    ],
  }
})

function getContacts(tenantId: string, clientId: string) {
  currentTenant = tenantId
  return GET(new Request(`http://x/api/clients/${clientId}/contacts`), { params: Promise.resolve({ id: clientId }) })
}

function postContact(tenantId: string, clientId: string, body: Record<string, unknown>) {
  currentTenant = tenantId
  return POST(
    new Request(`http://x/api/clients/${clientId}/contacts`, { method: 'POST', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: clientId }) }
  )
}

describe('clients/[id]/contacts GET — tenantDb isolation', () => {
  it('tenant A only sees its own client_contacts row for a shared client_id, never tenant B\'s', async () => {
    const res = await getContacts('tenant-A', 'client-1')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.map((c: { id: string }) => c.id)).toEqual(['contact-A1'])
  })
})

describe('clients/[id]/contacts POST — tenantDb isolation', () => {
  it('creating a contact for a client owned by tenant A is 404 when tenant B tries the same client id', async () => {
    // client-shared belongs to tenant-A only
    const res = await postContact('tenant-B', 'client-shared', { phone: '5551234567' })
    expect(res.status).toBe(404)
  })

  it('a contact created by tenant A is stamped with tenant A\'s tenant_id, not caller-controlled', async () => {
    const res = await postContact('tenant-A', 'client-shared', { phone: '5551234567', name: 'New Contact' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.tenant_id).toBe('tenant-A')
    expect(body.client_id).toBe('client-shared')
  })
})
