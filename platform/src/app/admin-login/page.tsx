'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PinLoginCard from '@/components/auth/PinLoginCard'
import { FULL_LOOP_CONTACT_URL } from '@/components/auth/AuthShell'

export default function AdminLoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function login() {
    if (pin.length < 4 || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        setPin('')
        return
      }
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PinLoginCard
      businessName="Full Loop"
      subtitle="Admin Portal"
      value={pin}
      onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
      onSubmit={login}
      error={error}
      loading={loading}
      submitDisabled={pin.length < 4}
      helpLinks={[
        { label: 'Feedback', href: '/feedback' },
        { label: 'Having trouble?', href: FULL_LOOP_CONTACT_URL },
      ]}
    />
  )
}
