import { redirect } from 'next/navigation'

// Team-invite acceptance was built on Clerk sign-up (it created a
// tenant_members row keyed to the new Clerk user). Clerk is retired, so the
// invite flow is disabled until a PIN-based invite flow replaces it. Members
// are provisioned by platform admin for now.
export default async function JoinPage() {
  redirect('/admin-login')
}
