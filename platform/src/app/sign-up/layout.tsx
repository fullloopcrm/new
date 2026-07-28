
// Clerk was fully removed (no @clerk/nextjs dependency, mounted nowhere) —
// FullLoop is white-glove onboarded, not self-serve. This route redirects to
// /waitlist; see the comment atop src/app/sign-up/[[...sign-up]]/page.tsx.
// This layout is a passthrough, not a Clerk provider boundary.
export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
