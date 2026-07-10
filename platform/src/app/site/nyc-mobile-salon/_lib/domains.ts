export const ALL_DOMAINS = [
  'thenycmobilesalon.com',
]

// Set for fast lookup — includes both bare and www. variants
export const OWNED_DOMAINS = new Set(
  ALL_DOMAINS.flatMap(d => [d, `www.${d}`])
)
