import { getAdminUser } from '@/lib/nycmaid/auth'
import { redirect } from 'next/navigation'
import { lookupInvite, acceptInviteForAdmin } from '@/lib/accept-invite'

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = await getAdminUser()

  if (!admin) {
    // Not signed in — send back to join page
    redirect(`/join/${token}`)
  }

  const lookup = await lookupInvite(token)

  if (lookup.status !== 'valid') {
    redirect('/dashboard')
  }

  const result = await acceptInviteForAdmin(lookup.invite, admin)

  if (result.status === 'email_mismatch') {
    // Let /join/[token] render the "wrong account" explanation with the
    // invite's email in context, rather than silently bouncing to /dashboard.
    redirect(`/join/${token}`)
  }

  redirect('/dashboard')
}
