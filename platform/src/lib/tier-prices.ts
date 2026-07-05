/**
 * Full Loop signup pricing — seat-based, derived from the single source of truth
 * (billing-pricing.ts): $1,000/admin/mo + $100/field-portal team member/mo, plus a
 * $25,000 one-time setup fee.
 *
 * Both the admin approve endpoint and the Stripe webhook derive pricing from here —
 * never from values stored on the prospect row — so a crafted or corrupted prospect
 * row can't seed a tenant with a $0 monthly rate. A signup is always at least 1 admin
 * ($1,000/mo).
 */
import { PRICING, computeMonthly } from './billing-pricing'

export type SignupPricing = {
  setup_cents: number
  monthly_cents: number
  admins: number
  teamMembers: number
  label: string
}

/**
 * Seat-based signup pricing in cents (Stripe works in cents). Clamps to a minimum
 * of 1 admin so a self-serve checkout can never resolve to $0/mo.
 */
export function signupPricing(seats?: { admins?: number; teamMembers?: number }): SignupPricing {
  const admins = Math.max(1, Math.floor(seats?.admins ?? 1))
  const teamMembers = Math.max(0, Math.floor(seats?.teamMembers ?? 0))
  return {
    setup_cents: PRICING.setupFee * 100,
    monthly_cents: computeMonthly(admins, teamMembers) * 100,
    admins,
    teamMembers,
    label: 'Full Loop',
  }
}
