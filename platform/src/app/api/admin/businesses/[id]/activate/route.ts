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
