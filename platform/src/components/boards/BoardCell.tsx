'use client'

import { useState } from 'react'
import type { BoardColumn } from './types'

interface BoardCellProps {
  column: BoardColumn
  value: unknown
  onChange: (value: unknown) => void
}

const STATUS_UNSET = '#c4c4c4'

export default function BoardCell({ column, value, onChange }: BoardCellProps) {
  const [draft, setDraft] = useState<string>(value != null ? String(value) : '')

  if (column.type === 'status') {
    const current = typeof value === 'string' ? value : ''
    const option = column.options.find((o) => o.label === current)
    return (
      <select
        value={current}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ backgroundColor: option?.color || STATUS_UNSET }}
        className="w-full text-xs font-medium text-white rounded px-2 py-1.5 border-0 cursor-pointer appearance-none text-center"
      >
        <option value="" style={{ backgroundColor: 'white', color: '#334155' }}>—</option>
        {column.options.map((o) => (
          <option key={o.label} value={o.label} style={{ backgroundColor: 'white', color: '#334155' }}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  if (column.type === 'checkbox') {
    return (
      <div className="flex justify-center">
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      </div>
    )
  }

  if (column.type === 'date') {
    return (
      <input
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-teal-400 rounded px-1.5 py-1"
      />
    )
  }

  if (column.type === 'number') {
    return (
      <input
        type="number"
        defaultValue={typeof value === 'number' ? value : ''}
        onBlur={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-full text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-teal-400 rounded px-1.5 py-1"
      />
    )
  }

  // text and person both render as a free-text field — person has no team
  // directory to resolve against on the platform-level admin boards, so it's
  // kept as a plain labeled text field on both surfaces for parity.
  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onChange(draft || null)}
      placeholder={column.type === 'person' ? 'Assign to…' : ''}
      className="w-full text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-teal-400 rounded px-1.5 py-1"
    />
  )
}
