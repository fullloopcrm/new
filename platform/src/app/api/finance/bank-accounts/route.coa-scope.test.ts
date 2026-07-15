import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/finance/bank-accounts and PATCH /api/finance/bank-accounts/[id]
 * previously wrote `coa_id` verbatim with no check that the chart_of_accounts
 * row belongs to the authenticated tenant. bank-transactions/[id],
 * receipts/attach, and bank-transactions/[id]/match all trust a bank
 * account's coa_id as an already-validated journal-entry side (they only
 * validate the OTHER, caller-supplied coa_id) -- so a foreign coa_id here
 * would post real journal lines against another tenant's chart of accounts,
 * which then joins straight into this tenant's own trial balance / general
 * ledger via `chart_of_accounts!inner(...)` (no tenant filter on that join).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_COA = 'coa-own-1'
const FOREIGN_COA = 'coa-foreign-1'
const ACCOUNT_ID = 'bank-acct-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = { bank_accounts: [], chart_of_accounts: [] }
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      maybeSingle: async () => {
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        if (kind === 'update') {
          const idx = (store[table] || []).findIndex(match)
          if (idx === -1) return { data: null, error: { message: 'not found' } }
          store[table][idx] = { ...store[table][idx], ...(payload as Row) }
          return { data: store[table][idx], error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/entity', () => ({
  entityIdFromUrl: () => null,
  getDefaultEntityId: async () => null,
  isEntityOwnedByTenant: async () => true,
}))

import { POST as CREATE } from '@/app/api/finance/bank-accounts/route'
import { PATCH as UPDATE } from '@/app/api/finance/bank-accounts/[id]/route'

function jsonReq(url: string, method: string, body: Row): Request {
  return new Request(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

const params = Promise.resolve({ id: ACCOUNT_ID })

describe('bank-accounts coa_id tenant scoping', () => {
  beforeEach(() => {
    store.bank_accounts = [{ id: ACCOUNT_ID, tenant_id: TENANT, name: 'Checking', coa_id: OWN_COA }]
    store.chart_of_accounts = [
      { id: OWN_COA, tenant_id: TENANT, code: '1010', name: 'Operating Checking' },
      { id: FOREIGN_COA, tenant_id: OTHER_TENANT, code: '1010', name: 'Foreign Checking' },
    ]
    idSeq = 0
  })

  it('POST rejects a coa_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq('http://t.test/api/finance/bank-accounts', 'POST', { name: 'Savings', coa_id: FOREIGN_COA }))
    expect(res.status).toBe(400)
    expect(store.bank_accounts.length).toBe(1)
  })

  it('POST accepts a coa_id belonging to the authenticated tenant', async () => {
    const res = await CREATE(jsonReq('http://t.test/api/finance/bank-accounts', 'POST', { name: 'Savings', coa_id: OWN_COA }))
    expect(res.status).toBe(200)
  })

  it('PATCH rejects re-pointing coa_id at another tenant', async () => {
    const res = await UPDATE(jsonReq(`http://t.test/api/finance/bank-accounts/${ACCOUNT_ID}`, 'PATCH', { coa_id: FOREIGN_COA }), { params })
    expect(res.status).toBe(400)
    expect(store.bank_accounts[0].coa_id).toBe(OWN_COA)
  })

  it('PATCH allows other field edits without a coa_id', async () => {
    const res = await UPDATE(jsonReq(`http://t.test/api/finance/bank-accounts/${ACCOUNT_ID}`, 'PATCH', { name: 'Renamed' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.bank_account.name).toBe('Renamed')
  })
})
