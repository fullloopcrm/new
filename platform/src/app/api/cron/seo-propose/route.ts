import { NextResponse } from 'next/server'
import { generateProposals } from '@/lib/seo/remediate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL weekly proposal run. Drafts Tier-1 title/meta rewrites for the
// highest-value striking-distance / low-CTR issues into seo_changes as
// 'proposed'. Applies NOTHING — apply is a separate, gated step
// (/api/admin/seo/apply) triggered by approval. Human-in-the-loop by default.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 25, 1), 200)

  try {
    const summary = await generateProposals({ limit })
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
