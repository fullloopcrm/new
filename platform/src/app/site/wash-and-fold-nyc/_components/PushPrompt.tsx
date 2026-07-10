'use client'
import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

interface PushPromptProps {
  role: 'admin' | 'cleaner' | 'client'
  userId?: string // cleaner_id or client_id
}

export default function PushPrompt({ role, userId }: PushPromptProps) {
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/.test(ua)
    setIsIOS(ios)

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setPushSupported(supported)

    if (supported) {
      setPushEnabled(Notification.permission === 'granted')
    } else {
      setPushEnabled(false)
    }
  }, [])

  const enablePush = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setPushLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setPushLoading(false); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { setPushLoading(false); return }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          role,
          cleaner_id: role === 'cleaner' ? userId : undefined,
          client_id: role === 'client' ? userId : undefined
        })
      })

      setPushEnabled(true)
    } catch (err) {
      console.error('Push setup failed:', err)
    }
    setPushLoading(false)
  }

  const disablePush = async () => {
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint })
          })
          await sub.unsubscribe()
        }
      }
      setPushEnabled(false)
    } catch (err) {
      console.error('Push disable failed:', err)
    }
    setPushLoading(false)
  }

  if (pushEnabled === null) return null

  if (pushEnabled) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
        <p className="text-sm text-green-800 font-medium">Push notifications enabled</p>
        <button onClick={disablePush} disabled={pushLoading} className="text-xs text-green-600 hover:text-green-800 underline">
          {pushLoading ? 'Disabling...' : 'Disable'}
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
      {isIOS && !isStandalone ? (
        <>
          <p className="font-medium text-sm text-[#1E2A4A] mb-1">Get push notifications</p>
          <p className="text-xs text-gray-500 mb-0">Tap the Share button below, then &quot;Add to Home Screen&quot;. Open from your home screen, then come back here to enable.</p>
        </>
      ) : pushSupported ? (
        <>
          <p className="font-medium text-sm text-[#1E2A4A] mb-2">Get push notifications on this device</p>
          <button
            onClick={enablePush}
            disabled={pushLoading}
            className="w-full py-2 px-4 bg-[#1E2A4A] text-white text-sm font-medium rounded-lg hover:bg-[#1E2A4A]/90 transition disabled:opacity-50"
          >
            {pushLoading ? 'Enabling...' : 'Enable Push Notifications'}
          </button>
        </>
      ) : (
        <>
          <p className="font-medium text-sm text-[#1E2A4A] mb-1">Push notifications unavailable</p>
          <p className="text-xs text-gray-500">Your browser doesn&apos;t support push. Try Chrome or open from home screen on iPhone.</p>
        </>
      )}
    </div>
  )
}
