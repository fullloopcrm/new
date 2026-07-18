import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/recurring-expenses had no length cap on label/category/notes and
 * no validation that amount_cents is a positive integer or frequency is a
 * known value. A negative amount_cents balances against itself in
 * ledger.ts's debit===credit check, so cron/recurring-expenses would post a
 * sign-flipped journal entry into the tenant's own books; an unknown
 * frequency silently falls into the cron's advance() +30-day default instead
 * of erroring at write time.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  let payload: Row = {}
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row) => { payload = p; return c },
    eq: () => c,
    order: () => c,
    single: async () => {
      const row = { ...payload }
      DB[table] = [...rowsOf(), row]
      return { data: row, error: null }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => Promise.resolve(res({ data: rowsOf(), error: null })),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'admin', tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

beforeEach(() => {
  DB.recurring_expenses = []
})

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('/api/recurring-expenses — input validation', () => {
  it('400s an oversized label, no row inserted', async () => {
    const res = await POST(postReq({ label: 'x'.repeat(201), amount_cents: 100, frequency: 'monthly' }))
    expect(res.status).toBe(400)
    expect(DB.recurring_expenses.length).toBe(0)
  })

  it('400s a negative amount_cents instead of posting a sign-flipped ledger entry', async () => {
    const res = await POST(postReq({ label: 'Rent', amount_cents: -100000, frequency: 'monthly' }))
    expect(res.status).toBe(400)
    expect(DB.recurring_expenses.length).toBe(0)
  })

  it('400s a non-integer amount_cents', async () => {
    const res = await POST(postReq({ label: 'Rent', amount_cents: 100.5, frequency: 'monthly' }))
    expect(res.status).toBe(400)
  })

  it('400s an unrecognized frequency instead of silently defaulting in the cron', async () => {
    const res = await POST(postReq({ label: 'Rent', amount_cents: 100000, frequency: 'fortnightly' }))
    expect(res.status).toBe(400)
    expect(DB.recurring_expenses.length).toBe(0)
  })

  it('400s an oversized notes field', async () => {
    const res = await POST(postReq({ label: 'Rent', amount_cents: 100000, frequency: 'monthly', notes: 'x'.repeat(2001) }))
    expect(res.status).toBe(400)
  })

  it('accepts a valid payload', async () => {
    const res = await POST(postReq({ label: 'Rent', amount_cents: 100000, frequency: 'monthly' }))
    expect(res.status).toBe(200)
    expect(DB.recurring_expenses.length).toBe(1)
  })
})
