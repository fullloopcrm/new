'use client'

import { useEffect, useState } from 'react'
import { usePageSettings, PageSettingsPanel } from '@/components/page-settings'

type ChannelPrefs = { email: boolean; sms: boolean; in_app: boolean }
type Policy = { cancellationPolicyOneTime?: string; cancellationPolicyRecurring?: string; prepTips?: string; [key: string]: unknown }
type Preferences = { comms: Record<string, ChannelPrefs>; timing: Record<string, unknown>; policy: Policy }

const EVENT_LABELS: Record<string, string> = {
  booking_reminder: 'Booking reminder',
  booking_confirmed: 'Booking confirmed',
  payment_received: 'Payment received',
  new_review: 'New review',
  new_referral: 'New referral',
  daily_summary: 'Daily summary',
  follow_up: 'Follow-up',
  team_checkin: 'Team check-in',
}

const CHANNELS: { key: keyof ChannelPrefs; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'in_app', label: 'In-app' },
]

export default function NotificationsSettings() {
  const settings = usePageSettings('notifications')
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings.open || prefs) return
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) setPrefs(data.preferences as Preferences)
        else if (data.error) setError(data.error)
      })
      .catch((e) => setError(String(e?.message || e)))
  }, [settings.open, prefs])

  async function save(next: Preferences) {
    setPrefs(next)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Save failed')
      } else {
        setSavedAt(Date.now())
        setTimeout(() => setSavedAt(null), 1500)
      }
    } catch (e) {
      setError(String((e as Error)?.message || e))
    } finally {
      setSaving(false)
    }
  }

  function toggle(event: string, channel: keyof ChannelPrefs) {
    if (!prefs) return
    save({
      ...prefs,
      comms: { ...prefs.comms, [event]: { ...prefs.comms[event], [channel]: !prefs.comms[event]?.[channel] } },
    })
  }

  function setPolicy(field: 'cancellationPolicyOneTime' | 'cancellationPolicyRecurring' | 'prepTips', value: string) {
    if (!prefs) return
    setPrefs({ ...prefs, policy: { ...prefs.policy, [field]: value } })
  }

  function savePolicy() {
    if (prefs) save(prefs)
  }

  return (
      <PageSettingsPanel
        {...settings}
        title="Notifications"
        tips={[
          'Toggle each channel per event. Email and SMS are sent through your configured providers (Resend / Telnyx).',
          'In-app notifications appear in the bell at the top of the dashboard.',
          'Disabling all channels for an event silences it entirely.',
          'Cancellation policy text appears on booking confirmation emails. Leave blank to use the platform standard policy.',
        ]}
      >
        {() => (
          <div className="space-y-6">
            {error && <p className="text-sm text-red-400">{error}</p>}
            {!prefs && <p className="text-sm text-gray-400">Loading…</p>}
            {prefs && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-2 font-semibold">Event</th>
                        {CHANNELS.map((c) => (
                          <th key={c.key} className="px-3 py-2 font-semibold text-center">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(prefs.comms).map((event) => (
                        <tr key={event} className="border-t border-gray-800">
                          <td className="px-3 py-2 text-gray-200">{EVENT_LABELS[event] || event}</td>
                          {CHANNELS.map((c) => {
                            const v = !!prefs.comms[event]?.[c.key]
                            return (
                              <td key={c.key} className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={v}
                                  onClick={() => toggle(event, c.key)}
                                  disabled={saving}
                                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${v ? 'bg-emerald-500' : 'bg-gray-600'} disabled:opacity-50`}
                                >
                                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${v ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`} />
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 border-t border-gray-800 pt-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Cancellation Policy</p>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">One-time bookings</label>
                    <textarea
                      className="w-full rounded bg-gray-900 border border-gray-700 text-sm text-gray-200 p-2"
                      rows={2}
                      placeholder="Using the platform standard policy — type here to override."
                      value={prefs.policy?.cancellationPolicyOneTime || ''}
                      onChange={(e) => setPolicy('cancellationPolicyOneTime', e.target.value)}
                      onBlur={savePolicy}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Recurring bookings</label>
                    <textarea
                      className="w-full rounded bg-gray-900 border border-gray-700 text-sm text-gray-200 p-2"
                      rows={2}
                      placeholder="Using the platform standard policy — type here to override."
                      value={prefs.policy?.cancellationPolicyRecurring || ''}
                      onChange={(e) => setPolicy('cancellationPolicyRecurring', e.target.value)}
                      onBlur={savePolicy}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t border-gray-800 pt-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Prep Tips</p>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">How clients should prepare (one per line)</label>
                    <textarea
                      className="w-full rounded bg-gray-900 border border-gray-700 text-sm text-gray-200 p-2"
                      rows={4}
                      placeholder="Using the platform standard prep tips — type here to override, one tip per line."
                      value={prefs.policy?.prepTips || ''}
                      onChange={(e) => setPolicy('prepTips', e.target.value)}
                      onBlur={savePolicy}
                      disabled={saving}
                    />
                  </div>
                </div>

                {savedAt && <p className="text-xs text-emerald-400">Saved.</p>}
                {saving && <p className="text-xs text-gray-500">Saving…</p>}
              </>
            )}
          </div>
        )}
      </PageSettingsPanel>
  )
}
