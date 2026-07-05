import type { Metadata } from 'next'
import InboxClient from './InboxClient'

export const metadata: Metadata = {
  title: 'Messages',
  description: 'View and manage your messages from NYC Classifieds users.',
  robots: { index: false, follow: false },
}

export default function MessagesPage() {
  return <InboxClient />
}
