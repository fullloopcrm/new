'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PinLoginCard from './PinLoginCard'
import { FULL_LOOP_CONTACT_URL } from './AuthShell'

interface SiteAdminLoginClientProps {
  businessName: string
  docTitle: string
}

/**
 * Per-tenant marketing-site admin login. Credential is matched by
 * /api/auth/login (host-resolved, PIN-only). Shared so every site's login
 * carries identical branding — edit the card once, all sites update.
 */
export default function SiteAdminLoginClient({ businessName, docTitle }: SiteAdminLoginClientProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    document.title = docTitle
  }, [docTitle])

  async function login() {
    if (attempts >= 5) {
      setError('Too many attempts. Please wait 5 minutes.')
      return
    }
    if (!password || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/admin')
        return
      }
      setAttempts((prev) => prev + 1)
      setError(`Invalid PIN. ${5 - attempts - 1} attempts remaining.`)
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PinLoginCard
      businessName={businessName}
      value={password}
      onChange={setPassword}
      onSubmit={login}
      error={error}
      loading={loading}
      submitDisabled={attempts >= 5 || !password}
      maxLength={16}
      helpLinks={[
        { label: 'Feedback', href: '/feedback' },
        { label: 'Having trouble?', href: FULL_LOOP_CONTACT_URL },
      ]}
    />
  )
}
