'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'

const DAYS = [
  { en: 'Sunday', es: 'Domingo' },
  { en: 'Monday', es: 'Lunes' },
  { en: 'Tuesday', es: 'Martes' },
  { en: 'Wednesday', es: 'Miércoles' },
  { en: 'Thursday', es: 'Jueves' },
  { en: 'Friday', es: 'Viernes' },
  { en: 'Saturday', es: 'Sábado' },
]

export default function AvailabilityPage() {
  const { auth, t } = useTeamAuth()
  const router = useRouter()
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [newBlock, setNewBlock] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!auth) { router.push('/team/login'); return }
    fetch('/api/team-portal/availability', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.availability) {
          setWorkingDays(data.availability.working_days || [1, 2, 3, 4, 5])
          setBlockedDates(data.availability.blocked_dates || [])
        }
      })
  }, [auth, router])

  function toggleDay(day: number) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  function addBlockedDate() {
    if (newBlock && !blockedDates.includes(newBlock)) {
      setBlockedDates((prev) => [...prev, newBlock].sort())
      setNewBlock('')
    }
  }

  async function save() {
    if (!auth) return
    setSaving(true)
    await fetch('/api/team-portal/availability', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        availability: { working_days: workingDays, blocked_dates: blockedDates },
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!auth) return null

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-slate-800 mb-6">{t('Availability', 'Disponibilidad')}</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">{t('Working Days', 'Días de Trabajo')}</h2>
        <div className="space-y-2">
          {DAYS.map((day, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm ${
                workingDays.includes(i) ? 'bg-green-50 text-green-700 font-medium' : 'bg-gray-50 text-slate-400'
              }`}
            >
              <span>{t(day.en, day.es)}</span>
              <span>{workingDays.includes(i) ? '✓' : '—'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">{t('Blocked Dates', 'Fechas Bloqueadas')}</h2>
        <div className="flex gap-2 mb-3">
          <input type="date" value={newBlock} onChange={(e) => setNewBlock(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button onClick={addBlockedDate} className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm">{t('Add', 'Agregar')}</button>
        </div>
        <div className="space-y-1">
          {blockedDates.map((d) => (
            <div key={d} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-red-700">{new Date(d + 'T00:00').toLocaleDateString()}</span>
              <button onClick={() => setBlockedDates((prev) => prev.filter((x) => x !== d))} className="text-red-400 text-xs">
                {t('Remove', 'Quitar')}
              </button>
            </div>
          ))}
          {blockedDates.length === 0 && <p className="text-sm text-slate-400">{t('No blocked dates', 'Sin fechas bloqueadas')}</p>}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium disabled:opacity-50">
        {saving ? t('Saving...', 'Guardando...') : saved ? t('Saved!', '¡Guardado!') : t('Save', 'Guardar')}
      </button>
    </div>
  )
}
