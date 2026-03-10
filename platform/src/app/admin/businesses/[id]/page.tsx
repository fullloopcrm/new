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

type Stats = { clients: number; bookings: number; team_members: number; services: number; revenue: number }

function Check({ done, onClick }: { done: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
        done ? 'bg-green-500/20 border border-green-500/50' : 'border border-slate-600 hover:border-gray-500'
      } ${onClick ? 'cursor-pointer' : ''}`}>
      {done && (
        <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}

function SectionHeader({ title, items, icon }: { title: string; items: boolean[]; icon: string }) {
  const done = items.filter(Boolean).length
  const total = items.length
  const allDone = done === total
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400">{title}</h3>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
        allDone ? 'bg-green-500/20 text-green-400' : done > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-600 text-slate-400'
      }`}>{done}/{total}</span>
    </div>
  )
}

function Item({ done, label, detail, onClick, auto }: {
  done: boolean; label: string; detail?: string; onClick?: () => void; auto?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      <Check done={done} onClick={onClick} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-gray-200'}`}>{label}</p>
          {auto && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 uppercase">auto</span>}
        </div>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
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
  const [stats, setStats] = useState<Stats | null>(null)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  // Editable fields
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

  // Invite
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
        setStats(data.stats || null)
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

  // Save all editable fields
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

  // Auto-save a field on blur
  async function saveField(updates: Record<string, unknown>) {
    await fetch(`/api/admin/businesses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    fetchData()
  }

  // Toggle a manual checkoff in setup_progress
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

  if (loading) return <p className="text-slate-400 p-8">Loading...</p>
  if (!biz) return <p className="text-slate-400 p-8">Not found</p>

  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <div>
      <Link href="/admin/businesses" className="text-sm text-teal-400 hover:text-teal-300 mb-4 inline-block">&larr; All Businesses</Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading">{biz.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              biz.status === 'active' ? 'bg-green-500/20 text-green-400' :
              biz.status === 'setup' ? 'bg-teal-500/20 text-teal-400' :
              biz.status === 'suspended' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
            }`}>{biz.status}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 capitalize">{biz.industry?.replace(/_/g, ' ')} &middot; {biz.zip_code || '—'} &middot; {biz.timezone}</p>
        </div>
        <button onClick={startImpersonation} disabled={impersonating}
          className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors">
          {impersonating ? 'Entering...' : 'Log In as Business'}
        </button>
      </div>

      {/* Progress */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Onboarding Progress</span>
          <span className="text-sm text-slate-400">{progress.completed}/{progress.total} &middot; {pct}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-teal-600' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Clients', value: stats.clients, color: 'border-l-teal-500' },
            { label: 'Bookings', value: stats.bookings, color: 'border-l-green-500' },
            { label: 'Team', value: stats.team_members, color: 'border-l-purple-500' },
            { label: 'Services', value: stats.services, color: 'border-l-orange-500' },
            { label: 'Revenue', value: `$${(stats.revenue / 100).toLocaleString()}`, color: 'border-l-emerald-500' },
          ].map((s) => (
            <div key={s.label} className={`bg-slate-800 border border-slate-700 border-l-4 ${s.color} rounded-xl p-4`}>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-bold font-mono mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT + CENTER: Granular Checklist */}
        <div className="lg:col-span-2 space-y-3">
          {cl && (
            <>
              {/* 1. ACCOUNTS */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Accounts" icon="📧" items={Object.values(cl.accounts)} />
                <Item done={cl.accounts.gmail_created} label="Gmail account created"
                  detail={biz.gmail_account || 'Enter below'} />
                <Item done={cl.accounts.gmail_2fa} label="2FA enabled on Gmail"
                  onClick={() => toggleCheck('gmail_2fa')} />
                <Item done={cl.accounts.gmail_recovery_set} label="Recovery email / phone set"
                  detail="So owner can recover access if locked out"
                  onClick={() => toggleCheck('gmail_recovery_set')} />
                <Item done={cl.accounts.domain_purchased} label="Domain purchased"
                  detail={biz.domain_name || 'Enter below'} />
                <Item done={cl.accounts.domain_registrar_noted} label="Registrar noted (Namecheap, GoDaddy, etc.)"
                  onClick={() => toggleCheck('domain_registrar_noted')} />

                <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Gmail Account</label>
                    <input value={gmailAccount} onChange={(e) => setGmailAccount(e.target.value)}
                      onBlur={() => { if (gmailAccount !== (biz.gmail_account || '')) saveField({ gmail_account: gmailAccount || null }) }}
                      placeholder="business@gmail.com" className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-xs mt-0.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Domain</label>
                    <input value={domainName} onChange={(e) => setDomainName(e.target.value)}
                      onBlur={() => { if (domainName !== (biz.domain_name || '')) saveField({ domain_name: domainName || null }) }}
                      placeholder="sparkleclean.com" className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-xs mt-0.5" />
                  </div>
                </div>
              </div>

              {/* 2. DNS & HOSTING */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="DNS & Hosting" icon="🌐" items={Object.values(cl.dns_hosting)} />
                <Item done={cl.dns_hosting.domain_added_vercel} label="Domain added to Vercel project"
                  onClick={() => toggleCheck('domain_added_vercel')} />
                <Item done={cl.dns_hosting.dns_a_record} label="A record → 76.76.21.21 (Vercel)"
                  onClick={() => toggleCheck('dns_a_record')} />
                <Item done={cl.dns_hosting.dns_cname_www} label="CNAME www → cname.vercel-dns.com"
                  onClick={() => toggleCheck('dns_cname_www')} />
                <Item done={cl.dns_hosting.mx_records} label="MX records for email receiving"
                  detail="Google Workspace MX or email forwarding provider"
                  onClick={() => toggleCheck('mx_records')} />
                <Item done={cl.dns_hosting.email_forwarding} label="Email forwarding configured"
                  detail={domainName ? `info@${domainName} → ${biz.gmail_account || 'Gmail'}` : 'Need domain first'}
                  onClick={() => toggleCheck('email_forwarding')} />
                <Item done={cl.dns_hosting.ssl_active} label="SSL certificate active"
                  detail="Auto-provisioned by Vercel after DNS propagation"
                  onClick={() => toggleCheck('ssl_active')} />
                <Item done={cl.dns_hosting.dns_propagated} label="DNS fully propagated & verified"
                  detail="Site loads on custom domain"
                  onClick={() => save({ dns_configured: !biz.dns_configured })} />
              </div>

              {/* 3. RESEND — EMAIL */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Resend — Email" icon="✉️" items={Object.values(cl.resend)} />
                <Item done={cl.resend.resend_account_created} label="Resend account created"
                  detail="resend.com — sign up with business Gmail"
                  onClick={() => toggleCheck('resend_account_created')} />
                <Item done={cl.resend.resend_domain_added} label="Sending domain added in Resend"
                  detail={domainName ? `Add ${domainName} as sending domain` : 'Need domain first'}
                  onClick={() => toggleCheck('resend_domain_added')} />
                <Item done={cl.resend.resend_dkim_added} label="DKIM DNS records added"
                  detail="3 CNAME records from Resend dashboard"
                  onClick={() => toggleCheck('resend_dkim_added')} />
                <Item done={cl.resend.resend_spf_added} label="SPF DNS record added"
                  detail='TXT record: v=spf1 include:amazonses.com ~all'
                  onClick={() => toggleCheck('resend_spf_added')} />
                <Item done={cl.resend.resend_dmarc_added} label="DMARC DNS record added"
                  detail='TXT _dmarc: v=DMARC1; p=none;'
                  onClick={() => toggleCheck('resend_dmarc_added')} />
                <Item done={cl.resend.resend_domain_verified} label="Domain verified in Resend"
                  detail="Green checkmark on Resend domains page"
                  onClick={() => save({ email_domain_verified: !biz.email_domain_verified })} />
                <Item done={cl.resend.resend_api_key_generated} label="API key generated"
                  onClick={() => toggleCheck('resend_api_key_generated')} />
                <Item done={cl.resend.resend_api_key_saved} label="API key saved in platform"
                  detail="Via Log In as Business → Settings → Integrations" auto />
              </div>

              {/* 4. TELNYX — SMS */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Telnyx — SMS" icon="💬" items={Object.values(cl.telnyx)} />
                <Item done={cl.telnyx.telnyx_account_created} label="Telnyx account created"
                  detail="telnyx.com — sign up with business Gmail"
                  onClick={() => toggleCheck('telnyx_account_created')} />
                <Item done={cl.telnyx.telnyx_compliance_submitted} label="Business compliance submitted"
                  detail="KYC: business name, address, EIN/tax ID"
                  onClick={() => toggleCheck('telnyx_compliance_submitted')} />
                <Item done={cl.telnyx.telnyx_compliance_approved} label="Compliance approved"
                  detail="Can take 1-3 business days"
                  onClick={() => toggleCheck('telnyx_compliance_approved')} />
                <Item done={cl.telnyx.telnyx_number_purchased} label="Phone number purchased"
                  detail={biz.sms_number || biz.telnyx_phone || 'Local number in business area code'} auto />
                <Item done={cl.telnyx.telnyx_messaging_profile} label="Messaging profile configured"
                  detail="Opt-out keywords, number format, character encoding"
                  onClick={() => toggleCheck('telnyx_messaging_profile')} />
                <Item done={cl.telnyx.telnyx_webhook_url} label="Webhook URL configured"
                  detail="For receiving inbound SMS — points to our API"
                  onClick={() => toggleCheck('telnyx_webhook_url')} />
                <Item done={cl.telnyx.telnyx_api_key_generated} label="API key (v2) generated"
                  onClick={() => toggleCheck('telnyx_api_key_generated')} />
                <Item done={cl.telnyx.telnyx_api_key_saved} label="API key saved in platform"
                  detail="Via Log In as Business → Settings → Integrations" auto />
              </div>

              {/* 5. STRIPE — PAYMENTS */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Stripe — Payments" icon="💰" items={Object.values(cl.stripe)} />
                <Item done={cl.stripe.stripe_account_created} label="Stripe account created"
                  detail="stripe.com — sign up with business Gmail"
                  onClick={() => toggleCheck('stripe_account_created')} />
                <Item done={cl.stripe.stripe_business_verified} label="Business identity verified"
                  detail="KYC: business name, EIN, owner SSN, bank statement"
                  onClick={() => toggleCheck('stripe_business_verified')} />
                <Item done={cl.stripe.stripe_bank_connected} label="Bank account / debit card connected"
                  detail="For receiving payouts from client payments"
                  onClick={() => toggleCheck('stripe_bank_connected')} />
                <Item done={cl.stripe.stripe_webhook_configured} label="Webhook endpoint configured"
                  detail="Payment success/failure events → our API"
                  onClick={() => toggleCheck('stripe_webhook_configured')} />
                <Item done={cl.stripe.stripe_connected_platform} label="Stripe account ID saved in platform"
                  detail="Stripe account ID saved in Settings → Integrations" auto />
                <Item done={cl.stripe.stripe_test_payment} label="Test payment processed"
                  detail="$1 test charge → refund to verify flow"
                  onClick={() => toggleCheck('stripe_test_payment')} />
              </div>

              {/* 6. GOOGLE */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Google" icon="🔍" items={Object.values(cl.google)} />
                <Item done={cl.google.gbp_created} label="Google Business Profile created"
                  detail="business.google.com — claim or create listing"
                  onClick={() => toggleCheck('gbp_created')} />
                <Item done={cl.google.gbp_verified} label="Business verified on Google"
                  detail="Postcard, phone, or instant verification"
                  onClick={() => toggleCheck('gbp_verified')} />
                <Item done={cl.google.gbp_photos_added} label="Photos & cover image uploaded"
                  detail="Logo, cover photo, interior/exterior, team at work"
                  onClick={() => toggleCheck('gbp_photos_added')} />
                <Item done={cl.google.gbp_hours_set} label="Business hours set on Google"
                  detail="Must match hours in CRM settings"
                  onClick={() => toggleCheck('gbp_hours_set')} />
                <Item done={cl.google.place_id_saved} label="Place ID saved in platform"
                  detail="Via Log In as Business → Settings → Integrations" auto />
                <Item done={cl.google.search_console_verified} label="Google Search Console verified"
                  detail={domainName ? `search.google.com/search-console — verify ${domainName}` : 'Need domain first'}
                  onClick={() => toggleCheck('search_console_verified')} />
              </div>

              {/* 7. WEBSITE */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Website" icon="🖥️" items={Object.values(cl.website)} />
                <Item done={cl.website.vercel_project_created} label="Vercel project created"
                  detail="From template repo — vercel.com/new"
                  onClick={() => toggleCheck('vercel_project_created')} />
                <Item done={cl.website.vercel_env_vars} label="Environment variables configured"
                  detail="Tenant ID, API URLs, analytics IDs in Vercel dashboard"
                  onClick={() => toggleCheck('vercel_env_vars')} />
                <Item done={cl.website.content_collected} label="Content collected from owner"
                  detail="About text, tagline, service list, photos, testimonials"
                  onClick={() => toggleCheck('website_content_ready')} />
                <Item done={cl.website.template_configured} label="Template configured & styled"
                  detail="Colors, fonts, layout matched to brand"
                  onClick={() => toggleCheck('website_template_configured')} />
                <Item done={cl.website.website_deployed} label="Website deployed to Vercel"
                  detail={biz.website_published ? 'Live' : 'Not yet deployed'} auto />
                <Item done={cl.website.custom_domain_live} label="Custom domain serving website"
                  detail={domainName && biz.dns_configured ? `${domainName} → live` : 'Requires DNS + deploy'} auto />
                <Item done={cl.website.analytics_installed} label="Google Analytics installed"
                  detail="GA4 measurement ID added to site"
                  onClick={() => toggleCheck('analytics_installed')} />
                <Item done={cl.website.tracking_on_existing_site} label="Tracking pixel on existing site"
                  detail="If business has another website, add our t.js script"
                  onClick={() => toggleCheck('tracking_installed')} />
              </div>

              {/* 8. CRM SETUP */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="CRM Setup" icon="⚙️" items={Object.values(cl.crm_setup)} />
                <Item done={cl.crm_setup.services} label={`Services configured${stats ? ` (${stats.services} active)` : ''}`}
                  detail="Via Log In as Business → Settings → Services" auto />
                <Item done={cl.crm_setup.business_hours} label="Business hours set"
                  detail="Via Log In as Business → Settings → Business" auto />
                <Item done={cl.crm_setup.phone_email} label="Business phone & email set"
                  detail="Via Log In as Business → Settings → Business" auto />
                <Item done={cl.crm_setup.branding} label="Branding configured (logo + colors)"
                  detail="Via Log In as Business → Settings → Branding" auto />
              </div>

              {/* 9. BILLING */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Billing" icon="💳" items={Object.values(cl.billing)} />
                <Item done={cl.billing.rate_set} label={`Monthly rate set${monthlyRate ? ` ($${monthlyRate}/mo)` : ''}`} auto />
                <Item done={cl.billing.payment_method} label={`Payment method${paymentMethod ? ` (${paymentMethod})` : ' not set'}`} auto />
                <Item done={cl.billing.setup_fee_paid} label={`Setup fee received${setupFee ? ` ($${setupFee})` : ''}`}
                  detail={biz.setup_fee_paid_at ? `Paid ${new Date(biz.setup_fee_paid_at).toLocaleDateString()}` : 'Not received'} />
              </div>

              {/* 10. CREDENTIALS & SECURITY */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Credentials & Security" icon="🔐" items={Object.values(cl.credentials)} />
                <Item done={cl.credentials.gmail_password_changed} label="Gmail — password changed by owner"
                  detail="Owner changes from temp password we set up"
                  onClick={() => toggleCheck('gmail_password_changed')} />
                <Item done={cl.credentials.resend_password_changed} label="Resend — password changed by owner"
                  detail="Owner updates login at resend.com"
                  onClick={() => toggleCheck('resend_password_changed')} />
                <Item done={cl.credentials.telnyx_password_changed} label="Telnyx — password changed by owner"
                  detail="Owner updates login at telnyx.com"
                  onClick={() => toggleCheck('telnyx_password_changed')} />
                <Item done={cl.credentials.stripe_password_changed} label="Stripe — password changed by owner"
                  detail="Owner updates login at stripe.com"
                  onClick={() => toggleCheck('stripe_password_changed')} />
                <Item done={cl.credentials.all_credentials_documented} label="All credentials documented & shared"
                  detail="Master doc with all logins, API keys, URLs sent to owner"
                  onClick={() => toggleCheck('all_credentials_documented')} />
              </div>

              {/* 11. TESTING */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Testing" icon="🧪" items={Object.values(cl.testing)} />
                <Item done={cl.testing.test_booking} label="Test booking created & completed"
                  detail="Full flow: create → confirm → complete → mark paid"
                  onClick={() => toggleCheck('test_booking_done')} />
                <Item done={cl.testing.test_email_outbound} label="Outbound email received"
                  detail="Booking confirmation arrives, check from address + spam"
                  onClick={() => toggleCheck('test_email_received')} />
                <Item done={cl.testing.test_email_inbound} label="Inbound email forwarding works"
                  detail={domainName ? `Send to info@${domainName} — arrives in Gmail` : 'Need email forwarding first'}
                  onClick={() => toggleCheck('test_email_inbound')} />
                <Item done={cl.testing.test_sms_outbound} label="Outbound SMS received"
                  detail="Reminder SMS from correct Telnyx number"
                  onClick={() => toggleCheck('test_sms_received')} />
                <Item done={cl.testing.test_sms_inbound} label="Inbound SMS received in platform"
                  detail="Reply to SMS → appears in client conversation"
                  onClick={() => toggleCheck('test_sms_inbound')} />
                <Item done={cl.testing.test_payment} label="Test payment processed end-to-end"
                  detail="Client portal → pay → Stripe → dashboard shows paid"
                  onClick={() => toggleCheck('test_payment_done')} />
                <Item done={cl.testing.test_portal} label="Client portal full test"
                  detail="Login → browse services → book → pay → rate experience"
                  onClick={() => toggleCheck('test_portal_done')} />
                <Item done={cl.testing.test_team_portal} label="Team portal full test"
                  detail="PIN login → view jobs → check in → check out → view earnings"
                  onClick={() => toggleCheck('test_team_portal_done')} />
              </div>

              {/* 12. HANDOFF */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <SectionHeader title="Handoff" icon="🤝" items={Object.values(cl.handoff)} />
                <Item done={cl.handoff.credentials_doc} label="Credentials document shared"
                  detail="Gmail login, dashboard URL, booking link, SMS number, all passwords"
                  onClick={() => toggleCheck('credentials_shared')} />
                <Item done={cl.handoff.invite_sent} label="Platform invite sent to owner" auto />
                <Item done={cl.handoff.invite_accepted} label="Owner accepted invite & signed up" auto />
                <Item done={cl.handoff.owner_logged_in} label="Owner logged into dashboard"
                  detail={biz.last_active_at ? new Date(biz.last_active_at).toLocaleString() : 'Never'} auto />
                <Item done={cl.handoff.walkthrough_done} label="Walkthrough call completed"
                  detail="Demo dashboard, bookings, team portal, settings"
                  onClick={() => toggleCheck('walkthrough_done')} />

                {/* Invite form */}
                {!cl.handoff.invite_accepted && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex gap-2">
                      <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder={ownerEmail || 'owner@email.com'}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-xs placeholder-gray-600" />
                      <button onClick={sendInvite} disabled={sendingInvite}
                        className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded text-xs font-cta font-semibold disabled:opacity-50 whitespace-nowrap transition-colors">
                        {sendingInvite ? 'Sending...' : 'Send Invite'}
                      </button>
                    </div>
                    {inviteResult?.ok && <p className="text-xs text-green-400 mt-1.5">Invite sent!</p>}
                    {inviteResult?.error && <p className="text-xs text-red-400 mt-1.5">{inviteResult.error}</p>}
                    {invites.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {invites.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>{inv.email}</span>
                            <span className={inv.accepted ? 'text-green-400' : new Date(inv.expires_at) < new Date() ? 'text-red-400' : 'text-yellow-400'}>
                              {inv.accepted ? 'Accepted' : new Date(inv.expires_at) < new Date() ? 'Expired' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-3">
          {/* Business Contact */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-3">Business Contact</h3>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Name</label>
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Owner name" className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Email</label>
                <input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@email.com" className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Phone</label>
                <input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="(555) 123-4567" className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm mt-0.5" />
              </div>
            </div>
          </div>

          {/* Billing */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-3">Billing</h3>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Account Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm mt-0.5">
                  <option value="setup">Setup</option><option value="active">Active</option>
                  <option value="suspended">Suspended</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Billing Status</label>
                <select value={billingStatus} onChange={(e) => setBillingStatus(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm mt-0.5">
                  <option value="setup">Setup</option><option value="active">Active</option>
                  <option value="past_due">Past Due</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Monthly ($)</label>
                  <input type="number" value={monthlyRate} onChange={(e) => setMonthlyRate(Number(e.target.value))}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Setup ($)</label>
                  <input type="number" value={setupFee} onChange={(e) => setSetupFee(Number(e.target.value))}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm mt-0.5" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm mt-0.5">
                  <option value="">Not set</option><option value="zelle">Zelle</option>
                  <option value="apple_cash">Apple Cash</option><option value="stripe">Stripe</option>
                  <option value="check">Check</option><option value="cash">Cash</option>
                </select>
              </div>
              <button
                onClick={() => save({ setup_fee_paid_at: biz?.setup_fee_paid_at ? null : new Date().toISOString() })}
                className={`w-full text-xs py-1.5 rounded font-medium ${
                  biz?.setup_fee_paid_at ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}>
                {biz?.setup_fee_paid_at ? `Setup fee paid ${new Date(biz.setup_fee_paid_at).toLocaleDateString()}` : 'Mark setup fee as paid'}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-3">Notes</h3>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Private notes..." rows={5}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-2 text-sm resize-none placeholder-gray-600" />
          </div>

          {/* Save */}
          <button onClick={() => save()} disabled={saving}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Changes'}
          </button>
          <button onClick={() => { if (confirm(`Delete "${biz.name}"?`)) { fetch(`/api/admin/businesses/${id}`, { method: 'DELETE' }).then(() => router.push('/admin/businesses')) } }}
            className="w-full bg-slate-700 hover:bg-red-900/50 text-slate-400 hover:text-red-400 py-1.5 rounded-lg text-xs">
            Delete Business
          </button>
        </div>
      </div>
    </div>
  )
}
