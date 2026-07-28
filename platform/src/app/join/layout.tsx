
// Clerk was fully removed (no @clerk/nextjs dependency, mounted nowhere).
// This layout is a passthrough, not a Clerk provider boundary. The
// /join/[token] invite-accept flow it wraps used to dead-end on
// getOwnerUserId() (dormant, see lib/owner-session.ts) — fixed 2026-07-28 to
// mint a real tenant_members PIN via /api/invites/[token]/accept, the same
// working credential mechanism the rest of white-glove onboarding uses (see
// /api/admin/users). An invitee now actually reaches an authenticated
// tenant_admin session instead of a "being finalized" placeholder.
export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
