import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Guardrail primitives: cooldown timing, and the code being scoped to
 * exactly the admin phone it was texted to (a stray "YES ABCD" from someone
 * else guessing a code must never approve or fire a real payout).
 */

const holdsTable = new Map<string, Record<string, unknown>>()
const runsTable: Record<string, unknown>[] = []

// vi.mock factories are hoisted above regular top-level consts — a mock
// assigned directly as an export value (not inside a nested closure) must
// be declared via vi.hoisted() or the factory sees it before initialization.
const { sendSMSMock, getAdminContactsMock } = vi.hoisted(() => ({
  sendSMSMock: vi.fn(async () => ({ ok: true })),
  getAdminContactsMock: vi.fn(async () => [{ email: null, phone: '+15550001111', name: 'Jeff', role: 'owner' }]),
}))

vi.mock('../sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('../admin-contacts', () => ({ getAdminContacts: getAdminContactsMock }))
vi.mock('../secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('./global-payouts', () => ({
  getStorageFinancialAccount: vi.fn(async () => ({ id: 'fa_1' })),
  executeGroups: vi.fn(async () => ({ paid: [{ bookingId: 'b1', teamMemberName: 'Extra One', amountCents: 8000 }], skipped: [] })),
}))
vi.mock('stripe', () => {
  class MockStripe {
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

vi.mock('../supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'global_payouts_runs') {
        return {
          // Real schema defaults created_at at the DB level (now()) — the mock
          // insert only receives what the app actually sends, so stamp it here.
          insert: (row: Record<string, unknown>) => { runsTable.push({ ...row, created_at: new Date().toISOString() }); return Promise.resolve({ data: null, error: null }) },
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: runsTable[runsTable.length - 1] || null, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'payout_holds') {
        return {
          insert: (row: Record<string, unknown>) => {
            const id = `hold_${holdsTable.size + 1}`
            holdsTable.set(id, { id, ...row })
            return Promise.resolve({ data: null, error: null })
          },
          select: () => ({
            eq: (col: string, val: unknown) => {
              const filters: Record<string, unknown> = { [col]: val }
              const builder = {
                eq: (c: string, v: unknown) => { filters[c] = v; return builder },
                in: (c: string, vals: unknown[]) => {
                  const match = Array.from(holdsTable.values()).find(h =>
                    Object.entries(filters).every(([k, v]) => h[k] === v) && vals.includes(h.status),
                  )
                  return { maybeSingle: async () => ({ data: match || null, error: null }) }
                },
              }
              return builder
            },
          }),
          update: (values: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              const row = Array.from(holdsTable.values()).find(h => h[col] === val)
              if (row) Object.assign(row, values)
              return Promise.resolve({ data: null, error: null })
            },
          }),
        }
      }
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'tenant_1', stripe_api_key: 'sk_x', telnyx_api_key: 'telnyx_x', telnyx_phone: '+15559990000', sms_from_number: null }, error: null }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { checkCooldown, logRun, createHoldAndNotify, handleApprovalReply, handleExecutionReply } from './global-payouts-guardrails'

const group = {
  teamMemberId: 'extra_1', name: 'Extra One', recipientId: 'acct_extra', phone: '+15551110002',
  smsConsent: true, preferredLanguage: 'en',
  items: [{ bookingId: 'b1', role: 'extra' as const, teamMemberId: 'extra_1', amountCents: 8000, tipCents: 0, clientName: 'Dana' }],
  totalCents: 8000,
}

beforeEach(() => {
  holdsTable.clear()
  runsTable.length = 0
  sendSMSMock.mockClear()
})

describe('checkCooldown', () => {
  it('is not on cooldown with no prior run', async () => {
    const result = await checkCooldown('tenant_1')
    expect(result.onCooldown).toBe(false)
  })

  it('is on cooldown immediately after logging a run', async () => {
    await logRun({ tenantId: 'tenant_1', totalCents: 100, paidCount: 1, heldCount: 0 })
    const result = await checkCooldown('tenant_1')
    expect(result.onCooldown).toBe(true)
    expect(result.secondsRemaining).toBeGreaterThan(0)
  })
})

describe('SMS approval flow', () => {
  it('a code only works for the exact admin phone it was sent to', async () => {
    const code = await createHoldAndNotify({ tenantId: 'tenant_1', kind: 'individual', group, reason: 'over threshold' })
    const wrongPhone = await handleApprovalReply('+19995550000', code)
    expect(wrongPhone).toBe(false)

    const rightPhone = await handleApprovalReply('+15550001111', code)
    expect(rightPhone).toBe(true)
  })

  it('GO before YES does not move money, only YES-then-GO does', async () => {
    const code = await createHoldAndNotify({ tenantId: 'tenant_1', kind: 'individual', group, reason: 'over threshold' })
    const { executeGroups } = await import('./global-payouts')

    await handleExecutionReply('+15550001111', code) // GO without prior YES
    expect(executeGroups).not.toHaveBeenCalled()

    await handleApprovalReply('+15550001111', code) // YES
    await handleExecutionReply('+15550001111', code) // GO
    expect(executeGroups).toHaveBeenCalledTimes(1)
  })
})
