/**
 * Shared "which tenant is this request for" resolver for every surface the
 * public /onboard/[token] link touches (the profile API, feedback API, …).
 * Session wins if present; otherwise falls back to a signed onboarding
 * token whose linkVersion must match the tenant's CURRENT
 * onboarding_link_version — that's what makes "Regenerate link" on
 * admin/tenants/[id] actually invalidate a leaked link.
 */
import { getTenantForRequest, AuthError } from './tenant-query'
import { supabaseAdmin } from './supabase'
import { verifyOnboardingToken } from './onboarding-token'

export async function resolveOnboardingTenantId(tokenFromCaller: string | null | undefined): Promise<string | null> {
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
    .select('onboarding_link_version')
    .eq('id', verified.tenantId)
    .single()
  if (!tenant || (tenant.onboarding_link_version as number) !== verified.linkVersion) return null

  return verified.tenantId
}
