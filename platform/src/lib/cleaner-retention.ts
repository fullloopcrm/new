// Per-cleaner retention (Jeff, 2026-07-27): which cleaners' clients keep
// rebooking vs. which cleaners' clients go quiet. Reuses the exact churn
// definition renurture.ts already computes per client — a client is
// "churned" if they'd qualify for either renurture segment (no upcoming
// booking, no active recurring schedule). This just groups that signal by
// bookings.team_member_id instead of by client. All-time window: every
// distinct client a cleaner has ever completed a booking for.
//
// This can only ever surface an anomaly ("this cleaner's clients don't come
// back") — it can't tell a genuinely bad cleaner apart from one quietly
// steering clients off-platform. That call stays human.
//
// Known limitation: counts against bookings.team_member_id (the primary
// assigned tech) only. Multi-tech team bookings (booking_team_members) don't
// currently add to a second/third tech's served-client count.
import { supabaseAdmin } from '@/lib/supabase'
import { matchesSegmentBase } from '@/lib/nycmaid/renurture'
import { computeChurnFactsByClient, type ClientChurnFacts } from '@/lib/client-churn-facts'

function isChurned(facts: ClientChurnFacts): boolean {
  return matchesSegmentBase('onetime', facts) || matchesSegmentBase('lapsed', facts)
}

export interface CleanerRetentionResult {
  teamMemberId: string
  clientsServed: number
  clientsRetained: number
  retentionRate: number | null // null when clientsServed === 0 — nothing to score yet
}

export function computeCleanerRetention(
  bookings: { client_id: string; team_member_id: string | null; status: string }[],
  churnFactsByClient: Map<string, ClientChurnFacts>,
): CleanerRetentionResult[] {
  const clientsByCleaner = new Map<string, Set<string>>()
  for (const b of bookings) {
    if (b.status !== 'completed' || !b.team_member_id) continue
    if (!clientsByCleaner.has(b.team_member_id)) clientsByCleaner.set(b.team_member_id, new Set())
    clientsByCleaner.get(b.team_member_id)!.add(b.client_id)
  }

  const results: CleanerRetentionResult[] = []
  for (const [teamMemberId, clientIds] of clientsByCleaner) {
    let retained = 0
    for (const clientId of clientIds) {
      const facts = churnFactsByClient.get(clientId)
      if (facts && !isChurned(facts)) retained++
    }
    const clientsServed = clientIds.size
    results.push({
      teamMemberId,
      clientsServed,
      clientsRetained: retained,
      retentionRate: clientsServed > 0 ? Math.round((retained / clientsServed) * 10000) / 100 : null,
    })
  }
  return results
}

async function saveCleanerRetention(tenantId: string, results: CleanerRetentionResult[]): Promise<void> {
  const updatedAt = new Date().toISOString()
  await Promise.all(results.map(r =>
    supabaseAdmin
      .from('team_members')
      .update({
        retention_rate: r.retentionRate,
        clients_served: r.clientsServed,
        clients_retained: r.clientsRetained,
        retention_updated_at: updatedAt,
      })
      .eq('id', r.teamMemberId)
      .eq('tenant_id', tenantId),
  ))
}

// Called from the weekly renurture cron for every active tenant — a fresh
// fetch rather than sharing the sending path's query results, so retention
// still computes for tenants with no Telnyx configured (that gate is
// SMS-specific and shouldn't block a DB rollup).
export async function computeAndSaveCleanerRetention(tenantId: string): Promise<void> {
  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(10000)
  if (!clients) return

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('client_id, team_member_id, status, start_time')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'scheduled', 'in_progress'])
    .limit(10000)
  if (!bookings) return

  const { data: schedules } = await supabaseAdmin
    .from('recurring_schedules')
    .select('client_id, status')
    .eq('tenant_id', tenantId)
    .limit(10000)

  const now = Date.now()
  const churnFactsByClient = computeChurnFactsByClient(clients, bookings, schedules || [], now)
  const results = computeCleanerRetention(bookings, churnFactsByClient)
  await saveCleanerRetention(tenantId, results)
}
