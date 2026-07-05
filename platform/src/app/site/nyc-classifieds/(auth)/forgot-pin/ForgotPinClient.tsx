'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ForgotPinClient() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp' | 'new-pin'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-otp', email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')
      setStep('otp')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-otp', email: email.trim().toLowerCase(), code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      if (!data.verified) throw new Error('Verification failed')

      if (!data.hasPin) {
        // User never set a PIN — they need to complete signup
        setError('No account found with a PIN. Please sign up first.')
        return
      }

      // User is now logged in (cookie set by verify-otp)
      setStep('new-pin')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const resetPin = async () => {
    setError('')
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    if (pin !== pinConfirm) {
      setError('PINs do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-pin', pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset PIN')
      router.push('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reset PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: '400px', margin: '0 auto', padding: '1.5rem', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reset your PIN</h1>

      {step === 'email' && (
        <>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Enter the email on your account. We&apos;ll send a verification code.
          </p>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && email.trim() && sendOtp()}
            style={inputStyle}
          />
          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={sendOtp} disabled={loading || !email.trim()} style={btnStyle}>
            {loading ? 'Sending...' : 'Send verification code'}
          </button>
        </>
      )}

      {step === 'otp' && (
        <>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Enter the 6-digit code sent to <strong>{email}</strong>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && code.length === 6 && verifyOtp()}
            style={{ ...inputStyle, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
          />
          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={verifyOtp} disabled={loading || code.length !== 6} style={btnStyle}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            onClick={() => { setStep('email'); setCode(''); setError('') }}
            style={{ ...linkBtnStyle, marginTop: '0.75rem' }}
          >
            Use a different email
          </button>
        </>
      )}

      {step === 'new-pin' && (
        <>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Choose a new 4–10 digit PIN.
          </p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={10}
            placeholder="New PIN"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            style={inputStyle}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={10}
            placeholder="Confirm PIN"
            value={pinConfirm}
            onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && pin.length >= 4 && pin === pinConfirm && resetPin()}
            style={inputStyle}
          />
          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={resetPin} disabled={loading || pin.length < 4 || pin !== pinConfirm} style={btnStyle}>
            {loading ? 'Saving...' : 'Set new PIN'}
          </button>
        </>
      )}

      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.875rem' }}>
        <a href="/login" style={{ color: '#2563eb', fontWeight: 500 }}>Back to login</a>
      </p>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  fontSize: '1rem',
  outline: 'none',
  marginBottom: '0.75rem',
  boxSizing: 'border-box',
}

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '0.5rem',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#fff',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  fontSize: '0.875rem',
  cursor: 'pointer',
  textAlign: 'center',
  width: '100%',
}

const errorStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '0.875rem',
  marginBottom: '0.75rem',
}
