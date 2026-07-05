import type { Metadata } from 'next'
import ThreadClient from './ThreadClient'

export const metadata: Metadata = {
  title: 'Conversation',
  robots: { index: false, follow: false },
}

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  return <ThreadClient threadId={threadId} />
}
