/**
 * Lightweight completion signal for the onboarding profile wizard
 * (../profile), consumed once by the dashboard sidebar to badge the
 * Onboarding nav item with real progress (e.g. "3/6"). Derives from the same
 * onboarding_draft / onboarding_completed_at columns the wizard itself
 * writes — no separate tracking table or column.
 *
 * Total is the count of tenant-visible, funnel-applicable PROFILE_FIELDS
 * sections — the exact same computation ProfileWizard's `sections` memo
 * does client-side (src/components/tenant-profile/ProfileWizard.tsx) — so
 * this badge can never drift from what the wizard actually shows.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantProfile, isTenantVisible, appliesToFunnel } from '@/lib/tenant-profile'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const [{ data: tenant }, profile] = await Promise.all([
      supabaseAdmin
        .from('tenants')
        .select('onboarding_draft, onboarding_completed_at')
        .eq('id', tenantId)
        .single(),
      getTenantProfile(tenantId),
    ])

    const visibleSections = new Set(
      (profile?.fields || [])
        .filter((f) => isTenantVisible(f) && !f.readonly && appliesToFunnel(f, profile!.funnel))
        .map((f) => f.section),
    )
    const total = visibleSections.size
    const done = !!tenant?.onboarding_completed_at
    const savedStep = (tenant?.onboarding_draft as Record<string, unknown> | null)?.__step
    const completed = done
      ? total
      : Math.min(Math.max(typeof savedStep === 'number' ? savedStep : 0, 0), total)

    return NextResponse.json({ completed, total, done })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/dashboard/onboarding/progress', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
