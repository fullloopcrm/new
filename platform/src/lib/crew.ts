// Shared "who's on this job" display helper. A booking's lead cleaner is
// bookings.team_member_id (joined as `team_members`); additional crew for
// multi-cleaner jobs live in booking_team_members, embedded as
// `booking_team_members` off the same bookings query (see GET /api/bookings
// and src/app/dashboard/page.tsx's fetchYearBookings). Single-cleaner
// bookings often have no booking_team_members rows at all — this falls back
// to the lead-only join so both shapes render the same way.

export interface CrewRow {
  team_member_id: string
  is_lead: boolean
  position?: number | null
  team_members: { id: string; name: string } | null
}

export interface BookingWithCrew {
  team_members?: { name: string | null } | null
  booking_team_members?: CrewRow[] | null
}

/** Lead first, then extras in position order, comma-separated. Falls back to the lead-only join, then "Unassigned". */
export function crewNames(b: BookingWithCrew): string {
  const rows = b.booking_team_members
  if (rows && rows.length > 0) {
    const names = [...rows]
      .sort((a, z) => (a.is_lead === z.is_lead ? (a.position ?? 0) - (z.position ?? 0) : a.is_lead ? -1 : 1))
      .map((r) => r.team_members?.name)
      .filter((n): n is string => Boolean(n))
    if (names.length > 0) return names.join(', ')
  }
  return b.team_members?.name || 'Unassigned'
}
