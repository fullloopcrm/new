// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: email.trim().toLowerCase(), pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      window.location.href = '/account'
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: '400px', margin: '0 auto', padding: '1.5rem', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Log in</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Enter your email and 4-digit PIN.</p>

      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={inputStyle}
      />
      <input
        type="password"
        inputMode="numeric"
        maxLength={10}
        placeholder="PIN"
        value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
        style={inputStyle}
      />

      {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{error}</p>}

      <button onClick={handleLogin} disabled={loading || !email || pin.length < 4} style={{
        width: '100%',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        border: 'none',
        backgroundColor: '#2563eb',
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
      }}>
        {loading ? 'Logging in...' : 'Log in'}
      </button>

      <p style={{ textAlign: 'center', marginTop: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
        Don&apos;t have an account?{' '}
        <a href="/signup" style={{ color: '#2563eb', fontWeight: 500 }}>Sign up</a>
      </p>
      <p style={{ textAlign: 'center', marginTop: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
        Forgot your PIN?{' '}
        <a href="/forgot-pin" style={{ color: '#2563eb', fontWeight: 500 }}>Reset via email</a>
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
}
