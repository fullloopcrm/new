/**
 * Admin-only Site-Readiness audit for a tenant.
 * GET /api/admin/businesses/:id/readiness
 *
 * Report-only — runs the global new-tenant build standard (content word counts,
 * on-page SEO, ops/brand basics) and returns the red/green checklist. Never
 * writes or flips status; the LaunchPanel renders this to show what's left.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { checkSiteReadiness } from '@/lib/site-readiness'

// Content checks fetch every canonical page over HTTP — give it headroom.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  try {
    const result = await checkSiteReadiness(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[readiness] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Readiness check failed' }, { status: 500 })
  }
}
