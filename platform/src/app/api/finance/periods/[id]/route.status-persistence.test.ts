import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The `accounting_periods.status` CHECK constraint declares 'reopened' as its
 * own value (migration 035_close_audit.sql), and the close page's own type +
 * STATUS_COLORS map a distinct blue badge to it — but PATCH used to collapse
 * a 'reopened' request straight back to status:'open', so the literal string
 * 'reopened' was never actually persisted and that badge could never render.
 * A period that was locked-then-reopened was indistinguishable from a period
 * that was never touched. Also covers the sibling `notes` field, which the
 * route has always accepted but nothing ever exercised.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const PERIOD_ID = 'period-1'
const REAL_MEMBER_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'

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

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, userId: REAL_MEMBER_ID }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: { tenantId: TENANT, userId: REAL_MEMBER_ID },
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

describe('finance/periods/[id] status + notes persistence', () => {
  beforeEach(() => {
    store.accounting_periods = [{ id: PERIOD_ID, tenant_id: TENANT, status: 'locked' }]
  })

  it('persists the literal reopened status instead of collapsing it to open', async () => {
    const res = await PATCH(jsonReq({ status: 'reopened', reopened_reason: 'wrong bank recon' }), { params })
    expect(res.status).toBe(200)
    expect(store.accounting_periods[0].status).toBe('reopened')
    expect(store.accounting_periods[0].reopened_reason).toBe('wrong bank recon')
  })

  it('still allows an explicit open request to set plain open', async () => {
    const res = await PATCH(jsonReq({ status: 'open' }), { params })
    expect(res.status).toBe(200)
    expect(store.accounting_periods[0].status).toBe('open')
  })

  it('saves notes independent of status', async () => {
    const res = await PATCH(jsonReq({ notes: 'flagged for review next month' }), { params })
    expect(res.status).toBe(200)
    expect(store.accounting_periods[0].notes).toBe('flagged for review next month')
    expect(store.accounting_periods[0].status).toBe('locked')
  })
})
