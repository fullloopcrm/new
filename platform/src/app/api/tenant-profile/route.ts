/**
 * Tenant-facing profile read/write API — dual auth.
 *
 * The one endpoint both the in-dashboard onboarding wizard (Clerk session,
 * via getTenantForRequest) and the public, no-login /onboard/[token] link
 * (signed token, see onboarding-token.ts) call. Same handler body either
 * way once a tenantId is resolved — this is what makes the public link and
 * Settings/dashboard read and write the exact same fields instead of a
 * fourth hand-rolled mapping.
 *
 * Deliberately narrower than the admin route
 * (api/admin/businesses/[id]/profile): only tenant-visible fields
 * (isTenantVisible — audience !== 'admin') are ever returned or accepted
 * here, regardless of auth mode. Account ownership, contract terms,
 * cancellation, and payout method are FL-internal and are only ever
 * readable/writable through the admin route, gated by requireAdmin().
 *
 *   GET   → { fields: LoadedField[] (tenant-visible only), draft }
 *   PUT   → { draft, step }  — autosave, resumable, no validation
 *   POST  → { data: {key:value,…} } → applied via the shared write path,
 *            draft cleared, onboarding_completed_at stamped
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantProfile, isTenantVisible, PROFILE_FIELD_BY_KEY } from '@/lib/tenant-profile'
import { applyProfileWrite } from '@/lib/tenant-profile-write'
import { resolveOnboardingTenantId } from '@/lib/onboarding-auth'
import { alertOwner } from '@/lib/telegram'
import { recordOnboardingSnapshot } from '@/lib/onboarding-snapshot'

type Json = Record<string, unknown>

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const tenantId = await resolveOnboardingTenantId(url.searchParams.get('token'))
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [profile, { data: tenant }] = await Promise.all([
      getTenantProfile(tenantId),
      supabaseAdmin.from('tenants').select('onboarding_draft').eq('id', tenantId).single(),
    ])
    if (!profile) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    return NextResponse.json({
      tenantId: profile.tenantId,
      name: profile.name,
      funnel: profile.funnel,
      fields: profile.fields.filter(isTenantVisible).map((f) => ({
        key: f.key, label: f.label, section: f.section, value: f.value, filled: f.filled,
        tier: f.tier, readonly: !!f.readonly, kind: f.kind || 'text',
        input: f.input || 'text', options: f.options || null, funnels: f.funnels || null,
        help: f.help || null, platformManaged: !!f.platformManaged, onboardingHidden: !!f.onboardingHidden,
        dependsOn: f.dependsOn || null, validation: f.validation || null,
      })),
      draft: (tenant?.onboarding_draft as Json) || null,
    })
  } catch (err) {
    console.error('GET /api/tenant-profile', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/**
 * Autosave. Two things happen on every debounced call:
 *   1. `draft` (raw form + __step) persists so a resume lands on the right
 *      step even mid-field — unchanged from before.
 *   2. `data`, if sent, live-writes through the SAME applyProfileWrite path
 *      POST uses — this is what makes "fill it in" mean "it's in the real
 *      profile now", not "it's in the profile once you click Finish".
 *      The caller (ProfileWizard) only ever sends fields from sections the
 *      tenant has actually visited — never the whole form — because
 *      coerceFieldValue treats empty as an explicit clear, and blasting every
 *      not-yet-reached field would null out real data (including whatever
 *      the admin already filled in at creation).
 */
export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string; draft?: Json; step?: number; data?: Json }
    const tenantId = await resolveOnboardingTenantId(body.token || null)
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const draft: Json = { ...(body.draft ?? {}) }
    if (typeof body.step === 'number') draft.__step = body.step
    const { error } = await supabaseAdmin.from('tenants').update({ onboarding_draft: draft }).eq('id', tenantId)
    if (error) throw error

    if (body.data && typeof body.data === 'object') {
      const filtered: Json = {}
      for (const [key, value] of Object.entries(body.data)) {
        const field = PROFILE_FIELD_BY_KEY[key]
        if (field && isTenantVisible(field)) filtered[key] = value
      }
      if (Object.keys(filtered).length > 0) await applyProfileWrite(tenantId, filtered)
    }

    return NextResponse.json({ saved: true })
  } catch (err) {
    console.error('PUT /api/tenant-profile', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/** Commit: apply through the shared write path, clear draft, stamp completion. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string; data?: Json }
    const tenantId = await resolveOnboardingTenantId(body.token || null)
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const incoming = body.data && typeof body.data === 'object' ? body.data : {}

    // Belt-and-suspenders: even if a caller forged an admin-only field key,
    // it's dropped here before it ever reaches routeProfileWrite/applyProfileWrite.
    const filtered: Json = {}
    for (const [key, value] of Object.entries(incoming)) {
      const field = PROFILE_FIELD_BY_KEY[key]
      if (field && isTenantVisible(field)) filtered[key] = value
    }

    const { saved, ignored } = await applyProfileWrite(tenantId, filtered)
    if (!saved) return NextResponse.json({ error: 'No writable fields', ignored }, { status: 400 })

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .update({ onboarding_draft: null, onboarding_completed_at: new Date().toISOString() })
      .eq('id', tenantId)
      .select('name')
      .single()

    // Immutable backup of exactly what was submitted — independent of the
    // live tenant columns applyProfileWrite just updated above, so a later
    // edit/re-run can never lose what the client actually typed. Awaited
    // (not fire-and-forget) so the row is guaranteed written before this
    // request returns, but never blocks the tenant's success response — an
    // error here logs, it does not fail the submit.
    await recordOnboardingSnapshot({ tenantId, tenantName: (tenant?.name as string) || 'Business', data: filtered }).catch((e) =>
      console.error('recordOnboardingSnapshot failed for', tenantId, e),
    )

    alertOwner(
      'Onboarding completed',
      `${(tenant?.name as string) || 'A tenant'} finished their profile.\n${process.env.NEXT_PUBLIC_APP_URL || 'https://www.homeservicesbusinesscrm.com'}/admin/businesses/${tenantId}`,
    ).catch(() => {})

    return NextResponse.json({ submitted: true, ignored })
  } catch (err) {
    console.error('POST /api/tenant-profile', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
