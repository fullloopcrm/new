// ---------------------------------------------------------------------------
// Commercial-intent classifier — how much is a query actually worth?
//
// Impressions alone are a bad value signal: "how to unclog a drain" and
// "emergency plumber near me" can have the same impressions but wildly different
// value. This tags each query by buying intent so the engine prioritizes money
// keywords over informational ones.
//
// Heuristic v1 (fast, free, deterministic). A Claude-scored pass and the CRM
// conversion join (value = query -> lead/job -> $) come later.
// ---------------------------------------------------------------------------
export type Commercial = 'transactional' | 'commercial' | 'informational'

// Ready-to-buy / ready-to-hire signals.
const TRANSACTIONAL_RE =
  /\b(near\s?me|hire|book|booking|emergency|same[-\s]?day|24\s?\/?\s?7|quote|cost|costs|price|pricing|rates?|cheap|affordable|best|top|company|companies|contractor|professional|licensed|service|services|repair|installation|install|removal|replacement|estimate|appointment)\b/i

// Research / no-buy-yet signals.
const INFORMATIONAL_RE =
  /\b(how|what|why|when|where|who|diy|guide|tips|ideas|examples?|meaning|definition|vs|versus|difference|can\si|should\si|is\sit|does|tutorial|learn|history)\b/i

const WEIGHT: Record<Commercial, number> = {
  transactional: 3,
  commercial: 2,
  informational: 1,
}

export function commercialIntent(query: string): Commercial {
  if (!query || !query.trim()) return 'informational'
  const isInfo = INFORMATIONAL_RE.test(query)
  const isTxn = TRANSACTIONAL_RE.test(query)
  // Informational wording with no buying signal → low value.
  if (isInfo && !isTxn) return 'informational'
  if (isTxn) return 'transactional'
  // Bare service/noun query with neither signal (e.g. "gutter cleaning crm") →
  // commercial by default — someone searching a service, not asking a question.
  return 'commercial'
}

/** Value multiplier for ranking opportunities: transactional worth 3x informational. */
export function commercialWeight(c: Commercial): number {
  return WEIGHT[c]
}
