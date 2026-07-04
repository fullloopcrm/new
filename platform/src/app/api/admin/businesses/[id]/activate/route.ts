/**
 * Admin-only endpoint that runs the full tenant activation.
 * POST /api/admin/businesses/:id/activate
 *
 * Idempotent — safe to hit repeatedly. Returns the per-step result so the
 * profile can render live activation progress. The owner PIN (if a login was
 * created this run) is returned ONCE.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { activateTenant } from '@/lib/activate-tenant'

// Activation runs several sequential external calls (Vercel domain API x3 +
// onboarding gate + provisioning), which can exceed the default ~10s function
// limit and get killed mid-run (progress shows a few steps, then dies). Give it
// real headroom.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  try {
    const result = await activateTenant(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[activate] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Activation failed' }, { status: 500 })
  }
}
