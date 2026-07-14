'use client'

import { useEffect, useState } from 'react'
import { shouldLoadAnalytics } from '@/lib/consent/consent'

/**
 * Renders `children` (analytics/tracking scripts, chat widgets, etc.) only
 * once consent allows it — see {@link shouldLoadAnalytics}. Checked
 * client-side so tenant marketing pages stay statically renderable.
 */
export default function ConsentGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    setAllowed(shouldLoadAnalytics())
  }, [])

  if (!allowed) return null
  return <>{children}</>
}
