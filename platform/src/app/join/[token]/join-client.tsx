'use client'

import { useState } from 'react'

interface JoinClientProps {
  token: string
  inviteEmail: string
  tenantName: string
}

interface AcceptResult {
  pin: string
  tenantName: string
  loginUrl: string
}

/**
 * Accept an existing-tenant team invite. Posts to /api/invites/[token]/accept,
 * which mints a real tenant_members PIN (the same credential mechanism every
 * other operator in the platform uses — see /api/admin/users) and returns it
 * once, in the clear, exactly like the operator-facing "add team member" flow
 * does. "Continue" deep-links into the tenant's own /fullloop login with the
 * PIN pre-filled (the same ?pin=&next= mechanism the portal picker already
 * uses), so the invitee lands signed in on the dashboard with zero extra
 * typing — a real, working login, not a dead end.
 */
export default function JoinClient({ token, inviteEmail, tenantName }: JoinClientProps) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AcceptResult | null>(null)

  async function acceptInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not accept this invite.')
        return
      }
      setResult(data)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You&apos;re in!</h1>
          <p className="text-gray-600">
            Your login PIN for <strong>{result.tenantName}</strong> is:
          </p>
          <p className="text-4xl font-mono font-bold tracking-widest text-gray-900 my-4">{result.pin}</p>
          <p className="text-sm text-gray-500 mb-6">
            Save this PIN — it won&apos;t be shown again. You can always sign in at{' '}
            <span className="font-medium">{result.loginUrl.replace(/^https?:\/\//, '')}</span>.
          </p>
          <a
            href={`${result.loginUrl}?pin=${result.pin}&next=/dashboard`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue to {result.tenantName} →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Full Loop CRM</h1>
          <p className="text-gray-600">
            You&apos;ve been invited to manage <strong>{tenantName}</strong>.
          </p>
          <p className="text-sm text-gray-500 mt-2">Invited as {inviteEmail}</p>
        </div>
        <form onSubmit={acceptInvite} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Accepting...' : 'Accept Invite'}
          </button>
        </form>
      </div>
    </div>
  )
}
