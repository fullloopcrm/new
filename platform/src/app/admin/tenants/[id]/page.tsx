'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TENANT_STATUS_COLORS, PLAN_COLORS } from '@/lib/constants'

type TenantDetail = {
  id: string
  name: string
  slug: string
  industry: string
  status: string
  plan: string
  phone: string | null
  email: string | null
  owner_email: string | null
  owner_phone: string | null
  sms_number: string | null
  domain: string | null
  website_url: string | null
  logo_url: string | null
  tagline: string | null
  primary_color: string | null
  secondary_color: string | null
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

type Health = {
  level: 'healthy' | 'watch' | 'at_risk'
  reasons: string[]
  daysSinceActive: number | null
}

const HEALTH_COLORS: Record<Health['level'], string> = {
  healthy: 'bg-green-50 text-green-600 border border-green-200',
  watch: 'bg-amber-50 text-amber-600 border border-amber-200',
  at_risk: 'bg-red-50 text-red-600 border border-red-200',
}

type AccountField = {
  key: string
  label: string
  value: string | number | boolean | null
  input: string
  options: Array<string | { label: string; value: string | number }> | null
  kind: string
}

const statusColors = TENANT_STATUS_COLORS

const planColors = PLAN_COLORS

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [status, setStatus] = useState('')
  const [plan, setPlan] = useState('')
  const [branding, setBranding] = useState<Record<string, string>>({})
  const [savingBrand, setSavingBrand] = useState(false)
  const [brandSaved, setBrandSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [onboardingUrl, setOnboardingUrl] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')
  const [accountFields, setAccountFields] = useState<AccountField[]>([])
  const [accountForm, setAccountForm] = useState<Record<string, string | number | boolean>>({})
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/tenants/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTenant(data.tenant)
        setMembers(data.members || [])
        setStats(data.stats || null)
        setHealth(data.health || null)
        setStatus(data.tenant?.status || '')
        setPlan(data.tenant?.plan || 'free')
        const t = data.tenant || {}
        setBranding({
          name: t.name || '',
          tagline: t.tagline || '',
          phone: t.phone || '',
          email: t.email || '',
          owner_phone: t.owner_phone || '',
          domain: t.domain || '',
          website_url: t.website_url || '',
          logo_url: t.logo_url || '',
          primary_color: t.primary_color || '',
          secondary_color: t.secondary_color || '',
        })
      })
    fetch(`/api/admin/tenants/${id}/onboarding-link`)
      .then((r) => r.json())
      .then((d) => setOnboardingUrl(d.url || ''))
      .catch(() => {})
    fetch(`/api/admin/businesses/${id}/profile`)
      .then((r) => r.json())
      .then((d) => {
        const accountOnly = ((d.profile?.fields || []) as (AccountField & { section: string })[])
          .filter((f) => f.section === 'account')
        setAccountFields(accountOnly)
        const values: Record<string, string | number | boolean> = {}
        for (const f of accountOnly) if (f.value != null) values[f.key] = f.value
        setAccountForm(values)
      })
      .catch(() => {})
  }, [id])

  async function saveAccountFields() {
    setAccountSaving(true)
    setAccountSaved(false)
    try {
      const res = await fetch(`/api/admin/businesses/${id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: accountForm }),
      })
      if (res.ok) {
        setAccountSaved(true)
        setTimeout(() => setAccountSaved(false), 3000)
      }
    } finally {
      setAccountSaving(false)
    }
  }

  async function resendOnboardingLink() {
    setLinkBusy(true)
    setLinkMsg('')
    try {
      const res = await fetch(`/api/admin/tenants/${id}/onboarding-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend' }),
      })
      const d = await res.json()
      setOnboardingUrl(d.url || onboardingUrl)
      setLinkMsg(d.sent ? 'Sent.' : 'No owner email on file — copy the link instead.')
    } finally {
      setLinkBusy(false)
      setTimeout(() => setLinkMsg(''), 4000)
    }
  }

  async function regenerateOnboardingLink() {
    if (!confirm('This invalidates the current link — anyone with the old one loses access. Continue?')) return
    setLinkBusy(true)
    setLinkMsg('')
    try {
      const res = await fetch(`/api/admin/tenants/${id}/onboarding-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      })
      const d = await res.json()
      setOnboardingUrl(d.url || '')
      setLinkMsg('New link generated — old one no longer works.')
    } finally {
      setLinkBusy(false)
      setTimeout(() => setLinkMsg(''), 4000)
    }
  }

  function copyOnboardingLink() {
    if (!onboardingUrl) return
    navigator.clipboard.writeText(onboardingUrl).then(() => {
      setLinkMsg('Copied.')
      setTimeout(() => setLinkMsg(''), 2000)
    })
  }

  async function saveBranding() {
    setSavingBrand(true)
    setBrandSaved(false)
    await fetch(`/api/admin/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branding),
    })
    setSavingBrand(false)
    setBrandSaved(true)
    setTimeout(() => setBrandSaved(false), 3000)
  }

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

  if (!tenant) return <p className="text-slate-500">Loading...</p>

  const integrations = [
    { label: 'Email (Resend)', connected: !!tenant.resend_api_key },
    { label: 'SMS (Telnyx)', connected: !!(tenant.telnyx_api_key && tenant.telnyx_phone) },
    { label: 'Payments (Stripe)', connected: !!tenant.stripe_account_id },
  ]

  return (
    <div>
      <Link href="/admin/tenants" className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block">
        &larr; All Tenants
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-slate-900 font-heading text-2xl font-bold">{tenant.name}</h1>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[tenant.status] || 'bg-slate-200 text-slate-400'}`}>
          {tenant.status}
        </span>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${planColors[tenant.plan || 'free'] || 'bg-slate-200 text-slate-400'}`}>
          {tenant.plan || 'free'}
        </span>
        {health && (
          <span
            title={health.reasons.join('; ') || 'No issues detected'}
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${HEALTH_COLORS[health.level]}`}
          >
            {health.level === 'at_risk' ? 'At risk' : health.level === 'watch' ? 'Watch' : 'Healthy'}
          </span>
        )}
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 border-b border-slate-200 pb-6">
          {[
            { label: 'Clients', value: stats.clients, color: 'border-l-teal-500' },
            { label: 'Bookings', value: stats.bookings, color: 'border-l-green-500' },
            { label: 'Team Members', value: stats.team_members, color: 'border-l-purple-500' },
            { label: 'Revenue', value: `$${(stats.revenue / 100).toLocaleString()}`, color: 'border-l-emerald-500' },
          ].map((s) => (
            <div key={s.label} className={`border-l-4 ${s.color} pl-4 py-3`}>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Details */}
        <div>
          <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-4 pb-3 border-b border-slate-200">Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Slug</dt><dd className="font-mono text-xs text-slate-900">{tenant.slug}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Industry</dt><dd className="capitalize text-slate-900">{tenant.industry?.replace(/_/g, ' ')}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{tenant.phone || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="text-slate-900">{tenant.email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Zip Code</dt><dd className="text-slate-900">{tenant.zip_code || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Team Size</dt><dd className="text-slate-900">{tenant.team_size || 'solo'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Timezone</dt><dd className="text-slate-900">{tenant.timezone}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Setup Complete</dt><dd className="text-slate-900">{tenant.setup_dismissed ? 'Yes' : 'In Progress'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd className="text-slate-900">{new Date(tenant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd></div>
          </dl>

          <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Plan</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
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
          <div>
            <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-4 pb-3 border-b border-slate-200">Members ({members.length})</h2>
            {members.length === 0 ? (
              <p className="text-sm text-slate-500">No members yet</p>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{m.name || m.email || m.clerk_user_id.slice(0, 12)}</p>
                      <p className="text-slate-500 text-xs">{m.email || m.clerk_user_id}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-500 capitalize">{m.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Integrations */}
          <div>
            <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-4 pb-3 border-b border-slate-200">Integrations</h2>
            <div className="space-y-3">
              {integrations.map((i) => (
                <div key={i.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{i.label}</span>
                  <span className={`flex items-center gap-1.5 text-xs ${i.connected ? 'text-green-600' : 'text-slate-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${i.connected ? 'bg-green-400' : 'bg-slate-200'}`} />
                    {i.connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Message */}
          <div>
            <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-4 pb-3 border-b border-slate-200">Send Direct Message</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message to this tenant..."
              rows={3}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 resize-none placeholder-slate-400"
            />
            <button onClick={sendMessage} disabled={sending || !message.trim()} className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold text-white disabled:opacity-50 w-full transition-colors">
              {sending ? 'Sending...' : sent ? 'Sent!' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding Link — the no-login, always-autosaving profile questionnaire
          auto-created and emailed the moment this tenant was created. */}
      <div className="mb-6">
        <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-1 pb-3 border-b border-slate-200">Onboarding Link</h2>
        <p className="text-xs text-slate-500 mt-2 mb-3">No-login link the tenant owner uses to fill in their business profile. Regenerating invalidates the previous link.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input readOnly value={onboardingUrl} className="flex-1 min-w-[280px] bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-600" />
          <button onClick={copyOnboardingLink} disabled={!onboardingUrl} className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50">Copy</button>
          <button onClick={resendOnboardingLink} disabled={linkBusy} className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50">Resend email</button>
          <button onClick={regenerateOnboardingLink} disabled={linkBusy} className="px-3 py-2 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">Regenerate</button>
        </div>
        {linkMsg && <p className="text-xs text-teal-600 mt-2">{linkMsg}</p>}
      </div>

      {/* Account (Internal) — audience:'admin' fields in the tenant-profile
          registry (src/lib/tenant-profile.ts). Never shown on the tenant-
          facing Settings/onboarding link; writes through the existing
          admin-only profile endpoint (already gated by requireAdmin()). */}
      {accountFields.length > 0 && (
        <div className="mb-6">
          <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-1 pb-3 border-b border-slate-200">Account (Internal)</h2>
          <p className="text-xs text-slate-500 mt-2 mb-4">Not visible to the tenant — account ownership, contract, and payout details for internal use only.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accountFields.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">{f.label}</label>
                {f.input === 'select' ? (
                  <select
                    value={(accountForm[f.key] as string) ?? ''}
                    onChange={(e) => setAccountForm((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {(f.options || []).map((o) => {
                      const opt = typeof o === 'string' ? { label: o, value: o } : o
                      return <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                    })}
                  </select>
                ) : f.input === 'textarea' ? (
                  <textarea
                    value={(accountForm[f.key] as string) ?? ''}
                    onChange={(e) => setAccountForm((v) => ({ ...v, [f.key]: e.target.value }))}
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                ) : f.kind === 'number' ? (
                  <input
                    type="number"
                    value={(accountForm[f.key] as number) ?? ''}
                    onChange={(e) => setAccountForm((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    type="text"
                    value={(accountForm[f.key] as string) ?? ''}
                    onChange={(e) => setAccountForm((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          <button onClick={saveAccountFields} disabled={accountSaving} className="mt-4 bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold text-white disabled:opacity-50 transition-colors">
            {accountSaving ? 'Saving...' : accountSaved ? 'Saved!' : 'Save Account Details'}
          </button>
        </div>
      )}

      {/* Site Branding — personalizes the tenant's site (shared de-branded template) */}
      <div className="mb-6">
        <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-1 pb-3 border-b border-slate-200">Site Branding</h2>
        <p className="text-xs text-slate-500 mt-2 mb-4">Drives this tenant&apos;s public site, which renders from the shared template. Saved to the tenant record — no redeploy needed.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            ['name', 'Business Name'],
            ['tagline', 'Tagline'],
            ['phone', 'Sales Phone'],
            ['owner_phone', 'Support Phone'],
            ['email', 'Email'],
            ['domain', 'Custom Domain'],
            ['website_url', 'Website URL'],
            ['logo_url', 'Logo URL'],
            ['primary_color', 'Primary Color (hex)'],
            ['secondary_color', 'Accent Color (hex)'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">{label}</label>
              <input
                type="text"
                value={branding[key] ?? ''}
                onChange={(e) => setBranding((b) => ({ ...b, [key]: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <button onClick={saveBranding} disabled={savingBrand} className="mt-4 bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-cta font-semibold text-white disabled:opacity-50 transition-colors">
          {savingBrand ? 'Saving...' : brandSaved ? 'Saved!' : 'Save Branding'}
        </button>
      </div>
    </div>
  )
}
