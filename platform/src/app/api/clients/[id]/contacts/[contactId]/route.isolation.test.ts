import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — clients/[id]/contacts/[contactId]/route.ts.
 * Proves a forged cross-tenant contactId can't be edited or deleted by an
 * acting tenant that doesn't own it.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>, neqs: Record<string, unknown>): boolean {
  return (
    Object.entries(eqs).every(([k, v]) => row[k] === v) &&
    Object.entries(neqs).every(([k, v]) => row[k] !== v)
  )
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const neqs: Record<string, unknown> = {}
  let pendingUpdate: Row | null = null
  let deleting = false

  const rows = (): Row[] => (store[table] || []).filter((row) => matchesEq(row, eqs, neqs))

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    neq: (col: string, val: unknown) => {
      neqs[col] = val
      return chain
    },
    update: (values: Row) => {
      pendingUpdate = values
      return chain
    },
    delete: () => {
      deleting = true
      return chain
    },
    single: () => {
      if (pendingUpdate) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).map((r) => (ids.has(r.id) ? { ...r, ...pendingUpdate } : r))
        const updated = store[table].filter((r) => ids.has(r.id))
        return Promise.resolve({ data: updated[0] || null, error: updated.length ? null : { message: 'not found' } })
      }
      const r = rows()
      return Promise.resolve({ data: r[0] || null, error: r.length ? null : { message: 'not found' } })
    },
    then: (resolve: (v: { data: Row[] | null; error: null }) => unknown) => {
      if (deleting) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).filter((r) => !ids.has(r.id))
        return resolve({ data: null, error: null })
      }
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

import { PUT, DELETE } from './route'

beforeEach(() => {
  store = {
    client_contacts: [
      { id: 'contact-A1', tenant_id: 'tenant-A', client_id: 'client-1', name: 'Alice', is_primary: false },
      { id: 'contact-B1', tenant_id: 'tenant-B', client_id: 'client-1', name: 'Bob', is_primary: false },
    ],
  }
})

function put(tenantId: string, clientId: string, contactId: string, body: Record<string, unknown>) {
  currentTenant = tenantId
  return PUT(
    new Request(`http://x/api/clients/${clientId}/contacts/${contactId}`, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: clientId, contactId }) }
  )
}

function del(tenantId: string, clientId: string, contactId: string) {
  currentTenant = tenantId
  return DELETE(
    new Request(`http://x/api/clients/${clientId}/contacts/${contactId}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id: clientId, contactId }) }
  )
}

describe('clients/[id]/contacts/[contactId] PUT — tenantDb isolation', () => {
  it('tenant A cannot edit tenant B\'s contact via a forged contactId', async () => {
    const res = await put('tenant-A', 'client-1', 'contact-B1', { name: 'Hacked' })
    expect(res.status).toBe(500)

    const tenantBRow = store.client_contacts.find((r) => r.id === 'contact-B1')
    expect(tenantBRow?.name).toBe('Bob')
  })

  it('tenant A CAN edit its own contact', async () => {
    const res = await put('tenant-A', 'client-1', 'contact-A1', { name: 'Alice Updated' })
    expect(res.status).toBe(200)

    const tenantARow = store.client_contacts.find((r) => r.id === 'contact-A1')
    expect(tenantARow?.name).toBe('Alice Updated')
  })
})

describe('clients/[id]/contacts/[contactId] DELETE — tenantDb isolation', () => {
  it('tenant A cannot delete tenant B\'s contact via a forged contactId', async () => {
    const res = await del('tenant-A', 'client-1', 'contact-B1')
    expect(res.status).toBe(200)

    const tenantBRow = store.client_contacts.find((r) => r.id === 'contact-B1')
    expect(tenantBRow).toBeTruthy()
  })

  it('tenant B CAN delete its own contact', async () => {
    const res = await del('tenant-B', 'client-1', 'contact-B1')
    expect(res.status).toBe(200)

    const tenantBRow = store.client_contacts.find((r) => r.id === 'contact-B1')
    expect(tenantBRow).toBeUndefined()
  })
})
