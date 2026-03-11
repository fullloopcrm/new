'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Business = {
  id: string
  name: string
  slug: string
  industry: string
  status: string
  phone: string | null
  email: string | null
  zip_code: string | null
  team_size: string
  timezone: string
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  admin_notes: string | null
  billing_status: string
  monthly_rate: number
  setup_fee: number
  setup_fee_paid_at: string | null
  payment_method: string | null
  last_active_at: string | null
  created_at: string
  gmail_account: string | null
  domain_name: string | null
  dns_configured: boolean
  email_domain_verified: boolean
  sms_number: string | null
  telnyx_phone: string | null
  website_published: boolean
  setup_progress: Record<string, boolean>
  resend_api_key: string | null
  telnyx_api_key: string | null
  google_place_id: string | null
  logo_url: string | null
  primary_color: string
  business_hours: string | null
}

type Invite = { id: string; email: string; role: string; accepted: boolean; expires_at: string; created_at: string }

type Checklist = {
  accounts: Record<string, boolean>
  dns_hosting: Record<string, boolean>
  resend: Record<string, boolean>
  telnyx: Record<string, boolean>
  stripe: Record<string, boolean>
  google: Record<string, boolean>
  website: Record<string, boolean>
  crm_setup: Record<string, boolean>
  billing: Record<string, boolean>
  credentials: Record<string, boolean>
  testing: Record<string, boolean>
  handoff: Record<string, boolean>
}

function Check({ done, onClick }: { done: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
        done ? 'bg-green-50 border border-green-300' : 'border border-slate-300 hover:border-slate-400'
      } ${onClick ? 'cursor-pointer' : ''}`}>
      {done && (
        <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}

function SectionHeader({ title, items }: { title: string; items: boolean[] }) {
  const done = items.filter(Boolean).length
  const total = items.length
  const allDone = done === total
  return (
    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
      <h3 className="font-heading font-semibold text-sm text-slate-900">{title}</h3>
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
        allDone ? 'bg-green-50 text-green-600' : done > 0 ? 'bg-yellow-50 text-yellow-600' : 'text-slate-400'
      }`}>{done}/{total}</span>
    </div>
  )
}

function Item({ done, label, detail, onClick, auto }: {
  done: boolean; label: string; detail?: string; onClick?: () => void; auto?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Check done={done} onClick={onClick} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{label}</p>
          {auto && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 uppercase">auto</span>}
        </div>
        {detail && <p className="text-xs text-slate-400 mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [biz, setBiz] = useState<Business | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [cl, setCl] = useState<Checklist | null>(null)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'onboarding' | 'billing' | 'contact' | 'notes'>('onboarding')

  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [gmailAccount, setGmailAccount] = useState('')
  const [domainName, setDomainName] = useState('')
  const [billingStatus, setBillingStatus] = useState('')
  const [monthlyRate, setMonthlyRate] = useState(0)
  const [setupFee, setSetupFee] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ ok?: boolean; error?: string } | null>(null)

  const fetchData = useCallback(() => {
    fetch(`/api/admin/businesses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const b = data.business
        setBiz(b)
        setInvites(data.invites || [])
        setCl(data.checklist || null)
        setProgress(data.progress || { completed: 0, total: 0 })
        if (b) {
          setOwnerName(b.owner_name || '')
          setOwnerEmail(b.owner_email || '')
          setOwnerPhone(b.owner_phone || '')
          setGmailAccount(b.gmail_account || '')
          setDomainName(b.domain_name || '')
          setBillingStatus(b.billing_status || 'setup')
          setMonthlyRate(b.monthly_rate || 0)
          setSetupFee(b.setup_fee || 0)
          setPaymentMethod(b.payment_method || '')
          setAdminNotes(b.admin_notes || '')
          setStatus(b.status || 'setup')
        }
        setLoading(false)
      })
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function save(extra?: Record<string, unknown>) {
    setSaving(true)
    await fetch(`/api/admin/businesses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status, billing_status: billingStatus,
        monthly_rate: monthlyRate, setup_fee: setupFee,
        payment_method: paymentMethod || null,
        owner_name: ownerName || null, owner_email: ownerEmail || null, owner_phone: ownerPhone || null,
        gmail_account: gmailAccount || null, domain_name: domainName || null,
        admin_notes: adminNotes || null,
        ...extra,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    fetchData()
  }

  async function saveField(updates: Record<string, unknown>) {
    await fetch(`/api/admin/businesses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    fetchData()
  }

  async function toggleCheck(key: string) {
    const current = biz?.setup_progress || {}
    await fetch(`/api/admin/businesses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setup_progress: { [key]: !current[key] } }),
    })
    fetchData()
  }

  async function startImpersonation() {
    setImpersonating(true)
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: id }),
    })
    if (res.ok) router.push('/dashboard')
    else setImpersonating(false)
  }

  async function sendInvite() {
    const email = inviteEmail.trim() || ownerEmail.trim()
    if (!email) { setInviteResult({ error: 'Enter an email' }); return }
    setSendingInvite(true)
    setInviteResult(null)
    const res = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: id, email, role: 'owner' }),
    })
    const data = await res.json()
    setSendingInvite(false)
    if (res.ok) { setInviteResult({ ok: true }); setInviteEmail(''); fetchData() }
    else setInviteResult({ error: data.error || 'Failed' })
  }

  if (loading) return <p className="text-slate-500">Loading...</p>
  if (!biz) return <p className="text-slate-500">Not found</p>

  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  const tabs = [
    { key: 'onboarding' as const, label: `Onboarding (${pct}%)` },
    { key: 'billing' as const, label: 'Billing' },
    { key: 'contact' as const, label: 'Contact & Access' },
    { key: 'notes' as const, label: 'Notes' },
  ]

  return (
    <div>
      <Link href="/admin/businesses" className="text-sm text-teal-600 hover:text-teal-700 mb-6 inline-block">&larr; All Businesses</Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold font-heading text-slate-900">{biz.name}</h1>
            <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
              biz.status === 'active' ? 'bg-green-50 text-green-600' :
              biz.status === 'setup' ? 'bg-teal-50 text-teal-600' :
              biz.status === 'suspended' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
            }`}>{biz.status}</span>
            <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
              biz.billing_status === 'active' ? 'bg-green-50 text-green-600' :
              biz.billing_status === 'past_due' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
            }`}>billing: {biz.billing_status}</span>
          </div>
          <p className="text-slate-500 capitalize">{biz.industry?.replace(/_/g, ' ')} &middot; {biz.zip_code || '—'} &middot; {biz.timezone}</p>
          {biz.owner_name && <p className="text-slate-500 mt-1">{biz.owner_name} {biz.owner_email && `· ${biz.owner_email}`}</p>}
        </div>

        <button onClick={startImpersonation} disabled={impersonating}
          className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-lg text-base font-cta font-bold disabled:opacity-50 transition-colors shadow-sm">
          {impersonating ? 'Entering...' : 'Enter Business Profile'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-heading font-semibold transition-colors -mb-px ${
              tab === t.key ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-400 hover:text-slate-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Onboarding */}
      {tab === 'onboarding' && (
        <div className="max-w-3xl space-y-8">
          {/* Progress bar */}
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-teal-600' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-mono text-slate-500">{progress.completed}/{progress.total}</span>
          </div>

          {cl ? (
            <>
              {/* 1. ACCOUNTS */}
              <div>
                <SectionHeader title="Accounts" items={Object.values(cl.accounts)} />
                <Item done={cl.accounts.gmail_created} label="Gmail account created" detail={biz.gmail_account || 'Enter below'} />
                <Item done={cl.accounts.gmail_2fa} label="2FA enabled on Gmail" onClick={() => toggleCheck('gmail_2fa')} />
                <Item done={cl.accounts.gmail_recovery_set} label="Recovery email / phone set" onClick={() => toggleCheck('gmail_recovery_set')} />
                <Item done={cl.accounts.domain_purchased} label="Domain purchased" detail={biz.domain_name || 'Enter below'} />
                <Item done={cl.accounts.domain_registrar_noted} label="Registrar noted" onClick={() => toggleCheck('domain_registrar_noted')} />
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 uppercase">Gmail</label>
                    <input value={gmailAccount} onChange={(e) => setGmailAccount(e.target.value)}
                      onBlur={() => { if (gmailAccount !== (biz.gmail_account || '')) saveField({ gmail_account: gmailAccount || null }) }}
                      placeholder="business@gmail.com" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase">Domain</label>
                    <input value={domainName} onChange={(e) => setDomainName(e.target.value)}
                      onBlur={() => { if (domainName !== (biz.domain_name || '')) saveField({ domain_name: domainName || null }) }}
                      placeholder="sparkleclean.com" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                </div>
              </div>

              {/* 2. DNS & HOSTING */}
              <div>
                <SectionHeader title="DNS & Hosting" items={Object.values(cl.dns_hosting)} />
                <Item done={cl.dns_hosting.domain_added_vercel} label="Domain added to Vercel" onClick={() => toggleCheck('domain_added_vercel')} />
                <Item done={cl.dns_hosting.dns_a_record} label="A record → 76.76.21.21" onClick={() => toggleCheck('dns_a_record')} />
                <Item done={cl.dns_hosting.dns_cname_www} label="CNAME www → cname.vercel-dns.com" onClick={() => toggleCheck('dns_cname_www')} />
                <Item done={cl.dns_hosting.mx_records} label="MX records configured" detail="Email receiving" onClick={() => toggleCheck('mx_records')} />
                <Item done={cl.dns_hosting.email_forwarding} label="Email forwarding configured" onClick={() => toggleCheck('email_forwarding')} />
                <Item done={cl.dns_hosting.ssl_active} label="SSL certificate active" onClick={() => toggleCheck('ssl_active')} />
                <Item done={cl.dns_hosting.dns_propagated} label="DNS propagated & verified" onClick={() => save({ dns_configured: !biz.dns_configured })} />
              </div>

              {/* 3. RESEND */}
              <div>
                <SectionHeader title="Resend — Email" items={Object.values(cl.resend)} />
                <Item done={cl.resend.resend_account_created} label="Resend account created" onClick={() => toggleCheck('resend_account_created')} />
                <Item done={cl.resend.resend_domain_added} label="Sending domain added" onClick={() => toggleCheck('resend_domain_added')} />
                <Item done={cl.resend.resend_dkim_added} label="DKIM records added" onClick={() => toggleCheck('resend_dkim_added')} />
                <Item done={cl.resend.resend_spf_added} label="SPF record added" onClick={() => toggleCheck('resend_spf_added')} />
                <Item done={cl.resend.resend_dmarc_added} label="DMARC record added" onClick={() => toggleCheck('resend_dmarc_added')} />
                <Item done={cl.resend.resend_domain_verified} label="Domain verified" onClick={() => save({ email_domain_verified: !biz.email_domain_verified })} />
                <Item done={cl.resend.resend_api_key_generated} label="API key generated" onClick={() => toggleCheck('resend_api_key_generated')} />
                <Item done={cl.resend.resend_api_key_saved} label="API key saved in platform" auto />
              </div>

              {/* 4. TELNYX */}
              <div>
                <SectionHeader title="Telnyx — SMS" items={Object.values(cl.telnyx)} />
                <Item done={cl.telnyx.telnyx_account_created} label="Telnyx account created" onClick={() => toggleCheck('telnyx_account_created')} />
                <Item done={cl.telnyx.telnyx_compliance_submitted} label="Compliance submitted" onClick={() => toggleCheck('telnyx_compliance_submitted')} />
                <Item done={cl.telnyx.telnyx_compliance_approved} label="Compliance approved" onClick={() => toggleCheck('telnyx_compliance_approved')} />
                <Item done={cl.telnyx.telnyx_number_purchased} label="Phone number purchased" detail={biz.sms_number || biz.telnyx_phone || ''} auto />
                <Item done={cl.telnyx.telnyx_messaging_profile} label="Messaging profile configured" onClick={() => toggleCheck('telnyx_messaging_profile')} />
                <Item done={cl.telnyx.telnyx_webhook_url} label="Webhook URL configured" onClick={() => toggleCheck('telnyx_webhook_url')} />
                <Item done={cl.telnyx.telnyx_api_key_generated} label="API key generated" onClick={() => toggleCheck('telnyx_api_key_generated')} />
                <Item done={cl.telnyx.telnyx_api_key_saved} label="API key saved in platform" auto />
              </div>

              {/* 5. STRIPE */}
              <div>
                <SectionHeader title="Stripe — Payments" items={Object.values(cl.stripe)} />
                <Item done={cl.stripe.stripe_account_created} label="Stripe account created" onClick={() => toggleCheck('stripe_account_created')} />
                <Item done={cl.stripe.stripe_business_verified} label="Business verified" onClick={() => toggleCheck('stripe_business_verified')} />
                <Item done={cl.stripe.stripe_bank_connected} label="Bank account connected" onClick={() => toggleCheck('stripe_bank_connected')} />
                <Item done={cl.stripe.stripe_webhook_configured} label="Webhook configured" onClick={() => toggleCheck('stripe_webhook_configured')} />
                <Item done={cl.stripe.stripe_connected_platform} label="Account ID saved" auto />
                <Item done={cl.stripe.stripe_test_payment} label="Test payment processed" onClick={() => toggleCheck('stripe_test_payment')} />
              </div>

              {/* 6. GOOGLE */}
              <div>
                <SectionHeader title="Google" items={Object.values(cl.google)} />
                <Item done={cl.google.gbp_created} label="Google Business Profile created" onClick={() => toggleCheck('gbp_created')} />
                <Item done={cl.google.gbp_verified} label="Business verified" onClick={() => toggleCheck('gbp_verified')} />
                <Item done={cl.google.gbp_photos_added} label="Photos uploaded" onClick={() => toggleCheck('gbp_photos_added')} />
                <Item done={cl.google.gbp_hours_set} label="Business hours set" onClick={() => toggleCheck('gbp_hours_set')} />
                <Item done={cl.google.place_id_saved} label="Place ID saved" auto />
                <Item done={cl.google.search_console_verified} label="Search Console verified" onClick={() => toggleCheck('search_console_verified')} />
              </div>

              {/* 7. WEBSITE */}
              <div>
                <SectionHeader title="Website" items={Object.values(cl.website)} />
                <Item done={cl.website.vercel_project_created} label="Vercel project created" onClick={() => toggleCheck('vercel_project_created')} />
                <Item done={cl.website.vercel_env_vars} label="Env vars configured" onClick={() => toggleCheck('vercel_env_vars')} />
                <Item done={cl.website.content_collected} label="Content collected from owner" onClick={() => toggleCheck('website_content_ready')} />
                <Item done={cl.website.template_configured} label="Template configured" onClick={() => toggleCheck('website_template_configured')} />
                <Item done={cl.website.website_deployed} label="Website deployed" auto />
                <Item done={cl.website.custom_domain_live} label="Custom domain live" auto />
                <Item done={cl.website.analytics_installed} label="Google Analytics installed" onClick={() => toggleCheck('analytics_installed')} />
                <Item done={cl.website.tracking_on_existing_site} label="Tracking pixel on existing site" onClick={() => toggleCheck('tracking_installed')} />
              </div>

              {/* 8. CRM SETUP */}
              <div>
                <SectionHeader title="CRM Setup" items={Object.values(cl.crm_setup)} />
                <Item done={cl.crm_setup.services} label="Services configured" auto />
                <Item done={cl.crm_setup.business_hours} label="Business hours set" auto />
                <Item done={cl.crm_setup.phone_email} label="Phone & email set" auto />
                <Item done={cl.crm_setup.branding} label="Branding configured" auto />
              </div>

              {/* 9. CREDENTIALS */}
              <div>
                <SectionHeader title="Credentials & Security" items={Object.values(cl.credentials)} />
                <Item done={cl.credentials.gmail_password_changed} label="Gmail password changed by owner" onClick={() => toggleCheck('gmail_password_changed')} />
                <Item done={cl.credentials.resend_password_changed} label="Resend password changed" onClick={() => toggleCheck('resend_password_changed')} />
                <Item done={cl.credentials.telnyx_password_changed} label="Telnyx password changed" onClick={() => toggleCheck('telnyx_password_changed')} />
                <Item done={cl.credentials.stripe_password_changed} label="Stripe password changed" onClick={() => toggleCheck('stripe_password_changed')} />
                <Item done={cl.credentials.all_credentials_documented} label="All credentials documented" onClick={() => toggleCheck('all_credentials_documented')} />
              </div>

              {/* 10. TESTING */}
              <div>
                <SectionHeader title="Testing" items={Object.values(cl.testing)} />
                <Item done={cl.testing.test_booking} label="Test booking end-to-end" onClick={() => toggleCheck('test_booking_done')} />
                <Item done={cl.testing.test_email_outbound} label="Outbound email works" onClick={() => toggleCheck('test_email_received')} />
                <Item done={cl.testing.test_email_inbound} label="Inbound email forwarding works" onClick={() => toggleCheck('test_email_inbound')} />
                <Item done={cl.testing.test_sms_outbound} label="Outbound SMS works" onClick={() => toggleCheck('test_sms_received')} />
                <Item done={cl.testing.test_sms_inbound} label="Inbound SMS works" onClick={() => toggleCheck('test_sms_inbound')} />
                <Item done={cl.testing.test_payment} label="Payment processed end-to-end" onClick={() => toggleCheck('test_payment_done')} />
                <Item done={cl.testing.test_portal} label="Client portal tested" onClick={() => toggleCheck('test_portal_done')} />
                <Item done={cl.testing.test_team_portal} label="Team portal tested" onClick={() => toggleCheck('test_team_portal_done')} />
              </div>

              {/* 11. HANDOFF */}
              <div>
                <SectionHeader title="Handoff" items={Object.values(cl.handoff)} />
                <Item done={cl.handoff.credentials_doc} label="Credentials document shared" onClick={() => toggleCheck('credentials_shared')} />
                <Item done={cl.handoff.invite_sent} label="Invite sent to owner" auto />
                <Item done={cl.handoff.invite_accepted} label="Owner accepted invite" auto />
                <Item done={cl.handoff.owner_logged_in} label="Owner logged in" detail={biz.last_active_at ? new Date(biz.last_active_at).toLocaleString() : 'Never'} auto />
                <Item done={cl.handoff.walkthrough_done} label="Walkthrough call completed" onClick={() => toggleCheck('walkthrough_done')} />
              </div>
            </>
          ) : (
            <p className="text-slate-400">No checklist data available.</p>
          )}
        </div>
      )}

      {/* TAB: Billing */}
      {tab === 'billing' && (
        <div className="max-w-lg space-y-5">
          <div>
            <label className="text-xs text-slate-400 uppercase">Account Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1">
              <option value="setup">Setup</option><option value="active">Active</option>
              <option value="suspended">Suspended</option><option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase">Billing Status</label>
            <select value={billingStatus} onChange={(e) => setBillingStatus(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1">
              <option value="setup">Setup</option><option value="active">Active</option>
              <option value="past_due">Past Due</option><option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 uppercase">Monthly Rate ($)</label>
              <input type="number" value={monthlyRate} onChange={(e) => setMonthlyRate(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase">Setup Fee ($)</label>
              <input type="number" value={setupFee} onChange={(e) => setSetupFee(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase">Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1">
              <option value="">Not set</option><option value="zelle">Zelle</option>
              <option value="apple_cash">Apple Cash</option><option value="stripe">Stripe</option>
              <option value="check">Check</option><option value="cash">Cash</option>
            </select>
          </div>
          <button
            onClick={() => save({ setup_fee_paid_at: biz?.setup_fee_paid_at ? null : new Date().toISOString() })}
            className={`text-sm py-2 px-4 rounded-lg font-medium ${
              biz?.setup_fee_paid_at ? 'bg-green-50 text-green-600' : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
            }`}>
            {biz?.setup_fee_paid_at ? `Setup fee paid ${new Date(biz.setup_fee_paid_at).toLocaleDateString()}` : 'Mark setup fee as paid'}
          </button>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="font-heading font-semibold text-slate-900 mb-3">Activate Business</h3>
            <p className="text-sm text-slate-500 mb-4">Set account and billing status to active. This gives the business full access to the platform.</p>
            {biz.status === 'active' && biz.billing_status === 'active' ? (
              <p className="text-sm text-green-600 font-semibold">This business is active.</p>
            ) : (
              <button onClick={() => {
                setStatus('active')
                setBillingStatus('active')
                save({ status: 'active', billing_status: 'active' })
              }}
                className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-lg text-sm font-cta font-semibold transition-colors">
                Activate Business
              </button>
            )}
          </div>

          <div className="pt-4">
            <button onClick={() => save()} disabled={saving}
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* TAB: Contact & Access */}
      {tab === 'contact' && (
        <div className="max-w-lg space-y-6">
          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-slate-900">Owner Contact</h3>
            <div>
              <label className="text-xs text-slate-400 uppercase">Name</label>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase">Email</label>
              <input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase">Phone</label>
              <input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h3 className="font-heading font-semibold text-slate-900">Invite Owner</h3>
            <div className="flex gap-2">
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={ownerEmail || 'owner@email.com'}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400" />
              <button onClick={sendInvite} disabled={sendingInvite}
                className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors">
                {sendingInvite ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
            {inviteResult?.ok && <p className="text-sm text-green-600">Invite sent!</p>}
            {inviteResult?.error && <p className="text-sm text-red-500">{inviteResult.error}</p>}
            {invites.length > 0 && (
              <div className="space-y-1 pt-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{inv.email}</span>
                    <span className={`text-xs font-medium ${inv.accepted ? 'text-green-600' : new Date(inv.expires_at) < new Date() ? 'text-red-500' : 'text-yellow-600'}`}>
                      {inv.accepted ? 'Accepted' : new Date(inv.expires_at) < new Date() ? 'Expired' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 uppercase mb-1">Slug</p>
            <p className="text-sm font-mono text-slate-600">{biz.slug}</p>
            <p className="text-xs text-slate-400 uppercase mb-1 mt-3">Created</p>
            <p className="text-sm text-slate-600">{new Date(biz.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs text-slate-400 uppercase mb-1 mt-3">Last Active</p>
            <p className="text-sm text-slate-600">{biz.last_active_at ? new Date(biz.last_active_at).toLocaleString() : 'Never'}</p>
          </div>

          <div className="pt-4">
            <button onClick={() => save()} disabled={saving}
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* TAB: Notes */}
      {tab === 'notes' && (
        <div className="max-w-2xl">
          <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Private admin notes about this business..."
            rows={12}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm resize-none placeholder-slate-400" />
          <div className="mt-4">
            <button onClick={() => save()} disabled={saving}
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Notes'}
            </button>
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="mt-16 pt-6 border-t border-slate-200">
        <button onClick={() => { if (confirm(`Delete "${biz.name}"? This cannot be undone.`)) { fetch(`/api/admin/businesses/${id}`, { method: 'DELETE' }).then(() => router.push('/admin/businesses')) } }}
          className="text-sm text-slate-400 hover:text-red-500 transition-colors">
          Delete this business
        </button>
      </div>
    </div>
  )
}
