'use client'
import { useEffect, useState } from 'react'

interface LocationData {
  lat?: number
  lng?: number
  distance_miles?: number
  address_lat?: number
  address_lng?: number
  flagged?: boolean
}

interface Activity {
  type: string
  title: string
  description: string
  timestamp: string
  location?: LocationData
}

const typeConfig: Record<string, { color: string; icon: string }> = {
  client_created: { color: 'bg-blue-500', icon: '+' },
  booking_created: { color: 'bg-indigo-500', icon: 'B' },
  check_in: { color: 'bg-green-500', icon: '\u2713' },
  check_out: { color: 'bg-emerald-500', icon: '\u2713' },
  booking_cancelled: { color: 'bg-red-500', icon: 'X' },
  payment_received: { color: 'bg-yellow-500', icon: '$' },
}

export default function ClientActivityFeed({ clientId }: { clientId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/clients/${clientId}/activity`)
        if (res.ok) setActivities(await res.json())
      } catch (e) {
        console.error('Failed to load activity:', e)
      }
      setLoading(false)
    }
    load()
  }, [clientId])

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading activity...</div>
  if (activities.length === 0) return <div className="text-sm text-gray-400 py-4">No activity yet</div>

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="space-y-0">
      {activities.map((a, i) => {
        const cfg = typeConfig[a.type] || { color: 'bg-gray-400', icon: '?' }
        const loc = a.location
        const hasGPS = loc && loc.lat !== undefined && loc.lng !== undefined
        const hasVerification = loc && loc.distance_miles !== undefined
        const flagged = loc?.flagged

        return (
          <div key={i} className="flex gap-3 relative">
            {/* Line */}
            {i < activities.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
            )}
            {/* Icon */}
            <div className={`w-6 h-6 rounded-full ${flagged ? 'bg-red-500' : cfg.color} text-white flex items-center justify-center text-[10px] font-bold shrink-0 z-10`}>
              {cfg.icon}
            </div>
            {/* Content */}
            <div className="pb-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-black">{a.title}</p>
              {a.description && <p className="text-sm text-gray-500">{a.description}</p>}
              {/* GPS Proof */}
              {hasGPS && (a.type === 'check_in' || a.type === 'check_out') && (
                <div className={`mt-1.5 text-xs rounded-md px-2.5 py-2 ${flagged ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {flagged ? (
                      <span className="text-red-600 font-semibold">GPS MISMATCH</span>
                    ) : (
                      <span className="text-green-700 font-semibold">GPS Verified</span>
                    )}
                  </div>
                  <div className={`font-mono ${flagged ? 'text-red-600' : 'text-green-700'}`}>
                    {loc!.lat!.toFixed(6)}, {loc!.lng!.toFixed(6)}
                  </div>
                  {hasVerification && (
                    <div className={`mt-0.5 ${flagged ? 'text-red-600' : 'text-green-600'}`}>
                      {loc!.distance_miles!.toFixed(2)} mi from client address
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-0.5">{formatTime(a.timestamp)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
