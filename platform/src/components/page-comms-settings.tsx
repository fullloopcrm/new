'use client'

import { useEffect, useState } from 'react'
import { COMMS, type CommChannel } from '@/lib/comms-registry'
import type { CommPreferences } from '@/lib/comms-prefs'

// Same GET/PUT /api/settings/notifications endpoint the tenant-wide
// Communications tab (dashboard/settings/CommunicationsTab.tsx) reads and
// writes — this hook just gives a per-page drawer a filtered view onto the
// same stored preferences, so a toggle here and the same toggle on the
// Communications tab always agree.
export function usePageComms(open: boolean) {
  const [prefs, setPrefs] = useState<CommPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || prefs) return
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) setPrefs(data.preferences as CommPreferences)
        else if (data.error) setError(data.error)
      })
      .catch((e) => setError(String((e as Error)?.message || e)))
  }, [open, prefs])

  async function save(next: CommPreferences) {
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

  function toggleChannel(key: string, channel: CommChannel) {
    if (!prefs) return
    save({
      ...prefs,
      comms: { ...prefs.comms, [key]: { ...prefs.comms[key], [channel]: !prefs.comms[key]?.[channel] } },
    })
  }

  return { prefs, saving, savedAt, error, toggleChannel }
}

const CHANNEL_COLUMNS: CommChannel[] = ['email', 'sms']

// Renders a fixed subset of the global comms registry (picked by key) as a
// small toggle table — used by any per-page drawer that wants to surface
// "communication" settings specific to that page's audience, without
// duplicating the full Communications tab.
export function CommsSubsetSection({
  keys,
  prefs,
  saving,
  onToggle,
}: {
  keys: string[]
  prefs: CommPreferences
  saving: boolean
  onToggle: (key: string, channel: CommChannel) => void
}) {
  const defs = COMMS.filter((c) => keys.includes(c.key))
  if (defs.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2 font-semibold">Message</th>
            {CHANNEL_COLUMNS.map((ch) => (
              <th key={ch} className="px-3 py-2 font-semibold text-center">{ch === 'sms' ? 'SMS' : 'Email'}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {defs.map((def) => (
            <tr key={def.key} className="border-t border-gray-800">
              <td className="px-3 py-2 text-gray-200">
                <span className="block">{def.label}</span>
                <span className="block text-xs text-gray-500">{def.desc}</span>
              </td>
              {CHANNEL_COLUMNS.map((ch) => {
                if (!def.channels.includes(ch)) {
                  return <td key={ch} className="px-3 py-2 text-center text-gray-700">—</td>
                }
                const on = !!prefs.comms[def.key]?.[ch]
                return (
                  <td key={ch} className="px-3 py-2 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={saving || def.locked}
                      title={def.locked ? 'Always on — transactional message' : undefined}
                      onClick={() => onToggle(def.key, ch)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-gray-600'} disabled:opacity-50`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`} />
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
