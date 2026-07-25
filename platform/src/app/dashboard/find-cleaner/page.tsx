'use client'

import { useEffect, useState } from 'react'
import CreateBookingForm from '../bookings/CreateBookingForm'

type Client = { id: string; name: string; phone: string | null }
type Booking = {
  id: string
  start_time: string
  end_time: string | null
  service_type: string | null
  hourly_rate: number | null
  clients: { name: string; address: string | null } | null
}
type SendResult = { sent: number; eligible: number; members: string[] } | { error: string }

const input: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d4cfc4', borderRadius: 8, fontSize: 14, width: '100%' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e7e2d8', borderRadius: 12, padding: 16 }

function fmt(dt: string): string {
  const d = new Date(dt.replace(' ', 'T').replace(/(\.\d+)?Z?$/, '') + 'Z')
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
}

export default function FindTeamMemberPage() {
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [rateOverride, setRateOverride] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)

  useEffect(() => {
    if (!clientSearch || selectedClient) { setClients([]); return }
    const t = setTimeout(() => {
      fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=8`)
        .then(r => r.json()).then(d => setClients(d.clients || [])).catch(() => setClients([]))
    }, 250)
    return () => clearTimeout(t)
  }, [clientSearch, selectedClient])

  const pickClient = (c: Client) => {
    setSelectedClient(c)
    setClientSearch(c.name)
    setClients([])
    setSelectedBooking(null)
    setResult(null)
    setBookingsLoading(true)
    fetch(`/api/bookings?client_id=${c.id}&status=scheduled&limit=200`)
      .then(r => r.json())
      .then(d => {
        const rows: Booking[] = Array.isArray(d) ? d : (d.bookings || [])
        setBookings(rows.filter((b: any) => !b.team_member_id))
      })
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false))
  }

  const reset = () => {
    setSelectedClient(null); setClientSearch(''); setClients([]); setBookings([])
    setSelectedBooking(null); setRateOverride(''); setResult(null)
  }

  const send = async () => {
    if (!selectedBooking) return
    setSending(true); setResult(null)
    const r = await fetch('/api/admin/find-cleaner/broadcast-booking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: selectedBooking.id, rate_override: rateOverride ? Number(rateOverride) : null }),
    })
    const d = await r.json().catch(() => ({ error: 'Failed to send' }))
    setResult(d)
    setSending(false)
  }

  return (
    <div style={{ maxWidth: 720, display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, margin: 0 }}>Find a Team Member</h1>
        <p style={{ color: '#7a7468', margin: '4px 0 0' }}>Select a client, then an unassigned booking, and we&apos;ll text eligible team members to claim it.</p>
      </div>

      <div style={{ ...card, display: 'grid', gap: 10 }}>
        <label>
          Client
          <input
            style={input}
            placeholder="Type a client's name…"
            value={clientSearch}
            onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setBookings([]); setSelectedBooking(null); setResult(null) }}
          />
        </label>
        {clients.length > 0 && (
          <div style={{ border: '1px solid #e7e2d8', borderRadius: 8, overflow: 'hidden' }}>
            {clients.map(c => (
              <div key={c.id} onClick={() => pickClient(c)} style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f0ece3' }}>
                {c.name}{c.phone ? ` · ${c.phone}` : ''}
              </div>
            ))}
          </div>
        )}

        {selectedClient && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 13, color: '#7a7468' }}>
              Unassigned bookings for <strong>{selectedClient.name}</strong>
              {' · '}<button onClick={reset} style={{ border: 'none', background: 'none', color: '#1a1a1a', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>change client</button>
            </div>
            {bookingsLoading && <p style={{ color: '#7a7468' }}>Loading…</p>}
            {!bookingsLoading && bookings.length === 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                <p style={{ color: '#7a7468' }}>No unassigned bookings for this client. Create one to broadcast:</p>
                <CreateBookingForm
                  key={selectedClient.id}
                  lockedClientId={selectedClient.id}
                  hideCleanerPicker
                  onCreated={() => pickClient(selectedClient)}
                  onCancel={reset}
                />
              </div>
            )}
            {bookings.map(b => (
              <div
                key={b.id}
                onClick={() => { setSelectedBooking(b); setRateOverride(''); setResult(null) }}
                style={{
                  padding: 10, borderRadius: 8, cursor: 'pointer',
                  border: selectedBooking?.id === b.id ? '2px solid #1a1a1a' : '1px solid #e7e2d8',
                }}
              >
                <div style={{ fontWeight: 600 }}>{fmt(b.start_time)}</div>
                <div style={{ fontSize: 13, color: '#7a7468' }}>{b.service_type || 'Job'}{b.hourly_rate ? ` · $${b.hourly_rate}/hr` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedBooking && (
        <div style={{ ...card, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#7a7468' }}>Broadcasting for:</div>
          <div style={{ fontWeight: 600 }}>{selectedClient?.name} · {fmt(selectedBooking.start_time)}</div>
          <label>
            Rate override ($/hr) — optional
            <input type="number" style={input} value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} placeholder={selectedBooking.hourly_rate ? String(selectedBooking.hourly_rate) : 'leave blank to keep current rate'} />
          </label>
          <button onClick={send} disabled={sending} style={{ padding: 12, borderRadius: 8, border: 'none', background: '#1a7a3a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {sending ? 'Sending…' : 'Broadcast to eligible team members'}
          </button>
          {result && 'error' in result && <div style={{ color: '#b00', fontWeight: 600 }}>{result.error}</div>}
          {result && 'sent' in result && (
            <div style={{ fontWeight: 600 }}>
              Sent to {result.sent} of {result.eligible} eligible: {result.members.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
