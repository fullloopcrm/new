import { NextResponse } from 'next/server'
import { generateDeterministicProposals } from '@/lib/seo/recipes'
import { runAutopilot } from '@/lib/seo/autopilot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// seomgr weekly auto-improve — the free self-improvement pass across every tenant.
//   1. generateDeterministicProposals(): fixed-rule title/meta rewrites for the
//      fleet's top Tier-1 opportunities (striking-distance + low-CTR). No AI, $0.
//   2. runAutopilot(): applies the passing proposals through the deterministic
//      safety-gate, rate-capped per site, gated by SEO_AUTOPILOT_ENABLED.
// Content is never auto-generated here. verify-revert (separate weekly cron)
// undoes any change that hurt after 4 weeks.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const proposed = await generateDeterministicProposals()
    const applied = await runAutopilot()
    return NextResponse.json({ ok: true, proposed, applied })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
