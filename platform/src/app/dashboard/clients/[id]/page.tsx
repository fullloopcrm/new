'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatPhone } from '@/lib/phone'
import AddressAutocomplete from '@/components/address-autocomplete'

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  unit: string | null
  notes: string | null
  special_instructions: string | null
  source: string | null
  referral_code: string | null
  email_opt_in: boolean
  sms_opt_in: boolean
  status: string
  created_at: string
  preferred_team_member_id: string | null
}

type TeamMemberOption = { id: string; name: string }

type Booking = {
  id: string
  service_type: string | null
  start_time: string
  status: string
  price: number | null
  payment_status: string | null
}

type Activity = {
  type: string
  title: string
  description: string
  timestamp: string
}

type SmsMessage = {
  id: string
  direction: string
  message: string
  created_at: string
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Client>>({})
  const [saving, setSaving] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([])
  const [tab, setTab] = useState<'bookings' | 'activity' | 'sms'>('bookings')
  const [activities, setActivities] = useState<Activity[]>([])
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>([])

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data.client)
        setForm(data.client)
      })
    fetch(`/api/bookings?client_id=${id}`)
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => setTeamMembers((data.team_members || data.team || []).map((m: TeamMemberOption) => ({ id: m.id, name: m.name }))))
      .catch(() => {})
  }, [id])

  // Load activity feed
  useEffect(() => {
    if (tab === 'activity') {
      fetch(`/api/clients/${id}/activity`)
        .then((r) => r.json())
        .then((data) => setActivities(Array.isArray(data) ? data : data.activities || []))
        .catch(() => {})
    }
  }, [id, tab])

  // Load SMS transcript
  useEffect(() => {
    if (tab === 'sms') {
      fetch(`/api/clients/${id}/transcript`)
        .then((r) => r.json())
        .then((data) => setSmsMessages(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }, [id, tab])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { client: updated } = await res.json()
      setClient(updated)
      setEditing(false)
    }
    setSaving(false)
  }

  async function deleteClient() {
    if (!confirm('Delete this client? This cannot be undone.')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    router.push('/dashboard/clients')
  }

  if (!client) return <p className="text-slate-400">Loading...</p>

  const totalSpent = bookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.price || 0), 0)
  const completedCount = bookings.filter(b => b.status === 'completed' || b.status === 'paid').length

  const activityIcon = (type: string) => {
    switch (type) {
      case 'client_created': return 'bg-blue-100 text-blue-600'
      case 'booking_created': return 'bg-indigo-100 text-indigo-600'
      case 'check_in': return 'bg-green-100 text-green-600'
      case 'check_out': return 'bg-orange-100 text-orange-600'
      case 'payment_received': return 'bg-emerald-100 text-emerald-600'
      case 'booking_cancelled': return 'bg-red-100 text-red-600'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  return (
    <div>
      <Link href="/dashboard/clients" className="text-sm text-slate-400 hover:text-slate-900 mb-4 inline-block">
        &larr; All Clients
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{client.name}</h2>
          <p className="text-sm text-slate-400">
            {completedCount} jobs completed
            {totalSpent > 0 && ` \u00b7 $${(totalSpent / 100).toFixed(0)} total spent`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={deleteClient}
            className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* CONTACT INFO */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Contact Info</h3>
            {editing ? (
              <div className="space-y-3">
                <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="Phone" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <AddressAutocomplete value={form.address || ''} onChange={(v) => setForm({ ...form, address: v })} placeholder="123 Main St, City, State" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unit/Apt" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <textarea value={form.special_instructions || ''} onChange={(e) => setForm({ ...form, special_instructions: e.target.value })} placeholder="Special Instructions" rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Preferred Team Member</label>
                  <select value={form.preferred_team_member_id || ''} onChange={(e) => setForm({ ...form, preferred_team_member_id: e.target.value || null })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">No preference</option>
                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Status</label>
                  <select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="do_not_contact">Do Not Contact</option>
                  </select>
                </div>
                <button onClick={save} disabled={saving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd>{client.email || '\u2014'}</dd></div>
                <div className="flex justify-between items-center">
                  <dt className="text-slate-400">Phone</dt>
                  <dd className="flex items-center gap-2">
                    <span>{client.phone || '\u2014'}</span>
                    {client.phone && (
                      <>
                        <a href={`tel:${client.phone}`} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100">Call</a>
                        <a href={`sms:${client.phone}`} className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium hover:bg-green-100">Text</a>
                      </>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between items-start">
                  <dt className="text-slate-400">Address</dt>
                  <dd className="text-right">
                    <span>{client.address || '\u2014'}{client.unit ? `, ${client.unit}` : ''}</span>
                    {client.address && (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-600 hover:underline mt-0.5"
                      >
                        Open in Maps
                      </a>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between"><dt className="text-slate-400">Source</dt><dd className="capitalize">{client.source || '\u2014'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="capitalize">{client.status}</dd></div>
                {client.notes && <div><dt className="text-slate-400 mb-1">Notes</dt><dd className="bg-slate-50 rounded p-2">{client.notes}</dd></div>}
                {client.special_instructions && <div><dt className="text-slate-400 mb-1">Special Instructions</dt><dd className="bg-yellow-500/10 rounded p-2">{client.special_instructions}</dd></div>}
              </dl>
            )}
          </div>

          {/* TABS: Bookings / Activity / SMS */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex border-b border-slate-200">
              {(['bookings', 'activity', 'sms'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === t ? 'bg-white text-teal-600 border-b-2 border-teal-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t === 'bookings' ? `Bookings (${bookings.length})` : t === 'activity' ? 'Activity Feed' : 'SMS Transcript'}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* BOOKINGS TAB */}
              {tab === 'bookings' && (
                bookings.length === 0 ? (
                  <p className="text-sm text-slate-400">No bookings yet</p>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((b) => (
                      <Link key={b.id} href={`/dashboard/bookings/${b.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-200">
                        <div>
                          <p className="text-sm font-medium">{b.service_type || 'Service'}</p>
                          <p className="text-xs text-slate-400">{new Date(b.start_time).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            b.status === 'completed' || b.status === 'paid' ? 'bg-green-50 text-green-700' :
                            b.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>{b.status}</span>
                          {b.price != null && <p className="text-xs text-slate-400 mt-1">${(b.price / 100).toFixed(2)}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              )}

              {/* ACTIVITY TAB */}
              {tab === 'activity' && (
                activities.length === 0 ? (
                  <p className="text-sm text-slate-400">No activity yet</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((a, i) => (
                      <div key={i} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${activityIcon(a.type)}`}>
                          {a.type === 'check_in' ? '\u2192' :
                           a.type === 'check_out' ? '\u2190' :
                           a.type === 'payment_received' ? '$' :
                           a.type === 'booking_cancelled' ? '\u2717' :
                           a.type === 'client_created' ? '+' :
                           '\u25CF'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{a.title}</p>
                          <p className="text-xs text-slate-400">{a.description}</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            {new Date(a.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* SMS TRANSCRIPT TAB */}
              {tab === 'sms' && (
                smsMessages.length === 0 ? (
                  <p className="text-sm text-slate-400">No SMS messages yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {smsMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
                          msg.direction === 'outbound'
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}>
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${
                            msg.direction === 'outbound' ? 'text-teal-200' : 'text-slate-400'
                          }`}>
                            {new Date(msg.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">
          {/* QUICK STATS */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Summary</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Total Bookings</dt>
                <dd className="font-medium">{bookings.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Completed</dt>
                <dd className="font-medium">{completedCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Total Spent</dt>
                <dd className="font-medium">{totalSpent > 0 ? `$${(totalSpent / 100).toFixed(0)}` : '\u2014'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Member Since</dt>
                <dd>{new Date(client.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          {/* PREFERENCES */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Preferences</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Preferred Team Member</dt>
                <dd className={client.preferred_team_member_id ? 'text-amber-700 font-medium' : 'text-slate-400'}>
                  {client.preferred_team_member_id
                    ? teamMembers.find(m => m.id === client.preferred_team_member_id)?.name || 'Set'
                    : 'None'}
                </dd>
              </div>
              <div className="flex justify-between"><dt className="text-slate-400">Email Opt-in</dt><dd>{client.email_opt_in ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">SMS Opt-in</dt><dd>{client.sms_opt_in ? 'Yes' : 'No'}</dd></div>
              {client.referral_code && <div className="flex justify-between"><dt className="text-slate-400">Referral Code</dt><dd className="font-mono">{client.referral_code}</dd></div>}
            </dl>
          </div>

          {/* QUICK ACTIONS */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {client.phone && (
                <>
                  <a href={`tel:${client.phone}`} className="w-full block text-center text-sm bg-blue-50 text-blue-700 py-2 rounded-lg font-medium hover:bg-blue-100">
                    Call Client
                  </a>
                  <a href={`sms:${client.phone}`} className="w-full block text-center text-sm bg-green-50 text-green-700 py-2 rounded-lg font-medium hover:bg-green-100">
                    Text Client
                  </a>
                </>
              )}
              <Link href={`/dashboard/bookings?client_id=${id}`} className="w-full block text-center text-sm bg-slate-50 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-100">
                View All Bookings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
