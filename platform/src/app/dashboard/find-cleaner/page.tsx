'use client'

import { useEffect, useState } from 'react'
import CreateBookingForm from '../bookings/CreateBookingForm'
import EditBookingForm, { type EditableBooking } from '../bookings/EditBookingForm'

type Client = { id: string; name: string; phone: string | null }
type Booking = {
  id: string
  start_time: string
  end_time: string | null
  service_type: string | null
  hourly_rate: number | null
  clients: { name: string; address: string | null } | null
}
type Recipient = { id: string; name: string; phone: string | null }
type SendResult =
  | {
      team: { sent: number; eligible: number; members: string[] }
      applicants: { sent: number; eligible: number; applicants: string[] }
    }
  | { error: string }

const DEFAULT_LABOR_RATE = '35'

const input: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d4cfc4', borderRadius: 8, fontSize: 14, width: '100%' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e7e2d8', borderRadius: 12, padding: 16 }
const checklistRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }
const linkButton: React.CSSProperties = { border: 'none', background: 'none', color: '#1a1a1a', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 13 }
const messagePreview: React.CSSProperties = { background: '#f7f4ec', border: '1px solid #e7e2d8', borderRadius: 8, padding: 10, fontSize: 13, color: '#4a4640', whiteSpace: 'pre-wrap', marginBottom: 8 }

function fmt(dt: string): string {
  const d = new Date(dt.replace(' ', 'T').replace(/(\.\d+)?Z?$/, '') + 'Z')
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
}

function toggleId(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

// Naive timestamps (no timezone suffix) are ET wall-clock time directly --
// same convention as EditBookingForm/CreateBookingForm. Mirrors the
// identical helper in broadcast-booking/route.ts so this default text
// matches exactly what the server would send if never edited.
function formatNaiveClock(naive: string): string {
  const timePart = naive.split('T')[1] || '00:00:00'
  const [hStr, mStr] = timePart.split(':')
  let h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${mStr} ${ampm}`
}

function teamMessagePreview(rateOverride: string, address: string | null, portalUrl: string, booking: Booking): string {
  const rate = rateOverride ? Number(rateOverride) : null
  const timeRange = booking.end_time
    ? `${formatNaiveClock(booking.start_time)} to ${formatNaiveClock(booking.end_time)}`
    : formatNaiveClock(booking.start_time)
  return [
    'There is a job available in your portal — first team member to claim it gets it.',
    `You must be able to arrive within 60-90 minutes.${rate ? ` Pays $${rate}/hr.` : ''} ${timeRange}.${address ? ` ${address}.` : ''}`,
    portalUrl,
    '',
    'Hay un trabajo disponible en tu portal — el primero en reclamarlo se lo queda.',
    `Debes poder llegar en 60-90 minutos.${rate ? ` Paga $${rate}/hr.` : ''} ${timeRange}.${address ? ` ${address}.` : ''}`,
    portalUrl,
  ].join('\n')
}

const DEFAULT_APPLICANT_MESSAGE = [
  "There's an available cleaning — contact us to activate your portal to claim it.",
  'You must have your own supplies and equipment. Reply STOP to stop receiving messages.',
  '',
  'Hay una limpieza disponible — contáctenos para activar su portal y reclamarla.',
  'Debe tener sus propios suministros y equipo. Responda STOP para dejar de recibir mensajes.',
].join('\n')

export default function FindTeamMemberPage() {
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [rateOverride, setRateOverride] = useState('')
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [showRecipients, setShowRecipients] = useState(false)
  const [members, setMembers] = useState<Recipient[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  const [applicants, setApplicants] = useState<Recipient[]>([])
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [editingBooking, setEditingBooking] = useState<EditableBooking | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [teamMessage, setTeamMessage] = useState('')
  const [applicantMessage, setApplicantMessage] = useState('')

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
    loadBookingsForClient(c.id)
  }

  const loadBookingsForClient = (clientId: string) => {
    setBookingsLoading(true)
    return fetch(`/api/bookings?client_id=${clientId}&status=scheduled&limit=200`)
      .then(r => r.json())
      .then(d => {
        const rows: Booking[] = Array.isArray(d) ? d : (d.bookings || [])
        setBookings(rows.filter((b: any) => !b.team_member_id))
      })
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false))
  }

  const pickBooking = (b: Booking) => {
    setSelectedBooking(b)
    setRateOverride(DEFAULT_LABOR_RATE)
    setShowRecipients(false)
    setMembers([]); setSelectedMemberIds(new Set())
    setApplicants([]); setSelectedApplicantIds(new Set())
    setTeamMessage(''); setApplicantMessage('')
    setResult(null)
  }

  const openEdit = async (bookingId: string) => {
    setLoadingEdit(true)
    try {
      const r = await fetch(`/api/bookings/${bookingId}`)
      const d = await r.json()
      if (d.booking) setEditingBooking(d.booking)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleEditSaved = async () => {
    const id = editingBooking?.id
    const clientId = selectedClient?.id
    setEditingBooking(null)
    if (!id) return
    if (clientId) await loadBookingsForClient(clientId)
    const r = await fetch(`/api/bookings/${id}`)
    const d = await r.json().catch(() => null)
    if (d?.booking) pickBooking(d.booking)
  }

  const reset = () => {
    setSelectedClient(null); setClientSearch(''); setClients([]); setBookings([])
    setSelectedBooking(null); setRateOverride(''); setResult(null)
    setShowRecipients(false)
    setMembers([]); setSelectedMemberIds(new Set())
    setApplicants([]); setSelectedApplicantIds(new Set())
    setTeamMessage(''); setApplicantMessage('')
  }

  const loadRecipients = async () => {
    if (!selectedBooking) return
    setLoadingRecipients(true)
    try {
      const r = await fetch('/api/admin/find-cleaner/broadcast-booking')
      const j = await r.json()
      const m: Recipient[] = j.members || []
      const a: Recipient[] = j.applicants || []
      setMembers(m)
      setSelectedMemberIds(new Set(m.map(x => x.id)))
      setApplicants(a)
      setSelectedApplicantIds(new Set(a.map(x => x.id)))
      setTeamMessage(teamMessagePreview(rateOverride, selectedBooking.clients?.address || null, j.portal_url || '[portal link]', selectedBooking))
      setApplicantMessage(DEFAULT_APPLICANT_MESSAGE)
      setShowRecipients(true)
    } catch {
      // leave showRecipients false so the button is still there to retry
    } finally {
      setLoadingRecipients(false)
    }
  }

  const send = async () => {
    if (!selectedBooking) return
    setSending(true); setResult(null)
    const r = await fetch('/api/admin/find-cleaner/broadcast-booking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: selectedBooking.id,
        rate_override: rateOverride ? Number(rateOverride) : null,
        member_ids: Array.from(selectedMemberIds),
        applicant_ids: Array.from(selectedApplicantIds),
        team_message: teamMessage,
        applicant_message: applicantMessage,
      }),
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
                onClick={() => selectedBooking?.id === b.id ? openEdit(b.id) : pickBooking(b)}
                style={{
                  padding: 10, borderRadius: 8, cursor: 'pointer',
                  border: selectedBooking?.id === b.id ? '2px solid #1a1a1a' : '1px solid #e7e2d8',
                }}
              >
                <div style={{ fontWeight: 600 }}>{fmt(b.start_time)}</div>
                <div style={{ fontSize: 13, color: '#7a7468' }}>{b.service_type || 'Job'}{b.hourly_rate ? ` · $${b.hourly_rate}/hr` : ''}</div>
                {selectedBooking?.id === b.id && (
                  <div style={{ fontSize: 12, color: '#7a7468', marginTop: 4 }}>{loadingEdit ? 'Opening…' : 'Click again to edit this booking'}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editingBooking && (
        <div style={card}>
          <EditBookingForm booking={editingBooking} hideCleanerPicker onSaved={handleEditSaved} onCancel={() => setEditingBooking(null)} />
        </div>
      )}

      {!editingBooking && selectedBooking && (
        <div style={{ ...card, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#7a7468' }}>Broadcasting for:</div>
          <div style={{ fontWeight: 600 }}>{selectedClient?.name} · {fmt(selectedBooking.start_time)}</div>
          <label>
            Labor rate override ($/hr) — what the cleaner earns. Does not change what the client is charged.
            <input type="number" style={input} value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} placeholder={DEFAULT_LABOR_RATE} />
          </label>

          {!showRecipients && (
            <button onClick={loadRecipients} disabled={loadingRecipients} style={{ padding: 12, borderRadius: 8, border: 'none', background: '#1a1a1a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              {loadingRecipients ? 'Loading…' : 'Select broadcast team members'}
            </button>
          )}

          {showRecipients && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600 }}>Active roster ({selectedMemberIds.size}/{members.length})</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={linkButton} onClick={() => setSelectedMemberIds(new Set(members.map(m => m.id)))}>Select all</button>
                    <button style={linkButton} onClick={() => setSelectedMemberIds(new Set())}>Deselect all</button>
                  </div>
                </div>
                <textarea style={{ ...messagePreview, width: '100%', minHeight: 100, fontFamily: 'inherit' }} value={teamMessage} onChange={(e) => setTeamMessage(e.target.value)} />
                <div style={{ border: '1px solid #e7e2d8', borderRadius: 8, padding: '4px 10px', maxHeight: 220, overflowY: 'auto' }}>
                  {members.length === 0 && <div style={{ color: '#7a7468', padding: '6px 0' }}>No active roster members with a phone on file.</div>}
                  {members.map(m => (
                    <label key={m.id} style={checklistRow}>
                      <input type="checkbox" checked={selectedMemberIds.has(m.id)} onChange={() => setSelectedMemberIds(prev => toggleId(prev, m.id))} />
                      {m.name}{m.phone ? ` · ${m.phone}` : ''}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600 }}>Applicants ({selectedApplicantIds.size}/{applicants.length})</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={linkButton} onClick={() => setSelectedApplicantIds(new Set(applicants.map(a => a.id)))}>Select all</button>
                    <button style={linkButton} onClick={() => setSelectedApplicantIds(new Set())}>Deselect all</button>
                  </div>
                </div>
                <textarea style={{ ...messagePreview, width: '100%', minHeight: 90, fontFamily: 'inherit' }} value={applicantMessage} onChange={(e) => setApplicantMessage(e.target.value)} />
                <div style={{ border: '1px solid #e7e2d8', borderRadius: 8, padding: '4px 10px', maxHeight: 220, overflowY: 'auto' }}>
                  {applicants.length === 0 && <div style={{ color: '#7a7468', padding: '6px 0' }}>No applicants with a phone on file.</div>}
                  {applicants.map(a => (
                    <label key={a.id} style={checklistRow}>
                      <input type="checkbox" checked={selectedApplicantIds.has(a.id)} onChange={() => setSelectedApplicantIds(prev => toggleId(prev, a.id))} />
                      {a.name}{a.phone ? ` · ${a.phone}` : ''}
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={send}
                disabled={sending || (selectedMemberIds.size === 0 && selectedApplicantIds.size === 0)}
                style={{ padding: 12, borderRadius: 8, border: 'none', background: '#1a7a3a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </>
          )}

          {result && 'error' in result && <div style={{ color: '#b00', fontWeight: 600 }}>{result.error}</div>}
          {result && 'team' in result && (
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ fontWeight: 600 }}>
                Team: sent {result.team.sent} of {result.team.eligible}{result.team.members.length ? ` — ${result.team.members.join(', ')}` : ''}
              </div>
              <div style={{ fontWeight: 600 }}>
                Applicants: sent {result.applicants.sent} of {result.applicants.eligible}{result.applicants.applicants.length ? ` — ${result.applicants.applicants.join(', ')}` : ''}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
