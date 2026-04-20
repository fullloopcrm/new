'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense, useEffect } from 'react'

interface TenantLite { name: string; phone?: string | null; primary_color?: string | null }

function UnsubscribeContent({ tenant }: { tenant: TenantLite }) {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('id')
  const channelParam = searchParams.get('channel')
  const successParam = searchParams.get('success')
  const channel = channelParam === 'sms' ? 'sms' : 'email'

  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(!!successParam)

  const primary = tenant.primary_color || '#1E2A4A'

  const handleConfirm = async () => {
    if (!clientId) return
    setConfirming(true)
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, channel }),
      })
      if (res.ok) setDone(true)
      else alert('Something went wrong. Please try again or contact us.')
    } catch {
      alert('Something went wrong. Please try again or contact us.')
    }
    setConfirming(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: primary }}>You&apos;ve been unsubscribed</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            You will no longer receive {channel === 'sms' ? 'text messages' : 'emails'} from {tenant.name}.
          </p>
          {tenant.phone && (
            <p className="text-gray-400 text-xs mt-6">Questions? Text {tenant.phone}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full">
        <h1 className="text-xl font-bold mb-4" style={{ color: primary }}>Unsubscribe from {channel === 'sms' ? 'texts' : 'emails'}?</h1>
        <p className="text-gray-600 text-sm mb-6">
          You&apos;ll stop receiving {channel === 'sms' ? 'text messages' : 'emails'} from {tenant.name}, including appointment reminders and schedule changes.
        </p>
        <button
          onClick={handleConfirm}
          disabled={!clientId || confirming}
          className="w-full py-3 text-white rounded-lg font-semibold disabled:opacity-50"
          style={{ backgroundColor: primary }}
        >
          {confirming ? 'Unsubscribing…' : 'Confirm unsubscribe'}
        </button>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  const [tenant, setTenant] = useState<TenantLite | null>(null)
  useEffect(() => {
    fetch('/api/tenant/public').then(r => r.ok ? r.json() : null).then(t => { if (t) setTenant(t) }).catch(() => {})
  }, [])
  if (!tenant) return <div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>}>
      <UnsubscribeContent tenant={tenant} />
    </Suspense>
  )
}
