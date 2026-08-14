'use client'

import { Suspense, useEffect, useState } from 'react'
import AuthShell, {
  authLabelClass,
  authInputClass,
  authButtonClass,
  authErrorClass,
} from '@/components/auth/AuthShell'
import { useAuthLang } from '@/components/auth/useAuthLang'
import { naiveToAnchoredDate } from '@/lib/naive-time'

interface Referrer {
  id: string
  name: string
  email: string
  referral_code: string
  commission_rate: number
  total_earned: number
  total_paid: number
}

interface Commission {
  id: string
  client_name: string
  amount: number
  status: string
  paid_via: string | null
  created_at: string
}

interface PendingBooking {
  id: string
  start_time: string
  status: string
  client_name: string | null
}

interface PortalData {
  referrer: Referrer
  share_url: string | null
  commissions: Commission[]
  pendingBookings: PendingBooking[]
}

const TOKEN_KEY = 'referrer_auth'

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

function formatDate(d: string): string {
  return naiveToAnchoredDate(d).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
}

function getStoredAuth(): { token: string; code: string } | null {
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (!parsed?.token || !parsed?.code) return null
    return parsed
  } catch {
    return null
  }
}

function ReferrerPortalContent() {
  const { lang, setLang, t } = useAuthLang()
  const [auth, setAuth] = useState<{ token: string; code: string } | null>(null)
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.title = 'Referral Portal | The NYC Maid'
    const stored = getStoredAuth()
    if (!stored) { setLoading(false); return }
    setAuth(stored)
    loadPortal(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPortal = async (a: { token: string; code: string }) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/referrers/${a.code}`, { headers: { Authorization: `Bearer ${a.token}` } })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        window.localStorage.removeItem(TOKEN_KEY)
        setAuth(null)
        setError(t('Session expired — please log in again.', 'Sesión expirada — inicia sesión de nuevo.'))
      }
    } catch {
      setError(t('Failed to load your dashboard.', 'Error al cargar tu panel.'))
    }
    setLoading(false)
  }

  const requestCode = async () => {
    if (!email) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/referrers/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStep('code')
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || t('Something went wrong. Please try again.', 'Algo salió mal. Inténtalo de nuevo.'))
      }
    } catch {
      setError(t('Failed to connect. Please try again.', 'Error de conexión. Inténtalo de nuevo.'))
    }
    setBusy(false)
  }

  const verifyCode = async () => {
    if (!code) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/referrers/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.token && d.referral_code) {
        const newAuth = { token: d.token, code: d.referral_code }
        window.localStorage.setItem(TOKEN_KEY, JSON.stringify(newAuth))
        setAuth(newAuth)
        await loadPortal(newAuth)
      } else {
        setError(d.error || t('Invalid or expired code.', 'Código inválido o expirado.'))
      }
    } catch {
      setError(t('Failed to connect. Please try again.', 'Error de conexión. Inténtalo de nuevo.'))
    }
    setBusy(false)
  }

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY)
    setAuth(null)
    setData(null)
    setStep('email')
    setEmail('')
    setCode('')
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>
  }

  if (!auth || !data) {
    return (
      <AuthShell
        businessName="The NYC Maid"
        subtitle={t('Referral Portal', 'Portal de Referidos')}
        lang={lang}
        onToggleLang={setLang}
        helpLinks={[{ label: t('Join the Program', 'Unirme al Programa'), href: '/referral/signup' }]}
      >
        {step === 'email' ? (
          <div className="mt-10">
            <label className={authLabelClass}>{t('Email Address', 'Correo Electrónico')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && requestCode()}
              className={authInputClass}
              placeholder={t('Enter your email', 'Ingresa tu correo')}
              autoFocus
            />
            {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}
            <button onClick={requestCode} disabled={busy || !email} className={`mt-8 ${authButtonClass}`}>
              {busy ? t('Sending…', 'Enviando…') : t('Email me a login code →', 'Enviarme un código →')}
            </button>
          </div>
        ) : (
          <div className="mt-10">
            <p className="font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-500">
              {t('We sent a 6-digit code to', 'Enviamos un código de 6 dígitos a')} <span className="text-neutral-800">{email}</span>.
            </p>
            <div className="mt-6">
              <label className={authLabelClass}>{t('Login Code', 'Código de Acceso')}</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                className={`${authInputClass} text-center text-2xl tracking-[0.4em]`}
                placeholder="000000"
                autoFocus
              />
            </div>
            {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}
            <button onClick={verifyCode} disabled={busy || code.length < 6} className={`mt-8 ${authButtonClass}`}>
              {busy ? t('Verifying…', 'Verificando…') : t('View my earnings →', 'Ver mis ganancias →')}
            </button>
            <button
              onClick={() => { setStep('email'); setCode(''); setError('') }}
              className="mt-4 w-full font-mono text-xs uppercase tracking-wide text-neutral-500"
            >
              {t('← Use a different email', '← Usar otro correo')}
            </button>
          </div>
        )}
      </AuthShell>
    )
  }

  const { referrer, share_url, commissions, pendingBookings } = data
  const pendingAmount = referrer.total_earned - referrer.total_paid
  const referralLink = share_url || '—'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1E2A4A] text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div><h1 className="text-xl font-bold">The NYC Maid</h1><p className="text-gray-400 text-sm">Referral Portal</p></div>
          <div className="text-right">
            <p className="font-medium">{referrer.name}</p>
            <p className="text-gray-400 text-sm">{referrer.referral_code}</p>
            <button onClick={logout} className="text-gray-400 text-xs hover:text-white underline mt-1">Log out</button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 text-center"><p className="text-sm text-gray-500">Total Earned</p><p className="text-3xl font-bold text-[#1E2A4A]">{formatMoney(referrer.total_earned)}</p></div>
          <div className="bg-white rounded-lg shadow p-6 text-center"><p className="text-sm text-gray-500">Paid Out</p><p className="text-3xl font-bold text-green-600">{formatMoney(referrer.total_paid)}</p></div>
          <div className="bg-white rounded-lg shadow p-6 text-center"><p className="text-sm text-gray-500">Pending</p><p className="text-3xl font-bold text-yellow-600">{formatMoney(pendingAmount)}</p></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-[#1E2A4A] mb-3">Your Referral Link</h2>
          <div className="flex gap-3">
            <input type="text" value={referralLink} readOnly className="flex-1 px-4 py-2 bg-gray-50 border rounded-lg text-gray-600 text-sm" />
            <button onClick={() => copy(referralLink)} disabled={!share_url} className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90 disabled:opacity-50">{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Share this link. You earn {referrer.commission_rate}% of every cleaning!</p>
        </div>

        {pendingBookings.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b"><h2 className="font-semibold text-[#1E2A4A]">Scheduled ({pendingBookings.length})</h2><p className="text-xs text-gray-400 mt-1">Becomes a commission once the cleaning is completed.</p></div>
            <div className="divide-y bg-yellow-50/50">
              {pendingBookings.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-[#1E2A4A]">{b.client_name || 'Client'}</p><p className="text-sm text-gray-500">{formatDate(b.start_time)}</p></div>
                  <p className="text-xs font-medium text-yellow-600">awaiting completion</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b"><h2 className="font-semibold text-[#1E2A4A]">Your Referrals ({commissions.length})</h2></div>
          {commissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500"><p>No referrals yet</p><p className="text-sm mt-1">Share your link to start earning!</p></div>
          ) : (
            <div className="divide-y">
              {commissions.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-[#1E2A4A]">{c.client_name}</p><p className="text-sm text-gray-500">{formatDate(c.created_at)}</p></div>
                  <div className="text-right"><p className="font-bold text-green-600">{formatMoney(c.amount)}</p><p className={'text-xs ' + (c.status === 'paid' ? 'text-green-500' : 'text-yellow-500')}>{c.status === 'paid' ? 'Paid via ' + c.paid_via : 'Pending'}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-8 text-center text-sm text-gray-500"><p>Questions? hi@thenycmaid.com</p></div>
      </main>
    </div>
  )
}

export default function ReferrerPortalPage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}><ReferrerPortalContent /></Suspense>
}
