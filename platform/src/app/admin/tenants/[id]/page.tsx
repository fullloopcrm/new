'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type TenantDetail = {
  id: string
  name: string
  slug: string
  industry: string
  status: string
  plan: string
  phone: string | null
  email: string | null
  zip_code: string | null
  team_size: string
  timezone: string
  created_at: string
  resend_api_key: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  stripe_account_id: string | null
  setup_dismissed: boolean
}

type Member = {
  id: string
  clerk_user_id: string
  role: string
  name: string | null
  email: string | null
}

type Stats = {
  clients: number
  bookings: number
  team_members: number
  revenue: number
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  setup: 'bg-teal-500/20 text-teal-400',
  suspended: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

const planColors: Record<string, string> = {
  pro: 'bg-teal-500/20 text-teal-400',
  starter: 'bg-green-500/20 text-green-400',
  free: 'bg-slate-600 text-slate-400',
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [status, setStatus] = useState('')
  const [plan, setPlan] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/tenants/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTenant(data.tenant)
        setMembers(data.members || [])
        setStats(data.stats || null)
        setStatus(data.tenant?.status || '')
        setPlan(data.tenant?.plan || 'free')
      })
  }, [id])

  async function updateTenant() {
    setSaving(true)
    await fetch(`/api/admin/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, plan }),
    })
    setSaving(false)
  }

  async function sendMessage() {
    if (!message.trim()) return
    setSending(true)
    await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Message from Full Loop',
        body: message,
        type: 'direct',
        target: 'tenant',
        target_value: id,
        published: true,
      }),
    })
    setSending(false)
    setSent(true)
    setMessage('')
    setTimeout(() => setSent(false), 3000)
  }

  if (!tenant) return <p className="text-slate-400">Loading...</p>

  const integrations = [
    { label: 'Email (Resend)', connected: !!tenant.resend_api_key },
    { label: 'SMS (Telnyx)', connected: !!(tenant.telnyx_api_key && tenant.telnyx_phone) },
    { label: 'Payments (Stripe)', connected: !!tenant.stripe_account_id },
  ]

  return (
    <div>
      <Link href="/admin/tenants" className="text-sm text-teal-400 hover:text-teal-300 mb-4 inline-block">
        &larr; All Tenants
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold font-heading">{tenant.name}</h1>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[tenant.status] || 'bg-slate-600 text-slate-400'}`}>
          {tenant.status}
        </span>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${planColors[tenant.plan || 'free'] || 'bg-slate-600 text-slate-400'}`}>
          {tenant.plan || 'free'}
        </span>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Clients', value: stats.clients, color: 'border-l-teal-500' },
            { label: 'Bookings', value: stats.bookings, color: 'border-l-green-500' },
            { label: 'Team Members', value: stats.team_members, color: 'border-l-purple-500' },
            { label: 'Revenue', value: `$${(stats.revenue / 100).toLocaleString()}`, color: 'border-l-emerald-500' },
          ].map((s) => (
            <div key={s.label} className={`bg-slate-800 rounded-xl border border-slate-700 border-l-4 ${s.color} p-5`}>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold font-mono mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Details Card */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="font-semibold text-sm mb-4">Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-400">Slug</dt><dd className="font-mono text-xs">{tenant.slug}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Industry</dt><dd className="capitalize">{tenant.industry?.replace(/_/g, ' ')}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Phone</dt><dd>{tenant.phone || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd>{tenant.email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Zip Code</dt><dd>{tenant.zip_code || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Team Size</dt><dd>{tenant.team_size || 'solo'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Timezone</dt><dd>{tenant.timezone}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Setup Complete</dt><dd>{tenant.setup_dismissed ? 'Yes' : 'In Progress'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Created</dt><dd>{new Date(tenant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd></div>
          </dl>

          <div className="mt-6 pt-4 border-t border-slate-700 space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Plan</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <button onClick={updateTenant} disabled={saving} className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold text-white disabled:opacity-50 w-full transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Members */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="font-semibold text-sm mb-4">Members ({members.length})</h2>
            {members.length === 0 ? (
              <p className="text-sm text-slate-400">No members yet</p>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{m.name || m.email || m.clerk_user_id.slice(0, 12)}</p>
                      <p className="text-slate-400 text-xs">{m.email || m.clerk_user_id}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-700 text-slate-400 capitalize">{m.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Integrations */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="font-semibold text-sm mb-4">Integrations</h2>
            <div className="space-y-3">
              {integrations.map((i) => (
                <div key={i.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{i.label}</span>
                  <span className={`flex items-center gap-1.5 text-xs ${i.connected ? 'text-green-400' : 'text-slate-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${i.connected ? 'bg-green-400' : 'bg-slate-600'}`} />
                    {i.connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Message */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="font-semibold text-sm mb-4">Send Direct Message</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message to this tenant..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm mb-3 resize-none placeholder-gray-600"
            />
            <button onClick={sendMessage} disabled={sending || !message.trim()} className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold text-white disabled:opacity-50 w-full transition-colors">
              {sending ? 'Sending...' : sent ? 'Sent!' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
