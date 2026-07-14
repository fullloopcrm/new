import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 referral-flow HAPPY-PATH lock: referral create → attribution → commission.
 *
 * The referral revenue-share path spans two endpoints and had no positive
 * coverage:
 *
 *   • CREATE       — POST /api/referrals persists a `referrals` row for the
 *                    tenant and mints a referral_code.
 *   • ATTRIBUTION  — a booking carries `referrer_id` (the referrer who sent the
 *                    client); the commission POST reads that booking + referrer
 *                    tenant-scoped.
 *   • COMMISSION   — POST /api/referral-commissions computes commission =
 *                    round(gross_price × rate), persists a tenant-scoped
 *                    `referral_commissions` row in status 'pending', bumps the
 *                    referrer's total_earned, and posts the accrual to the ledger.
 *
 * This asserts the INSERT/UPDATE payloads (not just HTTP 200), so a regression
 * that drops tenant_id, miscomputes the commission, or skips the accrual is
 * caught.
 *
 * WHAT IS REAL vs MOCKED
 * ----------------------
 * REAL: the route handlers, the commission math, and `validate` (pure input
 * validation for the create path). MOCKED: the DB (chainable supabase builder —
 * repo convention), tenant resolution, audit, the notify side effect, and the
 * ledger post (asserted-called, not executed).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const REFERRER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
const COMMISSION_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const REFERRAL_ROW_ID = '99999999-9999-9999-9999-999999999999'

const GROSS_CENTS = 20000 // $200.00 booking
const RATE = 0.15 // 15%
const EXPECTED_COMMISSION = Math.round(GROSS_CENTS * RATE) // 3000 = $30.00
const REFERRER_TOTAL_EARNED = 5000 // pre-existing earnings, cents

// ── DB mock: chainable builder recording inserts, reads, and updates ──────────
type Row = Record<string, unknown>
const inserts: Array<{ table: string; payload: Row }> = []
const reads: Array<{ table: string; eqs: Row }> = []
const updates: Array<{ table: string; payload: Row; eqs: Row }> = []

// Toggle: does a commission already exist for the booking? (idempotency test)
let commissionExists = false

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      single: async () => {
        if (kind === 'insert') {
          inserts.push({ table, payload })
          const id = table === 'referral_commissions' ? COMMISSION_ID : REFERRAL_ROW_ID
          return { data: { id, ...payload }, error: null }
        }
        reads.push({ table, eqs: { ...eqs } })
        if (table === 'bookings') {
          return {
            data: {
              id: BOOKING_ID,
              price: GROSS_CENTS,
              referrer_id: REFERRER_ID,
              clients: { name: 'Referred Client', email: 'client@x.test' },
            },
            error: null,
          }
        }
        if (table === 'referrers') {
          return {
            data: {
              id: REFERRER_ID,
              name: 'Rex Referrer',
              email: 'rex@x.test',
              commission_rate: RATE,
              total_earned: REFERRER_TOTAL_EARNED,
            },
            error: null,
          }
        }
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        reads.push({ table, eqs: { ...eqs } })
        if (table === 'referral_commissions') {
          return { data: commissionExists ? { id: COMMISSION_ID } : null, error: null }
        }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'update') updates.push({ table, payload, eqs: { ...eqs } })
        else reads.push({ table, eqs: { ...eqs } })
        return res({ data: null, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  // role: 'owner' — POST /api/referrals now gates on requirePermission('referrals.create'),
  // which needs a real role to resolve; this suite exercises a legitimate caller.
  getTenantForRequest: async () => ({ tenantId: TENANT, role: 'owner', tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))

const postCommissionAccrual = vi.fn(async (_o: unknown) => ({ ok: true }))
const postCommissionPayment = vi.fn(async (_o: unknown) => ({ ok: true }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: (o: unknown) => postCommissionAccrual(o as never),
  postCommissionPayment: (o: unknown) => postCommissionPayment(o as never),
}))

import { POST as CREATE_REFERRAL } from '@/app/api/referrals/route'
import { POST as CREATE_COMMISSION } from '@/app/api/referral-commissions/route'
import { audit } from '@/lib/audit'

function jsonReq(url: string, body: Row): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('referral flow — happy path (create → attribution → commission)', () => {
  beforeEach(() => {
    inserts.length = 0
    reads.length = 0
    updates.length = 0
    commissionExists = false
    postCommissionAccrual.mockClear()
    postCommissionPayment.mockClear()
    ;(audit as unknown as ReturnType<typeof vi.fn>).mockClear()
  })

  it('CREATE: persists a referral tenant-scoped with a minted code and audits it', async () => {
    const res = await CREATE_REFERRAL(
      jsonReq('https://canary.example.com/api/referrals', {
        name: 'Rex Referrer',
        email: 'rex@x.test',
        code: 'REX15',
        commission_rate: 0.15,
      }),
    )

    expect(res.status).toBe(201)

    const refInserts = inserts.filter((i) => i.table === 'referrals')
    expect(refInserts).toHaveLength(1)
    const row = refInserts[0].payload
    expect(row.tenant_id).toBe(TENANT) // load-bearing tenant scope
    expect(row.name).toBe('Rex Referrer')
    expect(row.referral_code).toBe('REX15') // supplied code adopted verbatim
    expect(row.code).toBeUndefined() // raw `code` field is stripped

    expect(audit).toHaveBeenCalledTimes(1)
    const auditArg = (audit as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as Row
    expect(auditArg.tenantId).toBe(TENANT)
    expect(auditArg.action).toBe('referral.created')
  })

  it('COMMISSION: computes round(gross×rate), persists it pending & tenant-scoped, bumps total_earned, accrues to ledger', async () => {
    const res = await CREATE_COMMISSION(
      jsonReq('https://canary.example.com/api/referral-commissions', { booking_id: BOOKING_ID }),
    )

    expect(res.status).toBe(200)
    const json = (await res.json()) as { commission: Row; message: string }

    // 1. Attribution reads were tenant-scoped: the booking and the referrer.
    const bookingRead = reads.find((r) => r.table === 'bookings')
    expect(bookingRead?.eqs.tenant_id).toBe(TENANT)
    expect(bookingRead?.eqs.id).toBe(BOOKING_ID)
    const referrerRead = reads.find((r) => r.table === 'referrers' && r.eqs.id === REFERRER_ID)
    expect(referrerRead?.eqs.tenant_id).toBe(TENANT)

    // 2. Exactly one commission row inserted — correct math, state, and scope.
    const commInserts = inserts.filter((i) => i.table === 'referral_commissions')
    expect(commInserts).toHaveLength(1)
    const comm = commInserts[0].payload
    expect(comm.tenant_id).toBe(TENANT)
    expect(comm.booking_id).toBe(BOOKING_ID)
    expect(comm.referrer_id).toBe(REFERRER_ID)
    expect(comm.gross_amount_cents).toBe(GROSS_CENTS)
    expect(comm.commission_rate).toBe(RATE)
    expect(comm.commission_cents).toBe(EXPECTED_COMMISSION) // 3000
    expect(comm.status).toBe('pending')

    // 3. Referrer's running total_earned bumped by exactly the new commission, tenant-scoped.
    const refUpdate = updates.find((u) => u.table === 'referrers')
    expect(refUpdate?.payload.total_earned).toBe(REFERRER_TOTAL_EARNED + EXPECTED_COMMISSION)
    expect(refUpdate?.eqs.id).toBe(REFERRER_ID)
    expect(refUpdate?.eqs.tenant_id).toBe(TENANT)

    // 4. The accrual was posted to the ledger for this commission (attribution → books).
    expect(postCommissionAccrual).toHaveBeenCalledTimes(1)
    expect(postCommissionAccrual.mock.calls[0][0]).toMatchObject({ tenantId: TENANT, commissionId: COMMISSION_ID })

    // 5. Response echoes the created commission and a human dollar amount.
    expect(json.commission.commission_cents).toBe(EXPECTED_COMMISSION)
    expect(json.message).toContain('$30.00')
  })

  it('COMMISSION: idempotent — a booking that already has a commission returns 409 and inserts nothing', async () => {
    commissionExists = true

    const res = await CREATE_COMMISSION(
      jsonReq('https://canary.example.com/api/referral-commissions', { booking_id: BOOKING_ID }),
    )

    expect(res.status).toBe(409)
    expect(inserts.filter((i) => i.table === 'referral_commissions')).toHaveLength(0)
    expect(postCommissionAccrual).not.toHaveBeenCalled()
  })
})
