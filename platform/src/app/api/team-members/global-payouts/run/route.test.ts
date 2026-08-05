import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Global Payouts run endpoint — now a thin orchestrator over
 * gatherGlobalPayoutsEligibility + the guardrails. What matters most here is
 * the guardrail BRANCHING, since the underlying pay/funding logic is already
 * covered by global-payouts.test.ts and global-payouts-eligibility.test.ts:
 *   1. Cooldown blocks the whole run with 429, moves nothing.
 *   2. A group over the per-person threshold is held, NOT paid; everyone
 *      else under threshold still gets paid in the same run.
 *   3. A run whose TOTAL exceeds the cap holds everything, pays nothing.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant_1' }, error: null }),
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('stripe', () => {
  class MockStripe {
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

function mkGroup(name: string, totalCents: number) {
  return {
    teamMemberId: name, name, recipientId: `acct_${name}`, phone: '+1555', smsConsent: true, preferredLanguage: 'en',
    items: [{ bookingId: `b_${name}`, role: 'lead' as const, teamMemberId: name, amountCents: totalCents, tipCents: 0, clientName: 'Someone' }],
    totalCents,
  }
}

// vi.mock factories are hoisted above regular top-level consts, so mocks the
// factories reference must be declared via vi.hoisted() to exist in time.
const {
  checkCooldownMock, logRunMock, createHoldAndNotifyMock,
  getStorageFinancialAccountMock, ensureFinancialAccountFundedMock, executeGroupsMock,
  gatherMock,
} = vi.hoisted(() => ({
  checkCooldownMock: vi.fn(async () => ({ onCooldown: false, secondsRemaining: 0 })),
  logRunMock: vi.fn(async () => {}),
  createHoldAndNotifyMock: vi.fn(async (opts: { group: { name: string } }) => `CODE_${opts.group.name}`),
  getStorageFinancialAccountMock: vi.fn(async () => ({ id: 'fa_1' })),
  ensureFinancialAccountFundedMock: vi.fn(async () => ({ toppedUpCents: 0, stripeTopUpId: null })),
  executeGroupsMock: vi.fn(async (_t: unknown, _s: unknown, _k: unknown, _f: unknown, groups: { name: string; totalCents: number }[]) => ({
    paid: groups.map(g => ({ bookingId: 'b', teamMemberName: g.name, amountCents: g.totalCents })),
    skipped: [],
  })),
  gatherMock: vi.fn(async () => [] as ReturnType<typeof mkGroup>[]),
}))

vi.mock('@/lib/finance/global-payouts-guardrails', () => ({
  RUN_CAP_CENTS: 250000,
  INDIVIDUAL_HOLD_CENTS: 45000,
  checkCooldown: checkCooldownMock,
  logRun: logRunMock,
  createHoldAndNotify: createHoldAndNotifyMock,
}))

vi.mock('@/lib/finance/global-payouts', () => ({
  getStorageFinancialAccount: getStorageFinancialAccountMock,
  ensureFinancialAccountFunded: ensureFinancialAccountFundedMock,
  executeGroups: executeGroupsMock,
}))

vi.mock('@/lib/finance/global-payouts-eligibility', () => ({
  gatherGlobalPayoutsEligibility: gatherMock,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'tenant_1', stripe_api_key: 'sk_x', telnyx_api_key: null, telnyx_phone: null, sms_from_number: null }, error: null }) }) }),
    }),
  },
}))

import { POST } from './route'

beforeEach(() => {
  checkCooldownMock.mockClear().mockResolvedValue({ onCooldown: false, secondsRemaining: 0 })
  createHoldAndNotifyMock.mockClear()
  executeGroupsMock.mockClear()
  logRunMock.mockClear()
  gatherMock.mockReset()
})

describe('POST /api/team-members/global-payouts/run — guardrails', () => {
  it('blocks the whole run on cooldown, moves nothing', async () => {
    checkCooldownMock.mockResolvedValueOnce({ onCooldown: true, secondsRemaining: 120 })
    gatherMock.mockResolvedValueOnce([mkGroup('A', 5000)])

    const res = await POST()
    expect(res.status).toBe(429)
    expect(executeGroupsMock).not.toHaveBeenCalled()
  })

  it('holds a person over the $450 threshold, still pays everyone under it', async () => {
    gatherMock.mockResolvedValueOnce([mkGroup('Under', 10000), mkGroup('Over', 50000)]) // $100, $500 — total $600, under the $2500 cap

    const res = await POST()
    const body = await res.json()

    expect(body.held).toHaveLength(1)
    expect(body.held[0].teamMemberName).toBe('Over')
    expect(executeGroupsMock).toHaveBeenCalledTimes(1)
    const [, , , , paidGroups] = executeGroupsMock.mock.calls[0]
    expect((paidGroups as { name: string }[]).map(g => g.name)).toEqual(['Under'])
  })

  it('holds EVERYONE and pays nothing when the run total exceeds the $2500 cap, even though no single person is over the $450 threshold', async () => {
    // 7 × $400 (40000 cents) = $2800 > $2500 cap. Each one, alone, is under
    // the $450 individual threshold — isolates the run-cap branch from the
    // individual-hold branch tested above.
    gatherMock.mockResolvedValueOnce(Array.from({ length: 7 }, (_, i) => mkGroup(`Person${i}`, 40000)))

    const res = await POST()
    const body = await res.json()

    expect(body.held).toHaveLength(7)
    expect(body.paid).toEqual([])
    expect(executeGroupsMock).not.toHaveBeenCalled()
  })
})
