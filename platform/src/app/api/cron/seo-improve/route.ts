import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// STUB: @/lib/seo/recipes (generateDeterministicProposals) was never built, so this
// route never actually ran end-to-end. Intended design (kept for whoever builds it):
//   1. generateDeterministicProposals(): fixed-rule title/meta rewrites for the
//      fleet's top Tier-1 opportunities (striking-distance + low-CTR). No AI, $0.
//   2. runAutopilot() [@/lib/seo/autopilot, this half DOES exist]: applies the
//      passing proposals through the deterministic safety-gate, rate-capped per
//      site, gated by SEO_AUTOPILOT_ENABLED.
// Content is never auto-generated here. verify-revert (separate weekly cron)
// undoes any change that hurt after 4 weeks.
// This route was never wired into vercel.json crons — nothing invokes it today.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: false, error: 'not implemented: seo/recipes module was never built' }, { status: 501 })
}
