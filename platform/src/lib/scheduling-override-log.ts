// Smart-scheduling upgrade spec, Part 4 item 4: log every time a chosen
// team member differs from what scoreTeamForBooking would have suggested.
// Never throws, never awaited by the caller — same fire-and-forget
// discipline as the booking_notes seed in api/bookings/route.ts. Pure
// training signal; no UI reads this yet, per the spec's own scope for
// this item.
import { supabaseAdmin } from '@/lib/supabase'
import { scoreTeamForBooking, pickBestTeam } from '@/lib/smart-schedule'

export async function logSchedulingOverrideIfAny(opts: {
  tenantId: string
  bookingId: string
  chosenTeamMemberId: string
  date: string
  startTime: string
  durationHours: number
  clientAddress: string
  clientId?: string
  hourlyRate?: number
  source: string
}): Promise<void> {
  try {
    if (!opts.clientAddress) return // nothing to score against
    const scores = await scoreTeamForBooking({
      tenantId: opts.tenantId,
      date: opts.date,
      startTime: opts.startTime,
      durationHours: opts.durationHours,
      clientAddress: opts.clientAddress,
      clientId: opts.clientId,
      hourlyRate: opts.hourlyRate,
    })
    const top = pickBestTeam(scores, 1).lead
    if (!top || top.id === opts.chosenTeamMemberId) return // no override — matched or nobody available

    await supabaseAdmin.from('scheduling_overrides').insert({
      tenant_id: opts.tenantId,
      booking_id: opts.bookingId,
      suggested_team_member_id: top.id,
      suggested_score: top.score,
      chosen_team_member_id: opts.chosenTeamMemberId,
      source: opts.source,
    })
  } catch (e) {
    console.error('[scheduling-override-log] failed:', e)
  }
}
