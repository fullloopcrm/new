'use client'

import { useState } from 'react'

export const DNS_REASONS = [
  'Non-payment',
  'Abusive to staff',
  'Safety concern',
  'Property damage dispute',
  'Repeated no-shows/cancellations',
  'Unreasonable demands',
]

interface DnsReasonPickerProps {
  clientCount?: number
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function DnsReasonPicker({ clientCount, onConfirm, onCancel }: DnsReasonPickerProps) {
  const [selected, setSelected] = useState(DNS_REASONS[0])
  const [other, setOther] = useState('')
  const isOther = selected === 'Other'
  const canConfirm = !isOther || other.trim().length > 0

  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--clients-canvas, #fff)', borderRadius: 8, width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <h3 style={{ fontFamily: 'var(--clients-display)', fontSize: 18, fontWeight: 500, marginBottom: 6, color: 'var(--clients-ink)' }}>
          Move {clientCount ? `${clientCount} client(s)` : 'this client'} to Do Not Service
        </h3>
        <p style={{ fontSize: 12, color: 'var(--clients-muted)', marginBottom: 16 }}>Admin-only — shown on the client list.</p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--clients-line)', marginBottom: 10 }}
        >
          {DNS_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          <option value="Other">Other…</option>
        </select>
        {isOther && (
          <textarea
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Describe the reason…"
            rows={3}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--clients-line)', marginBottom: 10, resize: 'vertical' }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="button" className="clients-btn clients-btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="clients-delete-btn"
            disabled={!canConfirm}
            style={!canConfirm ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            onClick={() => onConfirm(isOther ? other.trim() : selected)}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
