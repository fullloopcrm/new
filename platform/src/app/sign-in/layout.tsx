
// Clerk was fully removed (no @clerk/nextjs dependency, mounted nowhere) —
// FullLoop is white-glove onboarded, not self-serve. See the comment atop
// src/app/sign-in/[[...sign-in]]/page.tsx for the real login path. This
// layout is a passthrough, not a Clerk provider boundary.
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
