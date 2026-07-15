import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/finance/periods/[id] previously wrote locked_by/reopened_by
 * (audit-trail UUID columns) from a client-supplied `body.actor_id` — any
 * caller with finance.expenses could forge who locked/reopened a period,
 * and the real UI never even sends actor_id, so every lock was silently
 * recorded with a null actor. The actor must come from the authenticated
 * session (tenant.userId), not the request body.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const PERIOD_ID = 'period-1'
const REAL_MEMBER_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
const FORGED_ACTOR_ID = '00000000-0000-0000-0000-000000000099'

type Row = Record<string, any>
const store: Record<string, Row[]> = { accounting_periods: [] }

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        const idx = (store[table] || []).findIndex(match)
        if (idx === -1) return { data: null, error: { message: 'not found' } }
        store[table][idx] = { ...store[table][idx], ...payload }
        return { data: store[table][idx], error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

let sessionUserId = REAL_MEMBER_ID
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, userId: sessionUserId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: { tenantId: TENANT, userId: sessionUserId },
    error: null,
  }),
}))

import { PATCH } from '@/app/api/finance/periods/[id]/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/finance/periods/${PERIOD_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: PERIOD_ID })

describe('finance/periods/[id] actor attribution', () => {
  beforeEach(() => {
    store.accounting_periods = [{ id: PERIOD_ID, tenant_id: TENANT, status: 'open' }]
    sessionUserId = REAL_MEMBER_ID
  })

  it('ignores a client-supplied actor_id and stamps the authenticated session instead', async () => {
    const res = await PATCH(jsonReq({ status: 'locked', actor_id: FORGED_ACTOR_ID }), { params })
    expect(res.status).toBe(200)
    expect(store.accounting_periods[0].locked_by).toBe(REAL_MEMBER_ID)
    expect(store.accounting_periods[0].locked_by).not.toBe(FORGED_ACTOR_ID)
  })

  it('leaves locked_by null instead of writing a non-UUID session id (Clerk/admin paths)', async () => {
    sessionUserId = 'admin'
    const res = await PATCH(jsonReq({ status: 'locked', actor_id: FORGED_ACTOR_ID }), { params })
    expect(res.status).toBe(200)
    expect(store.accounting_periods[0].locked_by).toBeNull()
  })

  it('stamps reopened_by from the session on reopen, not the body', async () => {
    store.accounting_periods[0].status = 'locked'
    const res = await PATCH(jsonReq({ status: 'reopened', actor_id: FORGED_ACTOR_ID, reopened_reason: 'test' }), { params })
    expect(res.status).toBe(200)
    expect(store.accounting_periods[0].reopened_by).toBe(REAL_MEMBER_ID)
  })
})
