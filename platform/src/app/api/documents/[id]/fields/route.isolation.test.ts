import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * signer_id cross-tenant FK probe — documents/[id]/fields/route.ts.
 * POST/PUT took signer_id straight from the request body and inserted it
 * unvalidated. A caller could point a field at another tenant's
 * document_signers row, creating a dangling cross-tenant FK whose raw id
 * then surfaces to this document's own signers via the public token
 * endpoint's fields[].signer_id. Proves a foreign/non-existent signer_id is
 * now rejected with 400 on both POST and PUT, and a real signer_id for this
 * document still succeeds.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>, ins: Record<string, unknown[]>) {
  const eqOk = Object.entries(eqs).every(([k, v]) => row[k] === v)
  const inOk = Object.entries(ins).every(([k, vals]) => vals.includes(row[k]))
  return eqOk && inOk
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const ins: Record<string, unknown[]> = {}
  let insertedRows: Row[] | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      ins[col] = vals
      return chain
    },
    order: () => chain,
    delete: () => {
      store[table] = (store[table] || []).filter((r) => !matches(r, eqs, ins))
      return chain
    },
    insert: (rows: Row | Row[]) => {
      const arr = Array.isArray(rows) ? rows : [rows]
      insertedRows = arr.map((r, i) => ({ id: `new-${(store[table] || []).length + i + 1}`, ...r }))
      store[table] = [...(store[table] || []), ...insertedRows]
      return chain
    },
    single: async () => ({ data: insertedRows ? insertedRows[0] : (store[table] || []).find((r) => matches(r, eqs, ins)) || null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (store[table] || []).filter((r) => matches(r, eqs, ins)), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentTenant: string

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenant }, error: null }),
}))

import { POST, PUT } from './route'

beforeEach(() => {
  store = {
    documents: [
      { id: 'doc-a', tenant_id: 'tenant-A', status: 'draft' },
    ],
    document_signers: [
      { id: 'signer-a', tenant_id: 'tenant-A', document_id: 'doc-a', name: 'Alex A' },
      { id: 'signer-b', tenant_id: 'tenant-B', document_id: 'doc-b', name: 'Bailey B' },
    ],
    document_fields: [],
  }
  currentTenant = 'tenant-A'
})

const params = Promise.resolve({ id: 'doc-a' })

describe('documents/[id]/fields POST — signer_id ownership', () => {
  it('rejects a foreign tenant\'s signer_id', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ signer_id: 'signer-b', type: 'text', page: 1, x_pct: 1, y_pct: 1, w_pct: 1, h_pct: 1 }),
    })
    const res = await POST(req, { params })
    expect(res.status).toBe(400)
    expect(store.document_fields.length).toBe(0)
  })

  it('accepts a signer_id that belongs to this document', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ signer_id: 'signer-a', type: 'text', page: 1, x_pct: 1, y_pct: 1, w_pct: 1, h_pct: 1 }),
    })
    const res = await POST(req, { params })
    expect(res.status).toBe(200)
    expect(store.document_fields.length).toBe(1)
  })
})

describe('documents/[id]/fields PUT — signer_id ownership', () => {
  it('rejects a batch containing a foreign tenant\'s signer_id and writes nothing', async () => {
    const req = new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({
        fields: [
          { signer_id: 'signer-a', type: 'text', page: 1, x_pct: 1, y_pct: 1, w_pct: 1, h_pct: 1 },
          { signer_id: 'signer-b', type: 'text', page: 1, x_pct: 2, y_pct: 2, w_pct: 1, h_pct: 1 },
        ],
      }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
    expect(store.document_fields.length).toBe(0)
  })
})
