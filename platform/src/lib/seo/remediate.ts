// ---------------------------------------------------------------------------
// SIGNAL remediation — proposal generator (Phase 3, step 1).
//
// For open Tier-1 issues (striking_distance / low_ctr), draft an improved
// <title> + meta description targeting the page's top query, and store them in
// seo_changes as status='proposed'. NOTHING is applied here — this is the
// human-reviewable draft stage. The branch -> CI -> preview -> merge automation
// is a later, separately-gated step.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { resolveAnthropic } from '@/lib/anthropic-client'
import { safeFetch } from '../ssrf'

const MODEL = 'claude-sonnet-5'

type Issue = {
  id: string
  property: string
  tenant_id: string | null
  target_url: string | null
  recipe: string | null
  tier: number | null
  type: string
  detail: Record<string, unknown>
}

async function topQueryFor(property: string, page: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('seo_metrics')
    .select('query,impressions')
    .eq('property', property)
    .eq('page', page)
    .neq('query', '')
    .order('impressions', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.query as string) ?? null
}

export async function fetchTitleMeta(url: string): Promise<{ title: string; meta: string }> {
  try {
    const res = await safeFetch(url)
    const html = await res.text()
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? ''
    const meta =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ??
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]?.trim() ??
      ''
    return { title, meta }
  } catch {
    return { title: '', meta: '' }
  }
}

function buildPrompt(query: string, current: { title: string; meta: string }): string {
  return `You are a senior SEO specialist. A page currently ranks on page 2 of Google for the query "${query}" — one push from page 1. Rewrite its <title> and meta description to maximize click-through and query relevance.

Current title: "${current.title}"
Current meta: "${current.meta}"

Rules:
- Title: <= 60 characters, lead with the query intent, keep the brand if one is present.
- Meta: <= 155 characters, compelling, specific, includes a reason to click.
- No clickbait, no ALL CAPS, no fabricated claims.
Return ONLY JSON: {"title": "...", "meta": "...", "rationale": "one sentence"}`
}

async function proposeForIssue(issue: Issue): Promise<number> {
  if (!issue.target_url) return 0
  const query = await topQueryFor(issue.property, issue.target_url)
  if (!query) return 0
  const current = await fetchTitleMeta(issue.target_url)

  const client = await resolveAnthropic(issue.tenant_id ?? '')
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    // Bounded structured task — extended thinking (default-on for sonnet-5) would
    // burn the budget and return empty text. Off = reliable, cheap, fast.
    thinking: { type: 'disabled' },
    messages: [{ role: 'user', content: buildPrompt(query, current) }],
  })
  const text = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
  const json = text.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return 0
  const parsed = JSON.parse(json) as { title?: string; meta?: string; rationale?: string }

  const common = {
    issue_id: issue.id,
    property: issue.property,
    tenant_id: issue.tenant_id,
    target_url: issue.target_url,
    recipe: 'title_meta',
    // Auto-apply eligibility, NOT the source issue's priority tier (which
    // conflates page-1 low_ctr and page-2 striking_distance under the same
    // value). A page-1 ranking (low_ctr, position 6-10) must never be
    // auto-applied without human review — only a genuine page-2+ opportunity
    // (striking_distance, position 11-20) is eligible. tier=1 here is what
    // autopilot.ts's `.eq('tier', 1)` filter actually auto-applies; anything
    // else sits in the existing admin approval queue (/admin/seo dashboard).
    tier: issue.type === 'striking_distance' ? 1 : 2,
    status: 'proposed',
    rationale: parsed.rationale ?? null,
    before_metric: issue.detail,
  }
  const rows: Record<string, unknown>[] = []
  if (parsed.title && parsed.title !== current.title) {
    rows.push({ ...common, field: 'title', before_value: current.title, after_value: parsed.title })
  }
  if (parsed.meta && parsed.meta !== current.meta) {
    rows.push({ ...common, field: 'meta_description', before_value: current.meta, after_value: parsed.meta })
  }
  if (rows.length) {
    // Clear any prior proposals for this issue so re-runs stay idempotent.
    await supabaseAdmin.from('seo_changes').delete().eq('issue_id', issue.id).eq('status', 'proposed')
    await supabaseAdmin.from('seo_changes').insert(rows)  // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
  }
  return rows.length
}

export async function generateProposals(opts?: { limit?: number }): Promise<{
  issues: number
  proposals: number
}> {
  const limit = opts?.limit ?? 25
  const { data } = await supabaseAdmin
    .from('seo_issues')
    .select('id,property,tenant_id,target_url,recipe,tier,type,detail')
    .eq('status', 'open')
    .eq('tier', 1)
    .in('type', ['striking_distance', 'low_ctr'])
    .order('value', { ascending: false })
    .limit(limit)

  const issues = (data ?? []) as Issue[]
  let proposals = 0
  for (const issue of issues) proposals += await proposeForIssue(issue)
  return { issues: issues.length, proposals }
}
