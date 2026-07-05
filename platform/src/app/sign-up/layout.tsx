import { ClerkProvider } from '@clerk/nextjs'

// Clerk is scoped to the segments that use it (see src/app/layout.tsx note).
export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>
}
