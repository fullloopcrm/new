'use client'

import { useCallback, useEffect, useState } from 'react'

interface TeamChecklistProps {
  bookingId: string
  token: string
  t: (en: string, es: string) => string
}

type Item = { id: string; label: string; done: boolean }

export default function TeamChecklist({ bookingId, token, t }: TeamChecklistProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/team-portal/checklist?booking_id=${bookingId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setItems(d.items || []); setLoaded(true) }).catch(() => setLoaded(true))
  }, [bookingId, token])
  useEffect(() => { load() }, [load])

  const toggle = async (item: Item) => {
    setItems(items.map(i => i.id === item.id ? { ...i, done: !i.done } : i))
    await fetch('/api/team-portal/checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ item_id: item.id, booking_id: bookingId, done: !item.done }),
    })
  }

  if (!loaded || items.length === 0) return null

  return (
    <div className="w-full max-w-sm mx-auto text-left bg-white border border-gray-200 rounded-xl p-3">
      <p className="text-xs font-medium text-slate-500 mb-1.5">{t('Checklist', 'Lista de verificación')}</p>
      <div className="space-y-1">
        {items.map(i => (
          <label key={i.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={i.done} onChange={() => toggle(i)} />
            <span className={i.done ? 'line-through text-slate-400' : 'text-slate-700'}>{i.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
