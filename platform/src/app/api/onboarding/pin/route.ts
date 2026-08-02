/**
 * PIN gate for the public /onboard/[token] link — see onboarding-pin.ts and
 * onboarding-token.ts for why this sits on top of the token instead of
 * replacing it.
 *
 *   GET  ?token=          → { name, pinRequired } — tenant display name for
 *                            the PIN screen header. Safe pre-PIN: no profile
 *                            data, just the name already visible on the
 *                            onboarding email this link came from.
 *   POST { token, pin }   → { token: <elevated> } on a correct PIN. The
 *                            elevated token carries the PIN-verified claim;
 *                            the client swaps to using it for every
 *                            subsequent onboarding API call in place of the
 *                            raw link token.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyOnboardingToken, signOnboardingToken, type VerifiedOnboardingToken } from '@/lib/onboarding-token'
import { expectedOnboardingPin } from '@/lib/onboarding-pin'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { safeEqual } from '@/lib/timing-safe-equal'

interface TenantRow {
  name: string | null
  onboarding_link_version: number | null
  phone: string | null
  owner_phone: string | null
}

async function loadTenant(
  tokenFromCaller: string | null,
): Promise<{ verified: VerifiedOnboardingToken; tenant: TenantRow } | null> {
  const verified = verifyOnboardingToken(tokenFromCaller)
  if (!verified) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, onboarding_link_version, phone, owner_phone')
    .eq('id', verified.tenantId)
    .single()
  if (!tenant || (tenant.onboarding_link_version as number) !== verified.linkVersion) return null

  return { verified, tenant: tenant as TenantRow }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const resolved = await loadTenant(url.searchParams.get('token'))
  if (!resolved) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })

  return NextResponse.json({
    name: resolved.tenant.name || '',
    pinRequired: !!expectedOnboardingPin(resolved.tenant),
  })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { token?: string; pin?: string }
  const resolved = await loadTenant(body.token || null)
  if (!resolved) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })

  const { verified, tenant } = resolved
  const expected = expectedOnboardingPin(tenant)

  // No phone on file -- nothing to gate. Elevate anyway so the tenant isn't
  // stuck behind a PIN screen for a PIN that can't exist.
  if (!expected) {
    return NextResponse.json({ token: signOnboardingToken(verified.tenantId, verified.linkVersion, undefined, { pinVerified: true }) })
  }

  const { allowed } = await rateLimitDb(`onboarding-pin:${verified.tenantId}`, 8, 15 * 60 * 1000, { failClosed: true })
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })

  const submitted = (body.pin || '').replace(/\D/g, '')
  if (submitted.length !== 4 || !safeEqual(submitted, expected)) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  return NextResponse.json({ token: signOnboardingToken(verified.tenantId, verified.linkVersion, undefined, { pinVerified: true }) })
}
