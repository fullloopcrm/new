// Admin-set booking discount + one-time credit, ported from nycmaid's
// lib/discount.ts (commit 6ec48424). fullloopcrm's discount UI is
// percent-only (no dollar-amount discount type), so applyDiscount here takes
// a bare percent rather than nycmaid's discountType/discountValue pair.
//
// Shared by every money-calc path that needs to reproduce the price a
// booking's form/checkout screen shows: BookingsAdmin.tsx, payment-processor,
// the Stripe webhook, team-portal checkout/15min-alert, and the closeout
// summary. Centralizing this stops each call site re-deriving its own
// (previously buggy, previously divergent) inline discount math.

export function applyDiscount(baseCents: number, discountPercent: number | null | undefined): number {
  if (!discountPercent || discountPercent <= 0) return baseCents
  const discounted = baseCents * (1 - discountPercent / 100)
  return Math.max(0, Math.floor(discounted / 500) * 500) // round down to nearest $5, matches existing quote behavior
}

// Shared display label so every UI/email/finance surface describes a
// discount the same way instead of re-deriving it from a price ratio.
export function describeDiscount(discountPercent: number | null | undefined): string | null {
  if (!discountPercent || discountPercent <= 0) return null
  return `${discountPercent}% off`
}

// A one-time flat credit (e.g. service-recovery comp) applied AFTER the
// regular discount, on top of it — stacks rather than replaces. Manual,
// per-booking only; never copied onto recurring_schedules or future occurrences.
export function applyCredit(cents: number, creditCents: number | null | undefined): number {
  if (!creditCents || creditCents <= 0) return cents
  return Math.max(0, cents - creditCents)
}
