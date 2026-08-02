'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePortalAuth } from '../layout'
import AuthShell, {
  authLabelClass,
  authInputClass,
  authButtonClass,
  authErrorClass,
} from '@/components/auth/AuthShell'

type Step = 'pin' | 'forgot' | 'forgot-sent'

interface PortalLoginFormProps {
  businessName: string
}

export default function PortalLoginForm({ businessName }: PortalLoginFormProps) {
  return (
    <Suspense fallback={null}>
      <PortalLoginFormInner businessName={businessName} />
    </Suspense>
  )
}

function PortalLoginFormInner({ businessName }: PortalLoginFormProps) {
  const { setAuth, t, lang, setLang } = usePortalAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('pin')
  const [slug, setSlug] = useState('')
  const [needBusiness, setNeedBusiness] = useState(false)
  const [pin, setPin] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function updateSlug(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  async function login(e?: React.FormEvent, overridePin?: string) {
    e?.preventDefault()
    const submitPin = overridePin ?? pin
    if (submitPin.length < 4 || (needBusiness && !slug) || loading) return
    setLoading(true)
    setError('')
    try {
      // On a tenant's own domain the server resolves the business from the
      // host. Only send a slug if the host couldn't (main host fallback).
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', pin: submitPin, tenant_slug: slug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        // The server couldn't resolve a business from the host → ask for it.
        if (data.error === 'Business code required') setNeedBusiness(true)
        setError(data.error || t('Login failed', 'Error al iniciar sesión'))
        setPin('')
        return
      }
      setAuth(data)
      router.push('/portal')
    } catch {
      setError(t('Connection error', 'Error de conexión'))
    } finally {
      setLoading(false)
    }
  }

  // Portal-picker deep link (?pin=...) — auto-fills and submits once.
  const autoSubmitted = useRef(false)
  useEffect(() => {
    const deepLinkPin = searchParams.get('pin')
    if (!deepLinkPin || autoSubmitted.current) return
    autoSubmitted.current = true
    const cleaned = deepLinkPin.replace(/\D/g, '').slice(0, 6)
    setPin(cleaned)
    login(undefined, cleaned)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function requestPin(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim() || (needBusiness && !slug) || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_pin', contact, tenant_slug: slug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'Business code required') setNeedBusiness(true)
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

  if (step === 'forgot-sent') {
    return (
      <AuthShell businessName={businessName} subtitle={t('Client Portal', 'Portal de Cliente')} lang={lang} onToggleLang={setLang}>
        <p className="mt-8 font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-500">
          {t('A PIN was emailed to you. Check your inbox, then sign in.', 'Te enviamos un PIN por correo. Revisa tu bandeja de entrada y luego inicia sesión.')}
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
      subtitle={t('Client Portal', 'Portal de Cliente')}
      lang={lang}
      onToggleLang={setLang}
    >
      {step === 'pin' ? (
        <form className="mt-10" onSubmit={login}>
          {needBusiness && (
            <div>
              <label htmlFor="portal-slug" className={authLabelClass}>
                {t('Business code', 'Código de negocio')}
              </label>
              <input
                id="portal-slug"
                value={slug}
                onChange={(e) => updateSlug(e.target.value)}
                placeholder="nycmaid"
                className={authInputClass}
              />
            </div>
          )}

          <div className={needBusiness ? 'mt-6' : ''}>
            <label htmlFor="portal-pin" className={authLabelClass}>
              {t('PIN', 'PIN')}
            </label>
            <input
              id="portal-pin"
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
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
          {needBusiness && (
            <div>
              <label htmlFor="forgot-slug" className={authLabelClass}>
                {t('Business code', 'Código de negocio')}
              </label>
              <input
                id="forgot-slug"
                value={slug}
                onChange={(e) => updateSlug(e.target.value)}
                placeholder="nycmaid"
                className={authInputClass}
              />
            </div>
          )}

          <div className={needBusiness ? 'mt-6' : ''}>
            <label htmlFor="forgot-contact" className={authLabelClass}>
              {t('Phone or email on file', 'Teléfono o correo registrado')}
            </label>
            <input
              id="forgot-contact"
              autoFocus
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              placeholder={t('Phone or email', 'Teléfono o correo')}
              className={authInputClass}
            />
          </div>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button type="submit" disabled={loading || (needBusiness && !slug)} className={`mt-8 ${authButtonClass}`}>
            {loading ? t('Sending…', 'Enviando…') : t('Email me a PIN →', 'Enviarme un PIN →')}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('pin')
              setError('')
            }}
            className="mt-4 w-full font-mono text-xs uppercase tracking-wide text-neutral-500"
          >
            {t('← Back', '← Volver')}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
