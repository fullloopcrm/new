
// Clerk was fully removed (no @clerk/nextjs dependency, mounted nowhere).
// This layout is a passthrough, not a Clerk provider boundary. The
// /join/[token] invite-accept flow it wraps still depends on
// getOwnerUserId(), which is dormant (see lib/owner-session.ts) — an
// invitee landing here today sees "account setup is being finalized," a
// dead end, not a real acceptance flow. Noticed but out of scope for the
// 2026-07-28 onboarding-model cleanup (self-serve vs. white-glove for NEW
// tenant creation); this is the separate existing-tenant team-invite path.
export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
