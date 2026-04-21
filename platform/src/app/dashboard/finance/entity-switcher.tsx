'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

type Entity = { id: string; name: string; is_default: boolean; active: boolean }

export default function EntitySwitcher() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const search = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const current = search.get('entity_id') || 'all'

  useEffect(() => {
    fetch('/api/finance/entities').then(r => r.json()).then(d => {
      setEntities(d.entities || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function pick(value: string) {
    const sp = new URLSearchParams(search.toString())
    if (value === 'all') sp.delete('entity_id')
    else sp.set('entity_id', value)
    router.push(`${pathname}?${sp.toString()}`)
  }

  if (loading || entities.length <= 1) {
    // Hide entirely if only one entity exists — single-entity tenants shouldn't see clutter.
    return null
  }

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded-lg">
      <span className="text-xs text-slate-500 uppercase">Entity</span>
      <select
        value={current}
        onChange={e => pick(e.target.value)}
        className="bg-transparent border-0 text-sm font-medium text-slate-900 focus:outline-none"
      >
        <option value="all">All (Consolidated)</option>
        {entities.map(e => (
          <option key={e.id} value={e.id}>{e.name}{e.is_default ? ' · default' : ''}</option>
        ))}
      </select>
    </div>
  )
}
