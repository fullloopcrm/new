// seomgr — FREE deterministic proposal recipes (no AI, no API cost).
//
// Mirrors remediate.ts but generates title/meta rewrites from fixed rules instead
// of Anthropic, so the weekly auto-improve loop costs nothing to run. Writes to
// seo_changes as status='proposed' tier=1 — the same queue the autopilot applies
// through the deterministic safety-gate. Content is NOT touched here.
//
// Deliberately CONSERVATIVE: it only proposes when the rewrite is a clear win, and
// skips anything ambiguous (brand queries, junk queries, titles that already cover
// the query, over-length). A skipped page is left for a human — never degraded.
import { supabaseAdmin } from '@/lib/supabase'
import { fetchTitleMeta } from './remediate'

const TITLE_MAX = 60
const SEP = ' | '
const NYCMAID = 'sc-domain:thenycmaid.com' // read-only during the cutover — never touch

const US_STATES = new Set([
  'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia','ks','ky','la','me','md',
  'ma','mi','mn','ms','mo','mt','ne','nv','nh','nj','nm','ny','nc','nd','oh','ok','or','pa','ri','sc',
  'sd','tn','tx','ut','vt','va','wa','wv','wi','wy','dc',
])
const STOP = new Set(['in','the','a','an','of','for','and','to','near','me','my','your','best','service','services'])

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}

/** Title-case a query. A 2-letter US state code is upcased ONLY when it's the last
 *  token (avoids turning the preposition "in" into "IN"). */
function titleCaseQuery(q: string): string {
  const toks = q.trim().split(/\s+/)
  return toks
    .map((w, i) => {
      const lw = w.toLowerCase()
      if (i === toks.length - 1 && US_STATES.has(lw)) return lw.toUpperCase()
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

function brandFrom(title: string): string {
  const parts = title.split(/\s[|–—-]\s/)
  return parts.length > 1 ? parts[parts.length - 1].trim() : ''
}

/** Junk filter: repeated words, or an unnaturally long query, aren't real targets. */
function isJunkQuery(query: string): boolean {
  const w = words(query)
  if (w.length === 0 || w.length > 6) return true
  if (new Set(w).size < w.length) return true // a repeated word ("company was company")
  return false
}

/** Front-load the exact query into the title, keeping the brand, ≤60 chars.
 *  Returns null unless it's a clear, clean improvement. */
export function proposeTitle(query: string, current: string): string | null {
  if (isJunkQuery(query)) return null
  const qWords = words(query).filter((w) => !STOP.has(w))
  if (qWords.length === 0) return null

  const brand = brandFrom(current)
  const brandWords = new Set(words(brand))
  // Brand search ("the nyc maid") — every meaningful query word is part of the brand.
  if (qWords.every((w) => brandWords.has(w))) return null

  // Page already targets this query — most query words already in the title → leave it.
  const titleWords = new Set(words(current))
  const covered = qWords.filter((w) => titleWords.has(w)).length
  if (covered / qWords.length >= 0.6) return null

  const q = titleCaseQuery(query)
  const withBrand = brand ? `${q}${SEP}${brand}` : q
  const candidate = withBrand.length <= TITLE_MAX ? withBrand : q
  if (candidate.length > TITLE_MAX) return null // won't fit without truncation → skip
  if (candidate.toLowerCase() === current.trim().toLowerCase()) return null
  return candidate
}

/** Fill a MISSING meta only — claim-free, query-led, ≤155 chars. Never rewrites
 *  an existing meta. */
export function proposeMeta(query: string, current: string, brand: string): string | null {
  if (current.trim().length >= 50) return null
  if (isJunkQuery(query)) return null
  const q = titleCaseQuery(query)
  const tail = brand ? ` from ${brand}` : ''
  const meta = `${q}${tail}. Learn more, see availability, and get in touch to get started.`
  return meta.length <= 155 ? meta : `${q}. Learn more and get in touch to get started.`
}

async function proposeForIssue(issue: {
  id: string
  property: string
  tenant_id: string | null
  target_url: string | null
  detail: Record<string, unknown>
}): Promise<number> {
  if (!issue.target_url) return 0
  const query = (issue.detail?.top_query as string) || ''
  if (!query) return 0
  const current = await fetchTitleMeta(issue.target_url)
  if (!current.title) return 0

  const newTitle = proposeTitle(query, current.title)
  const newMeta = proposeMeta(query, current.meta, brandFrom(current.title))
  if (!newTitle && !newMeta) return 0

  const common = {
    issue_id: issue.id,
    property: issue.property,
    tenant_id: issue.tenant_id,
    target_url: issue.target_url,
    recipe: 'title_meta_deterministic',
    tier: 1,
    status: 'proposed',
    rationale: 'Front-loads the exact search query for relevance + CTR; brand and length preserved. Fixed rule (no AI).',
    before_metric: issue.detail,
  }
  const rows: Record<string, unknown>[] = []
  if (newTitle) rows.push({ ...common, field: 'title', before_value: current.title, after_value: newTitle })
  if (newMeta) rows.push({ ...common, field: 'meta_description', before_value: current.meta, after_value: newMeta })

  await supabaseAdmin.from('seo_changes').delete().eq('issue_id', issue.id).eq('status', 'proposed')
  await supabaseAdmin.from('seo_changes').insert(rows)  // tenant-scope-ok: tenant_id is in `common`, spread into every row above
  return rows.length
}

/** Generate deterministic title/meta proposals across the fleet's top Tier-1
 *  opportunities (striking-distance + low-CTR), worst-first. Free. Excludes the
 *  read-only NYC Maid property. */
export async function generateDeterministicProposals(opts?: { limit?: number }): Promise<{
  issues: number
  proposals: number
}> {
  const limit = opts?.limit ?? 60
  const { data } = await supabaseAdmin
    .from('seo_issues')
    .select('id,property,tenant_id,target_url,detail')
    .eq('status', 'open')
    .eq('tier', 1)
    .in('type', ['striking_distance', 'low_ctr'])
    .neq('property', NYCMAID)
    .order('value', { ascending: false })
    .limit(limit)

  const issues = (data ?? []).filter((i) => i.property !== NYCMAID)
  let proposals = 0
  for (const issue of issues) proposals += await proposeForIssue(issue)
  return { issues: issues.length, proposals }
}
