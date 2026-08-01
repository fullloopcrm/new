import { NextResponse } from 'next/server'
import { proposeCrossLinks, crossLinkEnabled } from '@/lib/seo/cross-linking'
import { safeEqual } from '@/lib/secret-compare'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || !safeEqual(request.headers.get('authorization'), `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!crossLinkEnabled()) {
    return NextResponse.json({ ok: true, enabled: false })
  }
  try {
    const summary = await proposeCrossLinks()
    return NextResponse.json({ ok: true, enabled: true, ...summary })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
