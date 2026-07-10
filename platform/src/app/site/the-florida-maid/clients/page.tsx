'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ClientPortalContent() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    document.title = 'Client Portal | The Florida Maid'
    const ref = searchParams.get('ref')
    if (ref) {
      router.replace('/portal/book?ref=' + ref)
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase().trim(), pin })
    })

    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('client_id', data.client.id)
      localStorage.setItem('client_name', data.client.name || 'Client')
      if (data.client.do_not_service) {
        localStorage.setItem('client_dns', 'true')
      } else {
        localStorage.removeItem('client_dns')
      }
      router.push('/portal')
    } else {
      const data = await res.json().catch(() => ({}))
      if (data.error === 'Client not found') {
        setError('No account found with this email. Text (954) 710-3636 to book.')
      } else {
        setError('Invalid email or PIN. Check your booking confirmation email for your PIN.')
      }
    }
    setLoading(false)
  }

  const ref = searchParams.get('ref')
  if (ref) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1E2A4A]">Client Portal</h1>
          <p className="text-gray-500 mt-1">View and manage your bookings</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A]"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A] text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Your PIN was included in your booking confirmation email.</p>
            </div>
            <button
              type="submit"
              disabled={loading || pin.length < 6 || !email}
              className="w-full py-3 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-gray-500">
            New client?{' '}
            <a href="/portal/book" className="text-[#1E2A4A] hover:underline">Book your first cleaning</a>
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">Questions? Call (954) 710-3636</p>
        </div>
      </div>
    </div>
  )
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <ClientPortalContent />
    </Suspense>
  )
}
