// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import SidePanel from '@/app/site/wash-and-fold-nyc/_components/SidePanel'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  status: string | null
  created_at: string
}

interface Deal {
  id: string
  client_id: string
  stage: string
  follow_up_at: string | null
  follow_up_note: string | null
  source: string
  notes: string | null
  created_at: string
  updated_at: string
  clients: Client
}

interface Activity {
  id: string
  deal_id: string
  type: string
  description: string
  created_at: string
}

const ACTIVITY_ICONS: Record<string, string> = {
  note: '📝', call: '📞', text: '💬', email: '✉️',
  quote_sent: '💰', follow_up_set: '⏰', auto_created: '✨',
}

export default function SalesPage() {
  useEffect(() => { document.title = 'Sales | Wash and Fold NYC' }, [])

  const [deals, setDeals] = useState<Deal[]>([])
  const [overdueCount, setOverdueCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Side panel
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [activityType, setActivityType] = useState('call')
  const [activityDesc, setActivityDesc] = useState('')

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [addClient, setAddClient] = useState<Client | null>(null)
  const [addFollowUp, setAddFollowUp] = useState('')
  const [addFollowUpNote, setAddFollowUpNote] = useState('')
  const [addNotes, setAddNotes] = useState('')

  useEffect(() => { fetchDeals() }, [])

  const fetchDeals = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deals')
      const data = await res.json()
      setDeals(data.deals || [])
      setOverdueCount(data.overdueCount || 0)
    } catch (err) {
      console.error('Failed to fetch deals:', err)
    }
    setLoading(false)
  }

  const fetchActivities = async (dealId: string) => {
    setLoadingActivities(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/activities`)
      const data = await res.json()
      setActivities(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch activities:', err)
    }
    setLoadingActivities(false)
  }

  const openDeal = (deal: Deal) => {
    setSelectedDeal(deal)
    setFollowUpDate(deal.follow_up_at ? new Date(deal.follow_up_at).toISOString().slice(0, 16) : '')
    setFollowUpNote(deal.follow_up_note || '')
    setEditNotes(deal.notes || '')
    fetchActivities(deal.id)
  }

  const closeDeal = () => {
    setSelectedDeal(null)
    setActivities([])
    setActivityDesc('')
  }

  const updateDeal = async (updates: Record<string, unknown>) => {
    if (!selectedDeal) return
    try {
      const res = await fetch('/api/deals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedDeal.id, ...updates }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSelectedDeal(updated)
        setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
        fetchActivities(selectedDeal.id)
        fetchDeals()
      }
    } catch (err) {
      console.error('Failed to update deal:', err)
    }
  }

  const handleAddActivity = async () => {
    if (!selectedDeal || !activityDesc.trim()) return
    try {
      const res = await fetch(`/api/deals/${selectedDeal.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activityType, description: activityDesc }),
      })
      if (res.ok) {
        setActivityDesc('')
        fetchActivities(selectedDeal.id)
      }
    } catch (err) {
      console.error('Failed to add activity:', err)
    }
  }

  const handleRemoveDeal = async () => {
    if (!selectedDeal || !confirm('Remove from follow-ups?')) return
    try {
      const res = await fetch('/api/deals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedDeal.id }),
      })
      if (res.ok) { closeDeal(); fetchDeals() }
    } catch {}
  }

  const handleBooked = async () => {
    if (!selectedDeal) return
    await updateDeal({ stage: 'booked' })
    closeDeal()
    fetchDeals()
  }

  // Client search
  const searchClients = async (term: string) => {
    setClientSearch(term)
    if (term.length < 2) { setClientResults([]); return }
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      const filtered = (Array.isArray(data) ? data : []).filter((c: Client) =>
        c.name?.toLowerCase().includes(term.toLowerCase()) ||
        c.phone?.includes(term) ||
        c.email?.toLowerCase().includes(term.toLowerCase())
      )
      setClientResults(filtered.slice(0, 8))
    } catch {}
  }

  const handleCreateDeal = async () => {
    const clientId = addClient?.id
    if (!clientId) return
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          follow_up_at: addFollowUp ? new Date(addFollowUp).toISOString() : null,
          follow_up_note: addFollowUpNote || null,
          notes: addNotes || null,
        }),
      })
      if (res.ok) {
        setShowAddModal(false)
        setAddClient(null)
        setAddFollowUp('')
        setAddFollowUpNote('')
        setAddNotes('')
        setClientSearch('')
        fetchDeals()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed')
      }
    } catch {}
  }

  const isOverdue = (date: string | null) => date ? new Date(date) < new Date() : false

  const formatDateTime = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="p-4 md:p-8 max-w-[1000px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2A4A]">Sales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Clients not ready to book yet — set reminders, follow up</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium hover:bg-[#2a3a5c] transition"
        >
          + Add Client
        </button>
      </div>

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
          <span className="text-red-600 font-medium text-sm">{overdueCount} overdue</span>
          <span className="text-red-400 text-sm">— follow up today</span>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-16 bg-gray-100 rounded-lg" />
        </div>
      ) : deals.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg mb-1">No active follow-ups</p>
          <p className="text-gray-400 text-sm">When a client is interested but not ready to book, add them here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deals.map(deal => {
            const overdue = isOverdue(deal.follow_up_at)
            return (
              <button
                key={deal.id}
                onClick={() => openDeal(deal)}
                className={`w-full text-left bg-white border rounded-lg p-4 hover:shadow-sm transition cursor-pointer flex items-center gap-4 ${
                  overdue ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#1E2A4A]">{deal.clients?.name || 'Unknown'}</p>
                    {deal.clients?.phone && <span className="text-xs text-gray-400">{deal.clients.phone}</span>}
                  </div>
                  {deal.notes && <p className="text-sm text-gray-500 mt-0.5 truncate">{deal.notes}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {deal.follow_up_at ? (
                    <div className={`text-right ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                      <p className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-400'}`}>
                        {overdue ? 'OVERDUE' : 'Follow up'}
                      </p>
                      <p className="text-sm font-medium">{formatDateTime(deal.follow_up_at)}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 bg-gray-100 px-2 py-1 rounded">No reminder</span>
                  )}
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Deal Side Panel */}
      <SidePanel open={!!selectedDeal} onClose={closeDeal} title={selectedDeal?.clients?.name || 'Client'} width="max-w-lg">
        {selectedDeal && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-[#1E2A4A]">{selectedDeal.clients?.name}</p>
              {selectedDeal.clients?.phone && <p className="text-sm text-gray-600">{selectedDeal.clients.phone}</p>}
              {selectedDeal.clients?.email && <p className="text-sm text-gray-600">{selectedDeal.clients.email}</p>}
              {selectedDeal.clients?.address && <p className="text-sm text-gray-400 mt-1">{selectedDeal.clients.address}</p>}
            </div>

            {/* Follow-up */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Follow-Up Reminder
                {selectedDeal.follow_up_at && isOverdue(selectedDeal.follow_up_at) && (
                  <span className="ml-2 text-red-600 normal-case font-normal">OVERDUE</span>
                )}
              </label>
              <input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2" />
              <input type="text" value={followUpNote} onChange={e => setFollowUpNote(e.target.value)}
                placeholder="What to do (e.g., Call about biweekly service)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2" />
              <div className="flex gap-2">
                <button onClick={() => updateDeal({ follow_up_at: followUpDate ? new Date(followUpDate).toISOString() : null, follow_up_note: followUpNote || null })}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">Set Reminder</button>
                {selectedDeal.follow_up_at && (
                  <button onClick={() => { setFollowUpDate(''); setFollowUpNote(''); updateDeal({ follow_up_at: null, follow_up_note: null }) }}
                    className="px-3 py-1.5 text-gray-500 text-sm hover:text-red-600 transition">Clear</button>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                {[
                  { label: 'Tomorrow 10am', days: 1 },
                  { label: '3 days', days: 3 },
                  { label: '1 week', days: 7 },
                  { label: '2 weeks', days: 14 },
                ].map(q => (
                  <button key={q.label} onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() + q.days); d.setHours(10, 0, 0, 0)
                    setFollowUpDate(d.toISOString().slice(0, 16))
                  }} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition">{q.label}</button>
                ))}
              </div>
            </div>

            {/* Log Activity */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Log Activity</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {[
                  { type: 'call', label: 'Call', icon: '📞' },
                  { type: 'text', label: 'Text', icon: '💬' },
                  { type: 'email', label: 'Email', icon: '✉️' },
                  { type: 'note', label: 'Note', icon: '📝' },
                ].map(a => (
                  <button key={a.type} onClick={() => setActivityType(a.type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activityType === a.type ? 'bg-[#1E2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={activityDesc} onChange={e => setActivityDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddActivity()}
                  placeholder="What happened?" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={handleAddActivity} disabled={!activityDesc.trim()}
                  className="px-3 py-2 bg-[#1E2A4A] text-white rounded-lg text-sm hover:bg-[#2a3a5c] transition disabled:opacity-50">Add</button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Notes</label>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                onBlur={() => updateDeal({ notes: editNotes })} rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Notes..." />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={handleBooked}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">They Booked</button>
              <button onClick={handleRemoveDeal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Remove</button>
            </div>

            {/* History */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">History</label>
              {loadingActivities ? (
                <div className="animate-pulse space-y-2"><div className="h-10 bg-gray-100 rounded" /><div className="h-10 bg-gray-100 rounded" /></div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activities.map(a => (
                    <div key={a.id} className="flex gap-2 text-sm">
                      <span className="text-base flex-shrink-0">{ACTIVITY_ICONS[a.type] || '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700">{a.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(a.created_at)} at {new Date(a.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SidePanel>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShowAddModal(false); setAddClient(null) }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-[#1E2A4A] mb-4">Add to Follow-Ups</h2>
            {!addClient ? (
              <div>
                <input type="text" value={clientSearch} onChange={e => searchClients(e.target.value)}
                  placeholder="Search by name, phone, or email..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2" autoFocus />
                <div className="max-h-48 overflow-y-auto">
                  {clientResults.map(c => (
                    <button key={c.id} onClick={() => setAddClient(c)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition">
                      <p className="text-sm font-medium text-[#1E2A4A]">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone} {c.email && `· ${c.email}`}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{addClient.name}</p>
                    <p className="text-xs text-gray-500">{addClient.phone}</p>
                  </div>
                  <button onClick={() => setAddClient(null)} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-Up Date</label>
                  <input type="datetime-local" value={addFollowUp} onChange={e => setAddFollowUp(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <div className="flex gap-2 mt-2">
                    {[{ label: '1 week', days: 7 }, { label: '2 weeks', days: 14 }, { label: '1 month', days: 30 }].map(q => (
                      <button key={q.label} onClick={() => {
                        const d = new Date(); d.setDate(d.getDate() + q.days); d.setHours(10, 0, 0, 0)
                        setAddFollowUp(d.toISOString().slice(0, 16))
                      }} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition">{q.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Note</label>
                  <input type="text" value={addFollowUpNote} onChange={e => setAddFollowUpNote(e.target.value)}
                    placeholder="e.g., Wants to start biweekly in May" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Context..." />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddModal(false); setAddClient(null) }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleCreateDeal}
                    className="flex-1 px-4 py-2 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium hover:bg-[#2a3a5c] transition">Add</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
