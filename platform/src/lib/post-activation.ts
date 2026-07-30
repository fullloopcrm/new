/**
 * Shared, best-effort tasks that fire once a tenant actually goes live —
 * called from activate-tenant.ts and the auto-active creation paths that
 * never go through activateTenant() (self-serve signup, lead conversion,
 * the Stripe checkout webhook). Deliberately separate from the heavier
 * provisioning steps in activate-tenant.ts (domains, SEO, geocoding) —
 * those have real per-path timing/side-effect differences; these don't.
 */
import { supabaseAdmin } from './supabase'
import { alertOwner } from './telegram'
import { computeAccountHealth } from './tenant-account-health'
import { draftInitialSiteContent } from './draft-site-content'

export async function runPostActivationTasks(tenantId: string): Promise<void> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, slug, industry')
    .eq('id', tenantId)
    .single()
  const label = tenant ? `${tenant.name} (${tenant.slug})` : tenantId

  // FL-team notice. Never throws — alertOwner no-ops silently if unconfigured.
  await alertOwner(`Tenant activated: ${label}`, tenant?.industry ? `Industry: ${tenant.industry}` : undefined).catch(() => null)

  // Day-1 health baseline — a snapshot, not the live score (see
  // tenant-account-health.ts for why those stay separate).
  try {
    const health = await computeAccountHealth(tenantId)
    await supabaseAdmin.from('tenants').update({ activation_health_snapshot: health }).eq('id', tenantId)
  } catch (e) {
    console.error('runPostActivationTasks: health snapshot failed', e)
  }

  // AI first-pass content suggestions — slow (LLM call) and non-critical, so
  // fire-and-forget rather than awaited inline with the rest of activation.
  draftInitialSiteContent(tenantId).catch((e) => console.error('runPostActivationTasks: content draft failed', e))
}
