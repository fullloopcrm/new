'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('id')
  const channelParam = searchParams.get('channel')
  const success = searchParams.get('success')

  const channel = channelParam === 'sms' ? 'sms' : 'email'
  const channelLabel = channel === 'sms' ? 'SMS' : 'Email'

  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(!!success)

  const handleConfirm = async () => {
    if (!clientId) return
    setConfirming(true)
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, channel }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        alert('Something went wrong. Please try again or call us.')
      }
    } catch {
      alert('Something went wrong. Please try again or call us.')
    }
    setConfirming(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;ve been unsubscribed</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            You will no longer receive {channel === 'sms' ? 'text messages' : 'emails'} from The NYC Maid,
            including appointment reminders, schedule changes, and specials.
          </p>
          <p className="text-gray-400 text-xs mt-6">
            Questions? Call <a href="tel:6464900130" className="text-gray-600 underline">(646) 490-0130</a>
          </p>
        </div>
      </div>
    )
  }

  if (!clientId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500 text-sm">This unsubscribe link appears to be invalid or expired.</p>
          <p className="text-gray-400 text-xs mt-6">
            Questions? Call <a href="tel:6464900130" className="text-gray-600 underline">(646) 490-0130</a>
          </p>
        </div>
      </div>
    )
  }

  // Warning / confirmation screen
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-3">Unsubscribe from {channelLabel}?</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-left">
          <p className="text-amber-800 text-sm font-semibold mb-2">This will stop ALL {channel === 'sms' ? 'text messages' : 'emails'} from The NYC Maid, including:</p>
          <ul className="text-amber-700 text-sm space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              Appointment reminders &amp; confirmations
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              Schedule changes &amp; account updates
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              Specials &amp; promotional offers
            </li>
          </ul>
        </div>
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Keep Subscribed
          </a>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {confirming ? 'Unsubscribing...' : 'Yes, Unsubscribe'}
          </button>
        </div>
        <p className="text-gray-400 text-xs mt-6">
          Questions? Call <a href="tel:6464900130" className="text-gray-600 underline">(646) 490-0130</a>
        </p>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
