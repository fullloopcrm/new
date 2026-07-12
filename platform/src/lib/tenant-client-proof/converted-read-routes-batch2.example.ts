/**
 * PROOF OF CONVERSION — BATCH 2 — NOT WIRED, REVERSIBLE.
 *
 * Same pattern as converted-read-routes.example.ts, three more low-risk GET reads:
 *   - src/app/api/bookings/stats/route.ts   (GET: booking aggregate counts + MTD revenue)
 *   - src/app/api/finance/pending/route.ts  (GET: pending payouts, join + shaping)
 *   - src/app/api/leads/domains/route.ts    (GET: domains + per-domain visit/CTA counts)
 *
 * The conversion is the same two-line change: swap the `supabaseAdmin` import for
 * `tenantClient`, and `const db = tenantClient(tenantId)`. Every `.eq('tenant_id', …)`
 * is KEPT verbatim (defense-in-depth during the RLS rollout window). The live routes
 * are UNCHANGED; deleting this directory reverts the proof with zero impact.
 *
 * As in batch 1 these take `tenantId` directly — auth resolution
 * (`getTenantForRequest()`) is unchanged by the conversion, so a real route keeps its
 * existing resolution line above this code.
 *
 * ⚠ CROSS-TABLE RLS DEPENDENCY (leads/domains): the per-domain counts read
 * `website_visits` scoped by `domain_id`, NOT `tenant_id`. Running them on the scoped
 * client is only safe once `website_visits` ITSELF has an RLS policy (or a policy that
 * joins through `domains.tenant_id`) — otherwise, under RLS, an authenticated token
 * with no matching `website_visits` policy default-denies and the counts go to 0.
 * `website_visits` is not in the 58-table Tier list; converting this route requires
 * either giving `website_visits` a tenant policy first, or keeping its child counts on
 * a KEEP (service_role) path with an explicit tenant check. Flagged for the cutover —
 * see rls-cutover-master-plan.md §"Cross-table read dependencies".
 */
import { tenantClient } from '../tenant-client'

/** Converted read path of GET /api/bookings/stats (multi-query Promise.all + reduce). */
export async function bookingStatsConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — every .from() below is now scoped
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()

  const [{ count: upcoming }, { count: thisWeek }, { count: completed }, { data: paidBookings }] =
    await Promise.all([
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed']),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('start_time', now.toISOString())
        .lt('start_time', weekEnd),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'paid'])
        .gte('start_time', monthStart),
      db
        .from('bookings')
        .select('price')
        .eq('tenant_id', tenantId)
        .eq('payment_status', 'paid')
        .gte('payment_date', monthStart),
    ])

  const revenue = ((paidBookings || []) as Array<{ price: number | null }>).reduce(
    (sum, b) => sum + (b.price || 0),
    0,
  )

  return {
    upcoming: upcoming || 0,
    thisWeek: thisWeek || 0,
    completed: completed || 0,
    revenue,
  }
}

type PendingRow = {
  id: string
  start_time: string
  price: number | null
  team_member_pay: number | null
  actual_hours: number | null
  payment_status: string | null
  team_member_paid: boolean | null
  clients: { name: string } | null
  team_members: { name: string } | null
}

/** Converted read path of GET /api/finance/pending (join + shaping). */
export async function financePendingConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin
  const { data, error } = await db
    .from('bookings')
    .select(
      'id, start_time, price, team_member_pay, actual_hours, payment_status, team_member_paid, clients(name), team_members!bookings_team_member_id_fkey(name)',
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .or('payment_status.neq.paid,team_member_paid.is.null,team_member_paid.eq.false')
    .order('start_time', { ascending: false })
    .limit(100)
  if (error) throw error

  return ((data || []) as unknown as PendingRow[]).map((b) => ({
    id: b.id,
    date: b.start_time,
    client_name: b.clients?.name || 'Unknown',
    cleaner_name: b.team_members?.name || 'Unassigned',
    amount: b.price || 0,
    team_member_pay: b.team_member_pay || 0,
    actual_hours: b.actual_hours || 0,
    payment_status: b.payment_status,
    team_member_paid: b.team_member_paid,
  }))
}

type DomainRow = { id: string; [k: string]: unknown }

/**
 * Converted read path of GET /api/leads/domains.
 * NOTE the cross-table dependency in the module header: the `website_visits` counts
 * are scoped by `domain_id`, not `tenant_id`. Kept identical to the live route to make
 * the dependency visible — do NOT convert this route for real until `website_visits`
 * has its own RLS policy.
 */
export async function leadsDomainsConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin
  const { data: domains } = await db
    .from('domains')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const domainStats = await Promise.all(
    ((domains || []) as DomainRow[]).map(async (domain) => {
      const { count: visits } = await db
        .from('website_visits')
        .select('id', { count: 'exact', head: true })
        .eq('domain_id', domain.id)

      const { count: ctas } = await db
        .from('website_visits')
        .select('id', { count: 'exact', head: true })
        .eq('domain_id', domain.id)
        .not('cta_type', 'is', null)

      return { ...domain, visits: visits || 0, ctas: ctas || 0 }
    }),
  )

  return { domains: domainStats }
}
