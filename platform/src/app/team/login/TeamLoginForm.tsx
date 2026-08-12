'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTeamAuth } from '../team-auth'
import AuthShell, {
  authLabelClass,
  authInputClass,
  authButtonClass,
  authErrorClass,
} from '@/components/auth/AuthShell'

type Step = 'pin' | 'forgot' | 'forgot-sent'

interface TeamLoginFormProps {
  businessName: string
}

export default function TeamLoginForm({ businessName }: TeamLoginFormProps) {
  return (
    <Suspense fallback={null}>
      <TeamLoginFormInner businessName={businessName} />
    </Suspense>
  )
}

function TeamLoginFormInner({ businessName }: TeamLoginFormProps) {
  const { setAuth, t, lang, setLang } = useTeamAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('pin')
  const [pin, setPin] = useState('')
  const [slug, setSlug] = useState('')
  const [needBusiness, setNeedBusiness] = useState(false)
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function login(overridePin?: string) {
    const submitPin = overridePin ?? pin
    if (submitPin.length < 4 || loading) return
    if (needBusiness && !slug) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/team-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // On a tenant's own domain the server resolves the business from the
        // host. Only send a slug if the host couldn't (main host fallback).
        body: JSON.stringify({ pin: submitPin, tenant_slug: slug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        // 400 = server couldn't resolve a business from the host → ask for it.
        if (res.status === 400) setNeedBusiness(true)
        setError(data.error || t('Login failed', 'Error al iniciar sesión'))
        setPin('')
        return
      }
      setAuth(data)
      router.push('/team')
    } catch {
      setError(t('Connection error', 'Error de conexión'))
    } finally {
      setLoading(false)
    }
  }

  async function requestPin(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim() || (needBusiness && !slug) || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/team-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_pin', contact, tenant_slug: slug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 400) setNeedBusiness(true)
        setError(data.error || t('Could not send a PIN', 'No se pudo enviar el PIN'))
        return
      }
      setStep('forgot-sent')
    } catch {
      setError(t('Connection error', 'Error de conexión'))
    } finally {
      setLoading(false)
    }
  }

  // Portal-picker deep link (?pin=...) — auto-fills and submits once so the
  // "master PIN → pick a tenant → land inside" flow is a single click.
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

  const businessCodeField = needBusiness && (
    <div>
      <label htmlFor="team-business-code" className={authLabelClass}>
        {t('Business code', 'Código de negocio')}
      </label>
      <input
        id="team-business-code"
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        placeholder="nycmaid"
        className={authInputClass}
      />
    </div>
  )

  if (step === 'forgot-sent') {
    return (
      <AuthShell businessName={businessName} subtitle={t('Team Portal', 'Portal de Equipo')} lang={lang} onToggleLang={setLang}>
        <p className="mt-8 font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-500">
          {t('A PIN was sent to you. Check your phone or email, then sign in.', 'Te enviamos un PIN. Revisa tu teléfono o correo, y luego inicia sesión.')}
        </p>
        <button
          type="button"
          onClick={() => {
            setStep('pin')
            setContact('')
            setError('')
          }}
          className={`mt-8 ${authButtonClass}`}
        >
          {t('Back to sign in →', 'Volver a iniciar sesión →')}
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      businessName={businessName}
      subtitle={t('Team Portal', 'Portal de Equipo')}
      lang={lang}
      onToggleLang={setLang}
      helpLinks={[{ label: t('Feedback', 'Comentarios'), href: '/feedback' }]}
    >
      {step === 'pin' ? (
        <form
          className="mt-10"
          onSubmit={(e) => {
            e.preventDefault()
            login()
          }}
        >
          {businessCodeField}

          <div className={needBusiness ? 'mt-6' : ''}>
            <label htmlFor="team-pin" className={authLabelClass}>
              {t('PIN', 'PIN')}
            </label>
            <input
              id="team-pin"
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('PIN', 'PIN')}
              className={authInputClass}
            />
          </div>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button
            type="submit"
            disabled={loading || pin.length < 4 || (needBusiness && !slug)}
            className={`mt-8 ${authButtonClass}`}
          >
            {loading ? t('Signing in…', 'Entrando…') : t('Sign in →', 'Entrar →')}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('forgot')
              setError('')
            }}
            className="mt-4 w-full font-mono text-xs uppercase tracking-wide text-neutral-500"
          >
            {t("Don't have a PIN?", '¿No tienes un PIN?')}
          </button>
        </form>
      ) : (
        <form className="mt-10" onSubmit={requestPin}>
          {businessCodeField}

          <div className={needBusiness ? 'mt-6' : ''}>
            <label htmlFor="team-forgot-contact" className={authLabelClass}>
              {t('Phone or email on file', 'Teléfono o correo registrado')}
            </label>
            <input
              id="team-forgot-contact"
              autoFocus
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              placeholder={t('Phone or email', 'Teléfono o correo')}
              className={authInputClass}
            />
          </div>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !contact.trim() || (needBusiness && !slug)}
            className={`mt-8 ${authButtonClass}`}
          >
            {loading ? t('Sending…', 'Enviando…') : t('Send me a PIN →', 'Enviarme un PIN →')}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('pin')
              setError('')
            }}
            className="mt-4 w-full font-mono text-xs uppercase tracking-wide text-neutral-500"
          >
            {t('Back to sign in', 'Volver a iniciar sesión')}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
