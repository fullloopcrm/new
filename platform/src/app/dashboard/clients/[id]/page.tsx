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

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Client>>({})
  const [saving, setSaving] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([])

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

  return (
    <div>
      <Link href="/dashboard/clients" className="text-sm text-slate-400 hover:text-slate-900 mb-4 inline-block">
        &larr; All Clients
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{client.name}</h2>
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
                <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd>{client.email || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Phone</dt><dd>{client.phone || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Address</dt><dd>{client.address || '—'}{client.unit ? `, ${client.unit}` : ''}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Source</dt><dd className="capitalize">{client.source || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="capitalize">{client.status}</dd></div>
                {client.notes && <div><dt className="text-slate-400 mb-1">Notes</dt><dd className="bg-slate-50 rounded p-2">{client.notes}</dd></div>}
                {client.special_instructions && <div><dt className="text-slate-400 mb-1">Special Instructions</dt><dd className="bg-yellow-500/10 rounded p-2">{client.special_instructions}</dd></div>}
              </dl>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Booking History</h3>
            {bookings.length === 0 ? (
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
                        b.status === 'completed' ? 'bg-green-50 text-green-700' :
                        b.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>{b.status}</span>
                      {b.price != null && <p className="text-xs text-slate-400 mt-1">${(b.price / 100).toFixed(2)}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
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

          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Timeline</h3>
            <p className="text-sm text-slate-400">
              Added {new Date(client.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
