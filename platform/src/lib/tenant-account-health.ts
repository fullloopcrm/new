/**
 * Account health — a COMPUTED, read-only signal (same shape as
 * tenant-readiness.ts's computeReadiness), never a stored column. A stored
 * health score goes stale the moment nothing updates it; computing it fresh
 * on every admin/tenants/[id] view can't drift from reality.
 *
 * Deliberately simple v1: last-login recency, billing status, and recent
 * feedback/support-message volume. Not a churn-prediction model — a status
 * light for a human to glance at.
 */
import { supabaseAdmin } from './supabase'

export type HealthLevel = 'healthy' | 'watch' | 'at_risk'

export interface AccountHealth {
  level: HealthLevel
  reasons: string[]
  daysSinceActive: number | null
  billingStatus: string
  recentFeedbackCount: number
  recentSupportMessageCount: number
}

const STALE_DAYS = 14
const AT_RISK_DAYS = 30

export async function computeAccountHealth(tenantId: string): Promise<AccountHealth> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('last_active_at, billing_status, status')
    .eq('id', tenantId)
    .single()

  const since30d = new Date(Date.now() - 30 * 86400000).toISOString()

  const [{ count: feedbackCount }, { count: supportCount }] = await Promise.all([
    supabaseAdmin
      .from('platform_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('category', ['bug', 'complaint'])
      .gte('created_at', since30d),
    supabaseAdmin
      .from('tenant_owner_messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', since30d),
  ])

  const lastActive = tenant?.last_active_at ? new Date(tenant.last_active_at).getTime() : null
  const daysSinceActive = lastActive ? Math.floor((Date.now() - lastActive) / 86400000) : null
  const billingStatus = tenant?.billing_status || 'unknown'

  const reasons: string[] = []
  let level: HealthLevel = 'healthy'

  if (billingStatus === 'past_due' || billingStatus === 'suspended' || tenant?.status === 'suspended' || tenant?.status === 'cancelled') {
    level = 'at_risk'
    reasons.push(`billing/status: ${billingStatus}/${tenant?.status}`)
  } else if (daysSinceActive === null || daysSinceActive > AT_RISK_DAYS) {
    level = 'at_risk'
    reasons.push(daysSinceActive === null ? 'never logged in' : `no login in ${daysSinceActive} days`)
  } else if (daysSinceActive > STALE_DAYS) {
    level = 'watch'
    reasons.push(`no login in ${daysSinceActive} days`)
  }

  if ((feedbackCount || 0) > 0) {
    if (level === 'healthy') level = 'watch'
    reasons.push(`${feedbackCount} bug/complaint feedback in last 30d`)
  }

  return {
    level,
    reasons,
    daysSinceActive,
    billingStatus,
    recentFeedbackCount: feedbackCount || 0,
    recentSupportMessageCount: supportCount || 0,
  }
}
