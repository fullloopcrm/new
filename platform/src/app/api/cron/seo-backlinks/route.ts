import { NextResponse } from 'next/server'
import { generateBacklinkProposals } from '@/lib/seo/backlinks'
import { safeEqual } from '@/lib/timing-safe-equal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL backlinks run. Drafts citation-directory listings and editorial
// cross-mention angles for every active tenant into seo_backlink_opportunities
// as 'proposed'. Submits NOTHING externally — this is the human-reviewable
// draft stage, same as /api/cron/seo-propose. See src/lib/seo/backlinks.ts
// for why this is citations + editorial mentions and not a hub-and-spoke
// backlink scheme.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 25, 1), 200)

  try {
    const summary = await generateBacklinkProposals({ limit })
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
