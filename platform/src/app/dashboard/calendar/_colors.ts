// Shared team-member color resolution for every calendar view (Month / Timeline
// / Kanban / Projects) so one member reads as the SAME color everywhere.
// Palette matches the one CalendarBoard + TimelineView already use.
export const TEAM_COLOR_PALETTE = [
  '#0d9488', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#f97316',
]

// slate-400 — jobs with no assigned member.
export const UNASSIGNED_COLOR = '#94a3b8'

export interface ColorableMember {
  id: string
  calendar_color?: string | null
}

// Build an id → color map. Prefers the member's saved calendar_color, else a
// stable palette slot by index (the /api/team list order is stable across views).
export function buildMemberColors(members: ColorableMember[]): Record<string, string> {
  const colors: Record<string, string> = {}
  members.forEach((m, i) => {
    colors[m.id] = m.calendar_color || TEAM_COLOR_PALETTE[i % TEAM_COLOR_PALETTE.length]
  })
  return colors
}

// Resolve a booking's color from its team_member_id.
export function colorForMember(
  colors: Record<string, string>,
  teamMemberId: string | null | undefined,
): string {
  return (teamMemberId && colors[teamMemberId]) || UNASSIGNED_COLOR
}
