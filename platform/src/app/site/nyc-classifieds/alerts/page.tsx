import type { Metadata } from 'next'
import AlertsClient from './AlertsClient'

export const metadata: Metadata = {
  title: "I'm Looking For... — Search Alerts | The NYC Classifieds",
  description: 'Set up alerts for listings you want. Get notified instantly when a matching listing is posted.',
}

export default function AlertsPage() {
  return <AlertsClient />
}
