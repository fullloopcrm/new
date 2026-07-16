// ---------------------------------------------------------------------------
// seomgr — reporting: FullLoop admin first, then each tenant.
//
// Three delivery surfaces, reusing existing platform infrastructure rather
// than inventing new ones:
//   1. Email + in-platform admin notification — via the existing notify()
//      helper (same path daily_ops_recap already uses). One call per tenant,
//      recipientType:'admin', channel:'email'.
//   2. Tenant admin communications — a row in tenant_owner_messages
//      (sender_role:'jefe'), so it shows in that tenant's own
//      /dashboard/messages inbox alongside every other admin<->owner thread.
//   3. FL admin Telegram — NOT new: seo-health and seo-volatility already
//      post to the Jefe/"Full Loop CRM" group via alertOwner(). This digest
//      is the summary; those two are the real-time alerts. Not duplicated
//      here to avoid spamming the same channel twice for the same data.
//
// FL-admin-first / tenant-second ordering: the fleet-wide digest (all
// tenants combined) is generated and sent under the platform's own tenant
// (full-loop-crm) BEFORE the per-tenant loop runs.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

const PERIOD_DAYS = 7

export type DigestStats = {
  properties: number
  newIssues: Record<string, number>
  proposed: number
  applied: number
  rejected: number
  rolledBack: number
  sitesDown: number
}

async function statsFor(tenantId: string | null): Promise<DigestStats> {
  const since = new Date(Date.now() - PERIOD_DAYS * 86_400_000).toISOString()

  let propsQuery = supabaseAdmin.from('seo_properties').select('property', { count: 'exact', head: true })
  if (tenantId) propsQuery = propsQuery.eq('tenant_id', tenantId)
  const { count: properties } = await propsQuery

  let issuesQuery = supabaseAdmin.from('seo_issues').select('type').gte('detected_at', since)
  if (tenantId) issuesQuery = issuesQuery.eq('tenant_id', tenantId)
  const { data: issueRows } = await issuesQuery

  const newIssues: Record<string, number> = {}
  for (const r of (issueRows ?? []) as Array<{ type: string }>) {
    newIssues[r.type] = (newIssues[r.type] || 0) + 1
  }

  const changeCount = async (status: string, dateCol: string): Promise<number> => {
    let q = supabaseAdmin.from('seo_changes').select('status', { count: 'exact', head: true }).eq('status', status).gte(dateCol, since)
    if (tenantId) q = q.eq('tenant_id', tenantId)
    const { count } = await q
    return count ?? 0
  }

  const proposed = await changeCount('proposed', 'proposed_at')
  const applied = await changeCount('applied', 'applied_at')
  const rejected = await changeCount('rejected', 'proposed_at')
  const rolledBack = await changeCount('rolled_back', 'verified_at')

  let downQuery = supabaseAdmin
    .from('seo_issues')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
    .eq('type', 'site_down')
  if (tenantId) downQuery = downQuery.eq('tenant_id', tenantId)
  const { count: sitesDown } = await downQuery

  return {
    properties: properties ?? 0,
    newIssues,
    proposed: proposed ?? 0,
    applied: applied ?? 0,
    rejected: rejected ?? 0,
    rolledBack: rolledBack ?? 0,
    sitesDown: sitesDown ?? 0,
  }
}

export function formatDigest(stats: DigestStats, label: string): string {
  const lines = [`seomgr weekly report — ${label}`, '']
  lines.push(`Properties monitored: ${stats.properties}`)
  const issueTypes = Object.entries(stats.newIssues)
  if (issueTypes.length) {
    lines.push('', 'New issues this week:')
    for (const [type, count] of issueTypes) lines.push(`  • ${type}: ${count}`)
  }
  lines.push(
    '',
    `Proposals drafted: ${stats.proposed}`,
    `Autopilot applied: ${stats.applied} | rejected: ${stats.rejected} | reverted: ${stats.rolledBack}`,
  )
  if (stats.sitesDown > 0) lines.push('', `⚠️ ${stats.sitesDown} site(s) currently down — see Telegram alert.`)
  return lines.join('\n')
}

async function sendTenantMessage(tenantId: string, body: string): Promise<void> {
  await supabaseAdmin.from('tenant_owner_messages').insert({
    tenant_id: tenantId,
    direction: 'outbound',
    channel: 'platform',
    body,
    sender: 'seomgr',
    sender_role: 'jefe',
  })
}

export type DigestRunResult = {
  admin: { sent: boolean; error?: string }
  tenants: Array<{ tenant_id: string; slug: string; sent: boolean; error?: string }>
}

/**
 * FL admin first, then every tenant. Each tenant call goes through notify()
 * (email + in-platform admin notification, same path daily_ops_recap uses)
 * AND a tenant_owner_messages row (shows in that tenant's own message inbox).
 */
export async function sendSeoDigests(): Promise<DigestRunResult> {
  const { data: adminTenant } = await supabaseAdmin.from('tenants').select('id').eq('slug', 'full-loop-crm').maybeSingle()
  const result: DigestRunResult = { admin: { sent: false }, tenants: [] }

  if (adminTenant?.id) {
    const fleetStats = await statsFor(null)
    const body = formatDigest(fleetStats, 'fleet-wide')
    const res = await notify({
      tenantId: adminTenant.id,
      type: 'seo_digest',
      title: 'seomgr weekly fleet report',
      message: body,
      channel: 'email',
      recipientType: 'admin',
    })
    result.admin = { sent: res.success, error: res.error }
  }

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, slug')
    .eq('status', 'active')
    .neq('slug', 'full-loop-crm')

  for (const t of (tenants ?? []) as Array<{ id: string; slug: string }>) {
    try {
      const stats = await statsFor(t.id)
      if (stats.properties === 0) continue // not onboarded into seomgr yet — nothing to report
      const body = formatDigest(stats, t.slug)
      const res = await notify({
        tenantId: t.id,
        type: 'seo_digest',
        title: 'Your weekly SEO report',
        message: body,
        channel: 'email',
        recipientType: 'admin',
      })
      await sendTenantMessage(t.id, body)
      result.tenants.push({ tenant_id: t.id, slug: t.slug, sent: res.success, error: res.error })
    } catch (e) {
      result.tenants.push({ tenant_id: t.id, slug: t.slug, sent: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return result
}
