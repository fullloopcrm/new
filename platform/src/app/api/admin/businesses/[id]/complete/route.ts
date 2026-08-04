/**
 * Admin-only endpoint that marks a tenant Complete — the one client-facing
 * launch action, distinct from Activate.
 * POST /api/admin/businesses/:id/complete
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { completeTenant } from '@/lib/complete-tenant'

// Completion now runs Phase 4 area/job content generation (up to MAX_AREAS
// sequential AI calls) — same headroom reasoning as the activate route.
export const runtime = 'nodejs'
export const maxDuration = 90

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  try {
    const result = await completeTenant(id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Completion failed' }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[complete] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Completion failed' }, { status: 500 })
  }
}
