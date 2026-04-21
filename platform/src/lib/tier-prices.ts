/**
 * Single source of truth for Full Loop signup tier pricing.
 * Both the admin approve endpoint and the Stripe webhook MUST derive pricing
 * from here — never from values stored on the prospects row — so a crafted
 * or corrupted prospect row can't seed a tenant with a zero monthly rate.
 */
export const TIER_PRICES: Record<string, { setup_cents: number; monthly_cents: number; label: string }> = {
  starter:    { setup_cents: 99900,  monthly_cents: 19900, label: 'Starter' },
  growth:     { setup_cents: 99900,  monthly_cents: 49900, label: 'Growth' },
  pro:        { setup_cents: 99900,  monthly_cents: 99900, label: 'Pro' },
  enterprise: { setup_cents: 199900, monthly_cents: 0,     label: 'Enterprise (custom)' },
}

export type Tier = keyof typeof TIER_PRICES
