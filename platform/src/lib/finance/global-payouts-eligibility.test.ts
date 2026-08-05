import { describe, it, expect, vi } from 'vitest'

/**
 * Extras (multi-cleaner jobs) never had any pay computed anywhere in this
 * codebase before this file — the one thing that matters most here is that
 * an extra's pay is derived correctly from the lead's already-computed
 * amount (implied hours × the extra's own rate), not guessed or dropped.
 */

const bookingsData = [
  {
    // Lead paid $100 (10000 cents) at their $25/hr rate → implies 4 hours.
    id: 'book_1', team_member_id: 'lead_1', team_member_pay: 10000, pay_rate: 25, actual_hours: 4,
    clients: { name: 'Dana' },
    team_members: { global_payouts_recipient_id: 'acct_lead', name: 'Lead One', phone: '+1555', sms_consent: true, preferred_language: 'en', pay_rate: 25, hourly_rate: 25 },
  },
]

const extrasData = [
  // Extra earns their OWN $20/hr for the same 4 implied hours → $80, not $100 and not a 50/50 split of the lead's pay.
  { booking_id: 'book_1', team_member_id: 'extra_1', team_members: { global_payouts_recipient_id: 'acct_extra', name: 'Extra One', phone: '+1556', sms_consent: true, preferred_language: 'en', pay_rate: 20, hourly_rate: 20 } },
]

function bookingsChain() {
  const chain: Record<string, unknown> = {
    select: () => chain, eq: () => chain, or: () => chain, not: () => chain,
    order: () => Promise.resolve({ data: bookingsData, error: null }),
  }
  return chain
}

function extrasChain() {
  const chain: Record<string, unknown> = {
    select: () => chain, eq: () => chain,
    in: () => Promise.resolve({ data: extrasData, error: null }),
  }
  return chain
}

function paymentsChain() {
  const chain: Record<string, unknown> = { select: () => chain, eq: () => chain, in: () => Promise.resolve({ data: [], error: null }) }
  return chain
}

vi.mock('../supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'bookings') return bookingsChain()
      if (table === 'booking_team_members') return extrasChain()
      if (table === 'payments') return paymentsChain()
      throw new Error(`unexpected table in test: ${table}`)
    },
  },
}))

import { gatherGlobalPayoutsEligibility } from './global-payouts-eligibility'

describe('gatherGlobalPayoutsEligibility', () => {
  it('pays the lead their computed amount and the extra their OWN rate for the same implied hours', async () => {
    const groups = await gatherGlobalPayoutsEligibility('tenant_1')
    expect(groups).toHaveLength(2)

    const lead = groups.find(g => g.teamMemberId === 'lead_1')!
    const extra = groups.find(g => g.teamMemberId === 'extra_1')!

    expect(lead.totalCents).toBe(10000)
    // 4 implied hours (10000 cents / 100 / $25) × $20/hr = $80 = 8000 cents.
    expect(extra.totalCents).toBe(8000)
    expect(extra.recipientId).toBe('acct_extra')
    expect(extra.items[0].role).toBe('extra')
  })

  it('skips a team member (lead or extra) with no Global Payouts recipient on file', async () => {
    const original = extrasData[0].team_members.global_payouts_recipient_id
    extrasData[0].team_members.global_payouts_recipient_id = null as unknown as string
    const groups = await gatherGlobalPayoutsEligibility('tenant_1')
    expect(groups.find(g => g.teamMemberId === 'extra_1')).toBeUndefined()
    extrasData[0].team_members.global_payouts_recipient_id = original
  })
})
