'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function addDigit(d: string) {
    if (pin.length < 6) setPin(pin + d)
  }

  function clear() {
    setPin('')
  }

  async function login() {
    if (pin.length < 4) return
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold font-heading text-white">Full Loop <span className="text-teal-400">Admin</span></h1>
          <p className="text-sm font-body text-slate-400 mt-1">Enter your admin PIN</p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg font-mono font-bold transition-colors ${
              i < pin.length ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-600'
            }`}>
              {i < pin.length ? '•' : ''}
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((d) => (
            <button
              key={d}
              onClick={() => d === '←' ? clear() : d ? addDigit(d) : null}
              disabled={!d}
              className={`h-14 rounded-xl text-xl font-mono font-medium transition-colors ${
                d ? 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 active:bg-slate-600' : ''
              } ${!d ? 'invisible' : ''}`}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          onClick={login}
          disabled={pin.length < 4 || loading}
          className="w-full mt-6 bg-teal-600 text-white py-3 rounded-xl font-cta font-semibold disabled:opacity-30 hover:bg-teal-500 transition-colors"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  )
}
