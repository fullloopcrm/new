'use client'
import {useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  useEffect(() => { document.title = 'Admin Login | The Florida Maid' }, []);
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (attempts >= 5) {
      setError('Too many attempts. Please wait 5 minutes.')
      return
    }

    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      setAttempts(prev => prev + 1)
      setError(`Invalid PIN. ${5 - attempts - 1} attempts remaining.`)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#1E2A4A]">The Florida Maid</h1>
            <p className="text-gray-500 mt-1">Admin Portal</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-[#1E2A4A] mb-1">PIN</label>
              <input
                type="password"
                required
                inputMode="numeric"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none"
                placeholder="Enter your PIN"
                disabled={attempts >= 5}
              />
            </div>
            {error && <p className="mt-3 text-red-600 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || attempts >= 5}
              className="w-full mt-4 py-3 bg-[#1E2A4A] text-white font-semibold rounded-lg hover:bg-[#1E2A4A]/90 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
