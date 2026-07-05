// ---------------------------------------------------------------------------
// SIGNAL competitor remediation — draft a title/meta that beats the specific
// page currently outranking us. Distinct from remediate.ts (which fixes
// striking-distance pages in a vacuum): here the prompt sees the competitor's
// actual title, so the rewrite is a direct counter, not a generic improvement.
//
// Drafts only — writes to seo_changes as status='proposed'. Nothing is applied;
// apply stays the human-gated /api/admin/seo/apply step, same as the base flow.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { resolveAnthropic } from '@/lib/anthropic-client'
import { fetchTitleMeta } from './remediate'

const MODEL = 'claude-sonnet-5'

type GapIssue = {
  id: string
  property: string
  tenant_id: string | null
  target_url: string | null
  detail: {
    query?: string
    top_competitor_domain?: string
    top_competitor_title?: string
    our_position?: number
    top_competitor_position?: number
  }
}

function buildPrompt(
  query: string,
  current: { title: string; meta: string },
  competitor: { domain: string; title: string },
): string {
  return `You are a senior local-SEO specialist. For the Google query "${query}", a competitor currently outranks us.

Competitor (${competitor.domain}) title: "${competitor.title}"

Our page:
- Current title: "${current.title}"
- Current meta: "${current.meta}"

Rewrite OUR <title> and meta description to win the click from theirs — sharper intent match, clearer value, stronger reason to choose us. Do not copy their wording or their brand.

Rules:
- Title: <= 60 characters, lead with the query intent, keep our brand if present.
- Meta: <= 155 characters, specific and compelling, one concrete reason to click.
- No clickbait, no ALL CAPS, no fabricated claims (no fake awards, review counts, or guarantees).
Return ONLY JSON: {"title":"...","meta":"...","rationale":"one sentence on how this beats the competitor"}`
}

async function proposeForGap(issue: GapIssue): Promise<number> {
  const url = issue.target_url
  const query = issue.detail?.query
  if (!url || !query) return 0

  const current = await fetchTitleMeta(url)
  const client = await resolveAnthropic(issue.tenant_id ?? '')
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'disabled' },
    messages: [
      {
        role: 'user',
        content: buildPrompt(query, current, {
          domain: issue.detail?.top_competitor_domain ?? 'a competitor',
          title: issue.detail?.top_competitor_title ?? '',
        }),
      },
    ],
  })
  const text = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
  const json = text.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return 0
  const parsed = JSON.parse(json) as { title?: string; meta?: string; rationale?: string }

  const common = {
    issue_id: issue.id,
    property: issue.property,
    tenant_id: issue.tenant_id,
    target_url: url,
    recipe: 'competitor_title_meta',
    tier: 1,
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
    await supabaseAdmin.from('seo_changes').delete().eq('issue_id', issue.id).eq('status', 'proposed')
    await supabaseAdmin.from('seo_changes').insert(rows)
  }
  return rows.length
}

export async function generateCompetitorProposals(opts?: { limit?: number }): Promise<{
  issues: number
  proposals: number
}> {
  const limit = opts?.limit ?? 25
  const { data } = await supabaseAdmin
    .from('seo_issues')
    .select('id,property,tenant_id,target_url,detail')
    .eq('status', 'open')
    .eq('type', 'competitor_gap')
    .not('target_url', 'is', null)
    .order('value', { ascending: false })
    .limit(limit)

  const issues = (data ?? []) as GapIssue[]
  let proposals = 0
  for (const issue of issues) proposals += await proposeForGap(issue)
  return { issues: issues.length, proposals }
}
