// Smart-scheduling for recurring bookings without an assigned team member.
// One-time bookings always get a suggested_team_member_id via scoreTeamForBooking
// (see api/client/book/route.ts) when nobody picks one manually. Recurring never
// did — the cron's smart-matcher only ran as a FALLBACK when an already-assigned
// member became unavailable (generate-recurring/route.ts), which means a
// schedule created with no team_member_id (e.g. self-booked without picking one)
// never got a suggestion, for any booking, for the life of the schedule.
// Ported from nycmaid's recurring-cleaner-suggest.ts — this is the shared entry
// point for all three creation paths (admin, client self-book, cron) so the
// suggestion logic lives in one place.
import { scoreTeamForBooking, pickBestTeam } from './smart-schedule'
import { getBookingAddress } from './client-properties'

export interface SuggestTeamMemberParams {
  tenantId: string
  clientId: string
  propertyId?: string | null
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  durationHours: number
  hourlyRate?: number | null
}

/** Never throws — a suggestion failure should never block schedule creation. */
export async function suggestTeamMemberForRecurring(params: SuggestTeamMemberParams): Promise<string | null> {
  try {
    const addr = await getBookingAddress({ propertyId: params.propertyId || null, clientId: params.clientId })
    if (!addr.address) return null
    const scores = await scoreTeamForBooking({
      tenantId: params.tenantId,
      date: params.date,
      startTime: params.startTime,
      durationHours: params.durationHours,
      clientAddress: addr.address,
      clientId: params.clientId,
      hourlyRate: params.hourlyRate || undefined,
    })
    const { lead } = pickBestTeam(scores, 1)
    return lead?.id || null
  } catch (e) {
    console.error('suggestTeamMemberForRecurring failed:', e)
    return null
  }
}
