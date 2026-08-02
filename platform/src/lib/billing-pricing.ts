/**
 * Full Loop platform pricing — what FullLoop charges a tenant business.
 * Flat, unlimited-usage pricing (decided 2026-08-02): $25,000 setup, paid
 * 100% upfront by bank wire, then $2,500/month flat — no seat metering.
 * Single source of truth for the proposal builder, the payment flow, and
 * the Accounts page. `adminMonthly`/`teamMemberMonthly` are kept only so
 * existing seat-count UI doesn't break; they no longer affect the price.
 */
export const PRICING = {
  setupFee: 25000, // one-time, 100% upfront, paid by bank wire
  monthlyFee: 2500, // flat, unlimited usage
  adminMonthly: 2500,
  teamMemberMonthly: 0,
} as const

export function computeMonthly(_admins?: number, _teamMembers?: number): number {
  return PRICING.monthlyFee
}
