'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'
import PinLoginCard from '@/components/auth/PinLoginCard'

interface TeamLoginFormProps {
  businessName: string
}

export default function TeamLoginForm({ businessName }: TeamLoginFormProps) {
  const { setAuth, t } = useTeamAuth()
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [slug, setSlug] = useState('')
  const [needBusiness, setNeedBusiness] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function login() {
    if (pin.length < 4 || loading) return
    if (needBusiness && !slug) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/team-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // On a tenant's own domain the server resolves the business from the
        // host. Only send a slug if the host couldn't (main host fallback).
        body: JSON.stringify({ pin, tenant_slug: slug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        // 400 = server couldn't resolve a business from the host → ask for it.
        if (res.status === 400) setNeedBusiness(true)
        setError(data.error || 'Login failed')
        setPin('')
        return
      }
      setAuth(data)
      router.push('/team')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PinLoginCard
      businessName={businessName}
      subtitle={t('Team Portal', 'Portal de Equipo')}
      label={t('PIN', 'PIN')}
      placeholder={t('PIN', 'PIN')}
      value={pin}
      onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
      onSubmit={login}
      error={error}
      loading={loading}
      submitDisabled={pin.length < 4 || (needBusiness && !slug)}
      maxLength={6}
      buttonLabel={t('Sign in →', 'Entrar →')}
      loadingLabel={t('Signing in…', 'Entrando…')}
      helpLinks={[{ label: t('Feedback', 'Comentarios'), href: '/feedback' }]}
    >
      {needBusiness && (
        <div>
          <label
            htmlFor="team-business-code"
            className="block font-mono text-xs font-bold uppercase tracking-widest text-neutral-800"
          >
            {t('Business code', 'Código de negocio')}
          </label>
          <input
            id="team-business-code"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="nyc-maid"
            className="mt-2 w-full rounded-none border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
          />
        </div>
      )}
    </PinLoginCard>
  )
}
