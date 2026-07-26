import { redirect } from 'next/navigation'

// Messages was folded into Loop Connect (Full Loop Support is now a pinned
// conversation there, and team-to-team DMs were retired in favor of Connect's
// translated 1:1 'team' channels). Keep this route alive as a redirect for
// bookmarks and any lingering links.
export default function MessagesRedirectPage() {
  redirect('/dashboard/connect')
}
