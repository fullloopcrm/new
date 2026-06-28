// Jefe — Full Loop's platform GM. Jefe does NOT care about any tenant's revenue,
// clients, or day-to-day operations. Jefe cares about FULL LOOP itself:
//   - growth: the product's own sales pipeline (inquiries / prospects)
//   - security & stability: security events, errors, comms failures
//   - getting ahead of tenant problems BEFORE the tenant notices, so we can
//     reach out and fix them immediately
//
// This is Jefe's data layer. Every signal is platform-wide, with per-tenant
// attribution so Jefe can say "the-florida-maid has 3 comms failures — reach out."
import { supabaseAdmin } from '@/lib/supabase'

// Notification types that represent a PROBLEM worth surfacing to the operator.
export const ISSUE_TYPES = [
  'error',
  'selena_error',
  'comms_fail',
  'comms_monitor_alert',
  'schedule_issue',
  'security',
] as const

export interface TenantIssues {
  tenant_id: string
  tenant_name: string
  total: number
  by_type: Record<string, number>
  latest: string // most recent issue title/message, trimmed
  latest_at: string
}

export interface RecentIssue {
  tenant_id: string | null
  tenant_name: string
  type: string
  title: string
  message: string
  created_at: string
}

export interface PlatformHealth {
  generated_at: string
  sales: {
    inquiries_total: number
    inquiries_new_7d: number
    prospects_total: number
  }
  security: {
    events_24h: number
  }
  stability: {
    issues_24h: number
    issues_7d: number
  }
  // Tenants with active problems, worst first — this is what Jefe acts on.
  tenants_with_issues: TenantIssues[]
  recent_issues: RecentIssue[]
}

const hoursAgo = (now: Date, h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()

export async function getPlatformHealth(now: Date = new Date()): Promise<PlatformHealth> {
  const since7d = hoursAgo(now, 24 * 7)
  const since24h = hoursAgo(now, 24)

  const [tenantsRes, issuesRes, inquiriesTotalRes, inquiriesNewRes, prospectsRes, secRes] = await Promise.all([
    supabaseAdmin.from('tenants').select('id, name').neq('status', 'deleted'),
    supabaseAdmin
      .from('notifications')
      .select('tenant_id, type, title, message, created_at')
      .in('type', ISSUE_TYPES as unknown as string[])
      .gte('created_at', since7d)
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('inquiries').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('inquiries').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    supabaseAdmin.from('prospects').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('security_events').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
  ])

  const nameById = new Map<string, string>(
    ((tenantsRes.data || []) as { id: string; name: string }[]).map((t) => [t.id, t.name]),
  )
  const issues = (issuesRes.data || []) as Array<{ tenant_id: string | null; type: string; title: string | null; message: string | null; created_at: string }>

  // Per-tenant aggregation (7d window).
  const byTenant = new Map<string, TenantIssues>()
  let issues24h = 0
  for (const it of issues) {
    if (it.created_at >= since24h) issues24h++
    const tid = it.tenant_id || 'platform'
    const name = it.tenant_id ? nameById.get(it.tenant_id) || 'unknown tenant' : 'platform-wide'
    const cur = byTenant.get(tid) || { tenant_id: tid, tenant_name: name, total: 0, by_type: {}, latest: '', latest_at: '' }
    cur.total++
    cur.by_type[it.type] = (cur.by_type[it.type] || 0) + 1
    if (!cur.latest_at) {
      cur.latest = (it.title || it.message || it.type).slice(0, 140)
      cur.latest_at = it.created_at
    }
    byTenant.set(tid, cur)
  }

  const tenants_with_issues = [...byTenant.values()].sort((a, b) => b.total - a.total)

  const recent_issues: RecentIssue[] = issues.slice(0, 15).map((it) => ({
    tenant_id: it.tenant_id,
    tenant_name: it.tenant_id ? nameById.get(it.tenant_id) || 'unknown tenant' : 'platform-wide',
    type: it.type,
    title: it.title || '',
    message: (it.message || '').slice(0, 200),
    created_at: it.created_at,
  }))

  return {
    generated_at: now.toISOString(),
    sales: {
      inquiries_total: inquiriesTotalRes.count || 0,
      inquiries_new_7d: inquiriesNewRes.count || 0,
      prospects_total: prospectsRes.count || 0,
    },
    security: { events_24h: secRes.count || 0 },
    stability: { issues_24h: issues24h, issues_7d: issues.length },
    tenants_with_issues,
    recent_issues,
  }
}
