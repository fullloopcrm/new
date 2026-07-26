'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PinLoginCard from '@/components/auth/PinLoginCard'
import { FULL_LOOP_CONTACT_URL } from '@/components/auth/AuthShell'

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
  const searchParams = useSearchParams()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function login(overridePin?: string) {
    const submitPin = overridePin ?? pin
    if (submitPin.length < 4 || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: submitPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        setPin('')
        return
      }
      // Deep links from the portal picker (?next=/dashboard) land straight on
      // the tenant surface being visited; a fresh super-admin login with no
      // next= otherwise defaults into the picker instead of the platform
      // panel, since a bare /admin lands you nowhere tenant-specific.
      const next = searchParams.get('next')
      router.push(next || (data.role === 'super_admin' ? '/admin/portals' : '/admin'))
      router.refresh()
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  // Portal-picker deep link (?pin=...&next=...) — auto-fills and submits once.
  const autoSubmitted = useRef(false)
  useEffect(() => {
    const deepLinkPin = searchParams.get('pin')
    if (!deepLinkPin || autoSubmitted.current) return
    autoSubmitted.current = true
    const cleaned = deepLinkPin.replace(/\D/g, '').slice(0, 6)
    setPin(cleaned)
    login(cleaned)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <PinLoginCard
      businessName={businessName}
      value={pin}
      onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
      onSubmit={login}
      error={error}
      loading={loading}
      submitDisabled={pin.length < 4}
      helpLinks={[
        { label: 'Forgot PIN?', href: '/reset-pin' },
        { label: 'Feedback', href: '/feedback' },
        { label: 'Having trouble?', href: FULL_LOOP_CONTACT_URL },
      ]}
    />
  )
}
