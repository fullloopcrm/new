/**
 * Shared "which tenant is this request for" resolver for every surface the
 * public /onboard/[token] link touches (the profile API, feedback API, …).
 * Session wins if present; otherwise falls back to a signed onboarding
 * token whose linkVersion must match the tenant's CURRENT
 * onboarding_link_version — that's what makes "Regenerate link" on
 * admin/tenants/[id] actually invalidate a leaked link.
 *
 * The public-token path also requires the token to carry the PIN-verified
 * claim (see onboarding-pin.ts + /api/onboarding/pin) whenever the tenant
 * has a phone on file to derive a PIN from — skipped when there's no phone
 * to check against, so a tenant never gets stuck behind a PIN that can't
 * exist. `requirePin: false` opts a caller out entirely (used by
 * /api/onboarding/pin itself, which resolves the tenant BEFORE PIN entry).
 */
import { getTenantForRequest, AuthError } from './tenant-query'
import { supabaseAdmin } from './supabase'
import { verifyOnboardingToken } from './onboarding-token'
import { expectedOnboardingPin } from './onboarding-pin'

export async function resolveOnboardingTenantId(
  tokenFromCaller: string | null | undefined,
  opts: { requirePin?: boolean } = {},
): Promise<string | null> {
  const { requirePin = true } = opts

  try {
    const { tenantId } = await getTenantForRequest()
    return tenantId
  } catch (err) {
    if (!(err instanceof AuthError)) throw err
  }

  const verified = verifyOnboardingToken(tokenFromCaller)
  if (!verified) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('onboarding_link_version, phone, owner_phone')
    .eq('id', verified.tenantId)
    .single()
  if (!tenant || (tenant.onboarding_link_version as number) !== verified.linkVersion) return null

  if (requirePin && expectedOnboardingPin(tenant) && !verified.pinVerified) return null

  return verified.tenantId
}
