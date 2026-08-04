/**
 * Full Loop signup pricing, derived from the single source of truth
 * (billing-pricing.ts): a flat $2,500/mo, unlimited admins/team members, plus
 * a $25,000 one-time setup fee (paid by bank wire, not through Stripe).
 * admins/teamMembers here are headcount tracking only — they no longer change
 * the price — but are still clamped so the recorded counts stay sane.
 *
 * Both the admin approve endpoint and the Stripe webhook derive pricing from here —
 * never from values stored on the prospect row — so a crafted or corrupted prospect
 * row can't seed a tenant with a $0 monthly rate. A signup is always the flat
 * $2,500/mo, regardless of headcount.
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
 * Flat signup pricing in cents (Stripe works in cents). admins/teamMembers are
 * clamped for sane headcount tracking but no longer affect monthly_cents.
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
