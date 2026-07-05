'use client'

import { useState, useEffect } from 'react'

const DISMISS_KEY = 'push_prompt_dismissed'
const DISMISS_DAYS = 30

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushPrompt() {
  const [show, setShow] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    // Check if push is supported and user hasn't dismissed
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      if (Date.now() - dismissedAt < DISMISS_DAYS * 86400000) return
    }

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (!sub) setShow(true)
      })
    })
  }, [])

  const handleEnable = async () => {
    setSubscribing(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('VAPID key not configured')

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      })

      setShow(false)
    } catch (err) {
      console.error('Push subscription failed:', err)
    } finally {
      setSubscribing(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1e293b',
      color: '#f1f5f9',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      zIndex: 9999,
      fontSize: '0.875rem',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <span>Get notified about messages and replies</span>
      <button
        onClick={handleEnable}
        disabled={subscribing}
        style={{
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 14px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: subscribing ? 'wait' : 'pointer',
          opacity: subscribing ? 0.7 : 1,
        }}
      >
        {subscribing ? 'Enabling...' : 'Enable'}
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          padding: '6px 8px',
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
