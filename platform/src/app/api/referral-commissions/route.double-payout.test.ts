import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * PUT /api/referral-commissions used to unconditionally credit
 * referrers.total_paid whenever status was set to 'paid', with no check
 * that the commission wasn't already 'paid'. A double-click of "Mark Paid",
 * or a retried request after a slow/ambiguous response, credited total_paid
 * a second time for a commission only ever paid once — total_paid feeds
 * finance/tax-export and dashboard/finance/reports. Fix claims the
 * status transition atomically (UPDATE ... WHERE status != 'paid') and only
 * credits total_paid if the claim actually moved the row.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn(async () => {}),
  postCommissionPayment: vi.fn(async () => {}),
}))

const commissions: Record<string, { id: string; tenant_id: string; referrer_id: string; commission_cents: number; status: string }> = {
  'c-pending': { id: 'c-pending', tenant_id: 'tenant-1', referrer_id: 'ref-1', commission_cents: 1000, status: 'pending' },
}
const referrers: Record<string, { id: string; tenant_id: string; total_paid: number }> = {
  'ref-1': { id: 'ref-1', tenant_id: 'tenant-1', total_paid: 0 },
}

let referrerUpdateCalls = 0

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'referral_commissions') {
      return {
        update: (payload: Record<string, unknown>) => ({
          eq: (_c1: string, id: string) => ({
            eq: (_c2: string, _tenantId: string) => ({
              neq: (_c3: string, val: string) => ({
                select: () => ({
                  maybeSingle: async () => {
                    const row = commissions[id]
                    if (!row || row.status === val) return { data: null }
                    Object.assign(row, payload)
                    return { data: { ...row } }
                  },
                }),
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'referrers') {
      return {
        select: () => ({
          eq: (_c1: string, id: string) => ({
            eq: () => ({
              single: async () => ({ data: referrers[id] }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: (_c1: string, id: string) => ({
            eq: async () => {
              referrerUpdateCalls++
              Object.assign(referrers[id], payload)
              return { error: null }
            },
          }),
        }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { PUT } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/referral-commissions', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('PUT /api/referral-commissions — mark paid', () => {
  beforeEach(() => {
    referrerUpdateCalls = 0
    commissions['c-pending'].status = 'pending'
    referrers['ref-1'].total_paid = 0
  })

  it('credits total_paid once for a pending commission', async () => {
    const res = await PUT(makeRequest({ id: 'c-pending', status: 'paid' }))
    expect(res.status).toBe(200)
    expect(referrers['ref-1'].total_paid).toBe(1000)
    expect(referrerUpdateCalls).toBe(1)
  })

  it('rejects a second mark-paid on the same commission and does not double-credit', async () => {
    await PUT(makeRequest({ id: 'c-pending', status: 'paid' }))
    const res2 = await PUT(makeRequest({ id: 'c-pending', status: 'paid' }))
    const json2 = await res2.json()

    expect(res2.status).toBe(409)
    expect(json2.error).toMatch(/already marked paid/i)
    expect(referrers['ref-1'].total_paid).toBe(1000)
    expect(referrerUpdateCalls).toBe(1)
  })

  it('does not double-credit when two mark-paid calls race', async () => {
    const [r1, r2] = await Promise.all([
      PUT(makeRequest({ id: 'c-pending', status: 'paid' })),
      PUT(makeRequest({ id: 'c-pending', status: 'paid' })),
    ])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(referrers['ref-1'].total_paid).toBe(1000)
    expect(referrerUpdateCalls).toBe(1)
  })
})
