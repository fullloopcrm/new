// ---------------------------------------------------------------------------
// SIGNAL safety gate — the deterministic wall between an AI draft and a live
// client page. Autopilot applies NOTHING that fails this. No model calls, no
// judgment: hard, boring, predictable rules. When the human stops reviewing
// every suggestion, this is what stands in for their eyes.
//
// Core principle for claims: we don't decide whether a claim is true — we refuse
// to INTRODUCE any claim the current copy didn't already make. If the old title
// didn't say "#1 rated", the new one can't either.
// ---------------------------------------------------------------------------

export type SafetyInput = {
  field: 'title' | 'meta_description'
  after: string
  before: string
  url: string
  competitorBrands?: string[] // e.g. ['merrymaids','care'] — never name a rival
}

export type SafetyResult = { pass: boolean; reasons: string[] }

// Superlatives / trust claims that must not be conjured from nothing.
const CLAIM_RE =
  /#\s?1|\bno\.?\s?1\b|\bnumber one\b|\bbest\b|\btop[-\s]?rated\b|\baward[-\s]?winning\b|\bvoted\b|\bguarantee[d]?\b|\b100%\b|\b5[-\s]?star\b|\b5\.0\b|\b\d{2,}\+?\s*(?:reviews|customers|clients|years)\b|\bcertified\b|\blicensed\b|\binsured\b/gi

// Length bounds (with a little slack over the display targets).
const LIMITS = {
  title: { min: 15, max: 65 },
  meta_description: { min: 50, max: 165 },
} as const

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

function claimSet(s: string): Set<string> {
  const out = new Set<string>()
  for (const m of norm(s).matchAll(CLAIM_RE)) out.add(m[0].replace(/\s+/g, ' ').trim())
  return out
}

/** Words worth matching for topic/brand checks — skip short filler. */
function significantWords(s: string): string[] {
  return norm(s)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 4)
}

/** Trailing brand segment of a title, e.g. "… | The NYC Maid" -> "the nyc maid". */
function brandOf(title: string): string | null {
  const parts = title.split(/[|–—-]/)
  if (parts.length < 2) return null
  const brand = parts[parts.length - 1].trim()
  return brand.length >= 3 ? norm(brand) : null
}

function slugWords(url: string): string[] {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''
    return seg.split('-').filter((w) => w.length >= 4)
  } catch {
    return []
  }
}

export function evaluateSafety(input: SafetyInput): SafetyResult {
  const reasons: string[] = []
  const after = input.after?.trim() ?? ''
  const before = input.before?.trim() ?? ''
  const limit = LIMITS[input.field]

  // 1. Length / non-empty.
  if (!after) reasons.push('empty value')
  else if (after.length < limit.min) reasons.push(`too short (${after.length} < ${limit.min})`)
  else if (after.length > limit.max) reasons.push(`too long (${after.length} > ${limit.max})`)

  // 2. No newly-introduced claims.
  const introduced = [...claimSet(after)].filter((c) => !claimSet(before).has(c))
  if (introduced.length) reasons.push(`introduces unverified claim: ${introduced.join(', ')}`)

  // 3. No competitor names.
  const afterNorm = norm(after)
  const namedRival = (input.competitorBrands ?? []).find(
    (b) => b.length >= 3 && new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(afterNorm),
  )
  if (namedRival) reasons.push(`names competitor: ${namedRival}`)

  // 4. No shouting (>2 all-caps words).
  const shouted = (after.match(/\b[A-Z]{3,}\b/g) ?? []).filter((w) => w !== 'NYC' && w !== 'LLC')
  if (shouted.length > 2) reasons.push('excessive caps')

  // Title-only checks: brand preserved + stays on topic.
  if (input.field === 'title') {
    const brand = brandOf(before)
    if (brand && !afterNorm.includes(brand)) reasons.push(`drops brand "${brand}"`)

    const slug = slugWords(input.url)
    if (slug.length) {
      // Check topic relevance on the headline only — the brand tail (e.g.
      // "| The NYC Maid") often shares words with the slug and would mask drift.
      const headline = after.split(/[|–—]/)[0]
      const words = new Set(significantWords(headline))
      const overlap = slug.some((w) => words.has(w))
      if (!overlap) reasons.push('title unrelated to page topic')
    }
  }

  return { pass: reasons.length === 0, reasons }
}
