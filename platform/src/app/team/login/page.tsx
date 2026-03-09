'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'

export default function TeamLoginPage() {
  const { setAuth, t } = useTeamAuth()
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function addDigit(d: string) {
    if (pin.length < 4) setPin(pin + d)
  }

  function clear() {
    setPin('')
  }

  async function login() {
    if (pin.length !== 4 || !slug) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/team-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, tenant_slug: slug }),
      })
      const data = await res.json()
      if (!res.ok) {
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
    <div className="flex flex-col items-center pt-12">
      <h1 className="text-xl font-bold text-slate-800 mb-2">{t('Team Login', 'Inicio de Sesión')}</h1>
      <p className="text-sm text-slate-400 mb-6">{t('Enter your 4-digit PIN', 'Ingresa tu PIN de 4 dígitos')}</p>

      <input
        placeholder={t('Business code', 'Código de negocio')}
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        className="w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center mb-4"
      />

      <div className="flex gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl font-bold ${
            i < pin.length ? 'border-slate-800 bg-slate-800 text-white' : 'border-gray-300'
          }`}>
            {i < pin.length ? '•' : ''}
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-64">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((d) => (
          <button
            key={d}
            onClick={() => d === '←' ? clear() : d ? addDigit(d) : null}
            disabled={!d}
            className={`h-14 rounded-xl text-xl font-medium transition-colors ${
              d ? 'bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100' : ''
            } ${!d ? 'invisible' : ''}`}
          >
            {d}
          </button>
        ))}
      </div>

      <button
        onClick={login}
        disabled={pin.length !== 4 || !slug || loading}
        className="w-64 mt-6 bg-slate-800 text-white py-3 rounded-xl font-medium disabled:opacity-30"
      >
        {loading ? t('Logging in...', 'Entrando...') : t('Login', 'Entrar')}
      </button>
    </div>
  )
}
