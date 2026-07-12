/**
 * PROOF OF CONVERSION — NOT WIRED, REVERSIBLE.
 *
 * These are example-only, RLS-safe versions of the read paths of three real,
 * low-risk GET routes:
 *   - src/app/api/quote-templates/route.ts   (GET: list quote_templates)
 *   - src/app/api/crews/route.ts             (GET: list crews + members)
 *   - src/app/api/clients/stats/route.ts     (GET: client aggregate counts)
 *
 * The point: show that converting a route to `tenantClient()` is a two-line change
 * (swap the import; swap `supabaseAdmin` for `const db = tenantClient(tenantId)`),
 * and that the resulting data access is provably routed through the scoped client
 * — see converted-read-routes.example.test.ts. The `.eq('tenant_id', tenantId)`
 * is KEPT verbatim (defense-in-depth during the RLS rollout window).
 *
 * The live routes are UNCHANGED. Deleting this directory reverts the proof with
 * zero impact. Nothing imports these functions, so they add no route bundle.
 *
 * These take `tenantId` directly rather than calling getTenantForRequest(): auth
 * resolution is unchanged by the conversion, so a real route keeps its existing
 * `const { tenantId } = await getTenantForRequest()` line above this code.
 */
import { tenantClient } from '../tenant-client'

/** Converted read path of GET /api/quote-templates. */
export async function listQuoteTemplatesConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin
  const { data, error } = await db
    .from('quote_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return { templates: data || [] }
}

type CrewMemberRow = {
  team_member_id: string
  team_members: { name: string | null } | { name: string | null }[] | null
}

/** Converted read path of GET /api/crews. */
export async function listCrewsConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin
  const { data: crews, error } = await db
    .from('crews')
    .select('id, name, color, active, crew_members(team_member_id, team_members(id, name))')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  if (error) throw error
  const shaped = (crews || []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    active: c.active,
    members: ((c.crew_members || []) as CrewMemberRow[]).map((m) => {
      const tm = Array.isArray(m.team_members) ? m.team_members[0] : m.team_members
      return { id: m.team_member_id, name: tm?.name || '—' }
    }),
  }))
  return { crews: shaped }
}

/** Converted read path of GET /api/clients/stats (multi-query Promise.all). */
export async function clientStatsConverted(tenantId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — every .from() below is now scoped
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ count: totalClients }, { count: activeClients }, { count: newThisMonth }] =
    await Promise.all([
      db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),
      db
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart),
    ])

  return {
    total: totalClients || 0,
    active: activeClients || 0,
    newThisMonth: newThisMonth || 0,
    inactive: (totalClients || 0) - (activeClients || 0),
  }
}
