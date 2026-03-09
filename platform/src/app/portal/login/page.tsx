'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '../layout'

export default function PortalLoginPage() {
  const { setAuth } = usePortalAuth()
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [slug, setSlug] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_code', phone, tenant_slug: slug }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      setStep('code')
    }
    setLoading(false)
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_code', phone, code }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      setAuth(data)
      router.push('/portal')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center pt-16">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Client Portal</h1>
      <p className="text-sm text-gray-500 mb-8">
        {step === 'phone' ? 'Enter your phone number to get started' : 'Enter the code we sent you'}
      </p>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {step === 'phone' && (
        <form onSubmit={sendCode} className="w-full max-w-sm space-y-4">
          <input
            placeholder="Business code (e.g. nyc-maid)"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm"
          />
          <input
            placeholder="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm"
          />
          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Sending...' : 'Send Code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verifyCode} className="w-full max-w-sm space-y-4">
          <input
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-center tracking-widest text-xl font-mono"
          />
          <button type="submit" disabled={loading || code.length !== 6} className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button type="button" onClick={() => setStep('phone')} className="w-full text-sm text-gray-400">
            Back
          </button>
        </form>
      )}
    </div>
  )
}
