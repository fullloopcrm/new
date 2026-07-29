'use client'

import { useState } from 'react'

interface PayoutSettingsProps {
  salesPartnerId: string
  token: string
  stripeConnectAccountId: string | null
  monthlyGoalCents: number | null
  onSaved: (updates: { preferred_payout: string; monthly_goal_cents: number | null }) => void
}

export default function PayoutSettings({ salesPartnerId, token, stripeConnectAccountId, monthlyGoalCents, onSaved }: PayoutSettingsProps) {
  const [goal, setGoal] = useState(monthlyGoalCents ? String(monthlyGoalCents / 100) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const connectStripe = async () => {
    setConnecting(true)
    try {
      const res = await fetch(`/api/sales-partners/${salesPartnerId}/stripe-onboard`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok && data.url) window.location.href = data.url
      else alert(data.error || 'Error setting up Stripe Connect')
    } catch {
      alert('Error setting up Stripe Connect')
    } finally {
      setConnecting(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    const goalCents = goal.trim() ? Math.round(parseFloat(goal) * 100) : null
    const updates = {
      preferred_payout: 'stripe_connect',
      monthly_goal_cents: goalCents,
    }

    try {
      const res = await fetch('/api/sales-partners/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        setSaved(true)
        onSaved(updates)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
      <h2 className="font-semibold text-[#1E2A4A] mb-1">Payout Settings</h2>
      <p className="text-sm text-gray-500 mb-4">Connect Stripe to get paid — the only payout method.</p>

      <div className="space-y-4">
        <div>
          {stripeConnectAccountId ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <span>✓ Stripe account connected</span>
            </div>
          ) : (
            <div>
              <button onClick={connectStripe} disabled={connecting} className="px-4 py-2.5 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50">
                {connecting ? 'Redirecting…' : 'Connect with Stripe'}
              </button>
              <p className="text-xs text-gray-400 mt-2">You&apos;ll be sent to Stripe to verify your identity and add a bank account. Takes a few minutes.</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly earnings goal (optional)</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">$</span>
            <input type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="1000" className="w-full px-4 py-2.5 border rounded-lg text-[#1E2A4A]" />
          </div>
        </div>

        <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50">
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
