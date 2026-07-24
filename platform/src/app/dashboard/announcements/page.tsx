'use client'

import { useWorkerLabel } from '../worker-label-context'
import AnnouncementsTab from './AnnouncementsTab'

export default function AnnouncementsPage() {
  const worker = useWorkerLabel()

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto', display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, margin: 0 }}>Announcements</h1>
        <p style={{ color: '#7a7468', margin: '4px 0 0' }}>
          Post rules and updates — every {worker.singular.toLowerCase()} sees the full history and gets a notification in their portal.
        </p>
      </div>

      <AnnouncementsTab />
    </div>
  )
}
