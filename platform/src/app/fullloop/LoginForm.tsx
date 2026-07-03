'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PinLoginCard from '@/components/auth/PinLoginCard'

interface LoginFormProps {
  businessName: string
}

/**
 * Editorial single-field operator login. The credential is matched against THIS
 * domain's tenant_members PIN hash (see /api/admin-auth); email is intentionally
 * absent because the backend has no email lookup — it is PIN-only.
 */
export default function LoginForm({ businessName }: LoginFormProps) {
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
      businessName={businessName}
      value={pin}
      onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
      onSubmit={login}
      error={error}
      loading={loading}
      submitDisabled={pin.length < 4}
    />
  )
}
