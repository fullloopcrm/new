import { supabaseAdmin } from '@/lib/supabase'

const MAX_ATTEMPTS = 5

// team_members.notes is a single TEXT column reused as a JSON blob by several
// independent features (team-portal availability, team-portal notification
// preferences, the admin dashboard's schedule/time-off editor). Each writer
// does read -> merge its own key(s) -> write the WHOLE blob back. Two writers
// racing -- even just two rapid saves from the same user -- can silently lose
// one write: the second writer's merge starts from a snapshot that predates
// the first writer's update, so its overwrite reverts the first change.
//
// Guards every write with a compare-and-swap retry loop: reassert the exact
// notes value we read in the UPDATE's own WHERE clause. On a lost race,
// re-read and re-merge against the NEW value instead of retrying the same
// stale merge (which would just lose again).
export async function casUpdateTeamMemberNotes(
  teamMemberId: string,
  tenantId: string,
  merge: (current: Record<string, unknown>) => Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('notes')
      .eq('id', teamMemberId)
      .eq('tenant_id', tenantId)
      .single()
    if (!member) return null

    const rawNotes = (member.notes as string | null) ?? null
    let current: Record<string, unknown> = {}
    if (rawNotes) {
      try { current = JSON.parse(rawNotes) } catch { current = { text: rawNotes } }
    }
    const next = merge(current)
    const nextRaw = JSON.stringify(next)

    const base = supabaseAdmin
      .from('team_members')
      .update({ notes: nextRaw })
      .eq('id', teamMemberId)
      .eq('tenant_id', tenantId)
    const scoped = rawNotes === null ? base.is('notes', null) : base.eq('notes', rawNotes)

    const { data, error } = await scoped.select('notes').maybeSingle()
    if (error) throw error
    if (data) return next
  }
  throw new Error('casUpdateTeamMemberNotes: exceeded retry attempts under contention')
}
