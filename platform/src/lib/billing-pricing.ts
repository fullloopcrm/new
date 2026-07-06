/**
 * Full Loop platform pricing — what FullLoop charges a tenant business.
 * Single source of truth for the Sold/Proposed builder, the payment flow,
 * and the Accounts seat editor.
 */
export const PRICING = {
  setupFee: 25000, // one-time, paid by ACH (avoids ~$725 card fee)
  adminMonthly: 2500, // per admin seat / month
  teamMemberMonthly: 250, // per portal team member / month
} as const

export function computeMonthly(admins: number, teamMembers: number): number {
  return (admins || 0) * PRICING.adminMonthly + (teamMembers || 0) * PRICING.teamMemberMonthly
}
