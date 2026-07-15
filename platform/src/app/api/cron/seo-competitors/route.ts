import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runCompetitorScan } from '@/lib/seo/competitors'
import { generateCompetitorProposals } from '@/lib/seo/competitor-remediate'
import { verifyCronSecret } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL competitor scan — weekly. Live-SERPs each property's money keywords,
// rebuilds the competitor leaderboard, opens 'competitor_gap' issues, then
// drafts beat-the-competitor title/meta into seo_changes (proposed only).
// Read-only against the web; writes seo_serp / seo_competitors / seo_issues /
// seo_changes. Gated by SERPER_API_KEY — no key, no-op with a clear summary.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const url = new URL(request.url)
  const propertyLimit = Number(url.searchParams.get('properties')) || undefined
  const proposeLimit = Math.min(Math.max(Number(url.searchParams.get('propose')) || 25, 0), 200)

  try {
    const scan = await runCompetitorScan({ propertyLimit })
    const proposals =
      scan.enabled && scan.gaps > 0 && proposeLimit > 0
        ? await generateCompetitorProposals({ limit: proposeLimit })
        : { issues: 0, proposals: 0 }
    return NextResponse.json({ ok: true, scan, proposals })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
