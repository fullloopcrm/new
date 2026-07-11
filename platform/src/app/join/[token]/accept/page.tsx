import { redirect } from 'next/navigation'

// Invite acceptance required a Clerk-authenticated user. Clerk is retired, so
// this route is disabled and redirects to the PIN login.
export default async function AcceptInvitePage() {
  redirect('/admin-login')
}
