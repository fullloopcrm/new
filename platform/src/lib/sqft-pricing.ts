// Lawn-care / landscaping sqft-tier pricing.
//
// service_types.pricing_model = 'sqft_tiered' carries an ordered list of
// {max_sqft, price_cents} tiers in service_types.sqft_tiers (jsonb). Ascending
// by max_sqft; a trailing {max_sqft: null} tier is the uncapped catch-all for
// anything larger than the last bounded tier. See
// migrations/2026_07_16_sqft_tier_pricing.sql for the schema + rationale.

export interface SqftTier {
  max_sqft: number | null
  price_cents: number
}

// Validates a raw (client-supplied) sqft_tiers payload before it's persisted.
// Returns the normalized tiers, or an error message — never both.
export function validateSqftTiers(input: unknown): { tiers: SqftTier[] | null; error: string | null } {
  if (input === null || input === undefined) return { tiers: null, error: null }
  if (!Array.isArray(input)) return { tiers: null, error: 'sqft_tiers must be an array' }
  if (input.length === 0) return { tiers: null, error: null }
  if (input.length > 20) return { tiers: null, error: 'sqft_tiers supports at most 20 tiers' }

  const tiers: SqftTier[] = []
  let prevMax = 0
  for (let i = 0; i < input.length; i++) {
    const row = input[i] as Record<string, unknown>
    if (!row || typeof row !== 'object') return { tiers: null, error: `sqft_tiers[${i}] must be an object` }

    const priceCents = Number(row.price_cents)
    if (!Number.isFinite(priceCents) || priceCents < 0 || !Number.isInteger(priceCents)) {
      return { tiers: null, error: `sqft_tiers[${i}].price_cents must be a non-negative integer (cents)` }
    }

    const isLast = i === input.length - 1
    if (row.max_sqft === null) {
      if (!isLast) return { tiers: null, error: `sqft_tiers[${i}].max_sqft can only be null on the last (catch-all) tier` }
      tiers.push({ max_sqft: null, price_cents: priceCents })
      continue
    }

    const maxSqft = Number(row.max_sqft)
    if (!Number.isFinite(maxSqft) || maxSqft <= 0 || !Number.isInteger(maxSqft)) {
      return { tiers: null, error: `sqft_tiers[${i}].max_sqft must be a positive integer or null` }
    }
    if (maxSqft <= prevMax) {
      return { tiers: null, error: `sqft_tiers[${i}].max_sqft must be greater than the previous tier's max_sqft` }
    }
    prevMax = maxSqft
    tiers.push({ max_sqft: maxSqft, price_cents: priceCents })
  }

  return { tiers, error: null }
}

// Resolves the price for a given lot size against a tenant's configured
// tiers. Returns null when there's nothing to resolve against — no tiers
// configured, or the property's sqft isn't on file yet — so callers can fall
// back to whatever price they'd otherwise use (e.g. a flat default) rather
// than silently charging $0.
export function resolveSqftTierPriceCents(
  tiers: SqftTier[] | null | undefined,
  sqft: number | null | undefined
): number | null {
  if (!tiers || tiers.length === 0) return null
  if (sqft == null || !Number.isFinite(sqft) || sqft <= 0) return null

  for (const tier of tiers) {
    if (tier.max_sqft === null || sqft <= tier.max_sqft) return tier.price_cents
  }
  // Every valid (validateSqftTiers-passed) list either has a catch-all tier or
  // the loop above already matched when sqft <= the last bounded tier's max —
  // reaching here means sqft exceeds every bounded tier with no catch-all.
  // Charge the top tier's price rather than returning no price at all.
  return tiers[tiers.length - 1].price_cents
}
