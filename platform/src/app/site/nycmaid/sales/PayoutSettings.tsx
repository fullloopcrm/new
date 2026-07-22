'use client'

import { useState } from 'react'

interface PayoutSettingsProps {
  salesPartnerId: string
  token: string
  preferredPayout: string | null
  zelleEmail: string | null
  zellePhone: string | null
  appleCashPhone: string | null
  stripeConnectAccountId: string | null
  monthlyGoalCents: number | null
  onSaved: (updates: { preferred_payout: string; zelle_email: string | null; zelle_phone: string | null; apple_cash_phone: string | null; monthly_goal_cents: number | null }) => void
}

export default function PayoutSettings({ salesPartnerId, token, preferredPayout, zelleEmail, zellePhone, appleCashPhone, stripeConnectAccountId, monthlyGoalCents, onSaved }: PayoutSettingsProps) {
  const [method, setMethod] = useState(preferredPayout || 'zelle')
  const [zelle, setZelle] = useState(zelleEmail || zellePhone || '')
  const [appleCash, setAppleCash] = useState(appleCashPhone || '')
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
    const isZelleEmail = zelle.includes('@')
    const goalCents = goal.trim() ? Math.round(parseFloat(goal) * 100) : null
    const updates = {
      preferred_payout: method,
      zelle_email: method === 'zelle' && isZelleEmail ? zelle : null,
      zelle_phone: method === 'zelle' && !isZelleEmail ? zelle : null,
      apple_cash_phone: method === 'apple_cash' ? appleCash : null,
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
      <p className="text-sm text-gray-500 mb-4">Connect Stripe for instant payouts, or get paid manually via Zelle or Apple Cash.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payout method</label>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setMethod('stripe_connect')} className={`px-4 py-2 rounded-lg text-sm font-medium ${method === 'stripe_connect' ? 'bg-[#1E2A4A] text-white' : 'bg-gray-100 text-gray-600'}`}>Stripe (instant)</button>
            <button onClick={() => setMethod('zelle')} className={`px-4 py-2 rounded-lg text-sm font-medium ${method === 'zelle' ? 'bg-[#1E2A4A] text-white' : 'bg-gray-100 text-gray-600'}`}>Zelle</button>
            <button onClick={() => setMethod('apple_cash')} className={`px-4 py-2 rounded-lg text-sm font-medium ${method === 'apple_cash' ? 'bg-[#1E2A4A] text-white' : 'bg-gray-100 text-gray-600'}`}>Apple Cash</button>
          </div>
        </div>

        {method === 'stripe_connect' ? (
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
        ) : method === 'zelle' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zelle email or phone</label>
            <input type="text" value={zelle} onChange={(e) => setZelle(e.target.value)} placeholder="you@example.com or (212) 555-1234" className="w-full px-4 py-2.5 border rounded-lg text-[#1E2A4A]" />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apple Cash phone</label>
            <input type="text" value={appleCash} onChange={(e) => setAppleCash(e.target.value)} placeholder="(212) 555-1234" className="w-full px-4 py-2.5 border rounded-lg text-[#1E2A4A]" />
          </div>
        )}

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
