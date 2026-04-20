'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const industries = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'painting', label: 'Painting' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'moving', label: 'Moving' },
  { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
  { value: 'window_cleaning', label: 'Window Cleaning' },
  { value: 'pressure_washing', label: 'Pressure Washing' },
  { value: 'pool_service', label: 'Pool Service' },
  { value: 'garage_door', label: 'Garage Door' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'fencing', label: 'Fencing' },
  { value: 'tree_service', label: 'Tree Service' },
  { value: 'snow_removal', label: 'Snow Removal' },
  { value: 'junk_removal', label: 'Junk Removal' },
  { value: 'auto_detailing', label: 'Auto Detailing' },
  { value: 'dog_walking', label: 'Dog Walking / Pet Care' },
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'photography', label: 'Photography' },
  { value: 'catering', label: 'Catering' },
  { value: 'personal_training', label: 'Personal Training' },
  { value: 'massage', label: 'Massage Therapy' },
  { value: 'salon', label: 'Salon / Barbershop' },
  { value: 'daycare', label: 'Daycare / Childcare' },
  { value: 'home_inspection', label: 'Home Inspection' },
  { value: 'solar', label: 'Solar Installation' },
  { value: 'security', label: 'Security Systems' },
  { value: 'general_contractor', label: 'General Contractor' },
  { value: 'other', label: 'Other' },
]

export default function NewBusinessPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Business info
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('cleaning')
  const [zipCode, setZipCode] = useState('')
  const [teamSize, setTeamSize] = useState('solo')

  // Owner info
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')

  // Website & domain
  const [domainName, setDomainName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [tagline, setTagline] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#0d9488')

  // Billing
  const [paymentMethod, setPaymentMethod] = useState('')
  const [monthlyRate, setMonthlyRate] = useState(299)
  const [setupFee, setSetupFee] = useState(499)

  // Provision
  const [autoProvision, setAutoProvision] = useState(true)
  const [provisionStatus, setProvisionStatus] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Business name is required')
      return
    }

    setSaving(true)
    setError('')
    setProvisionStatus('Creating tenant...')

    const res = await fetch('/api/admin/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        industry,
        zip_code: zipCode || null,
        team_size: teamSize,
        owner_name: ownerName || null,
        owner_email: ownerEmail || null,
        owner_phone: ownerPhone || null,
        payment_method: paymentMethod || null,
        monthly_rate: monthlyRate,
        setup_fee: setupFee,
        domain_name: domainName || null,
        website_url: websiteUrl || null,
        phone: businessPhone || null,
        email: businessEmail || null,
        tagline: tagline || null,
        primary_color: primaryColor,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to create business')
      setSaving(false)
      setProvisionStatus('')
      return
    }

    const tenantId = data.business.id

    if (autoProvision) {
      setProvisionStatus('Seeding services, Selena config, guidelines...')
      try {
        const provRes = await fetch(`/api/admin/businesses/${tenantId}/provision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ industry }),
        })
        const provData = await provRes.json()
        if (provRes.ok) {
          setProvisionStatus(`Seeded ${provData.seeded?.services ?? 0} services + defaults`)
        } else {
          setProvisionStatus(`Provisioning warning: ${provData.error || 'partial failure'}`)
        }
      } catch (err) {
        setProvisionStatus(`Provisioning failed: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }

    router.push(`/admin/businesses/${tenantId}`)
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/businesses" className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block">
        &larr; All Businesses
      </Link>
      <h1 className="text-slate-900 font-heading text-2xl font-bold mb-6">Add New Business</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Info */}
        <div className="border-b border-slate-200 pb-6">
          <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-4">Business Info</h2>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Business Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Sparkle Clean NYC"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Industry *</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {industries.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Zip Code</label>
                <input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="10001"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Team Size</label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="solo">Just Me (Solo)</option>
                  <option value="small">2-5 People</option>
                  <option value="medium">6+ People</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Website & Contact */}
        <div className="border-b border-slate-200 pb-6">
          <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-4">Website & Contact</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Domain</label>
                <input
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value.toLowerCase().trim())}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="sparkleclean.com"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Existing Website (optional)</label>
                <input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Business Phone</label>
                <input
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="(212) 555-1212"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Business Email</label>
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="hi@sparkleclean.com"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Tagline</label>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="New York City's Most Trusted Cleaning Service"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Primary Brand Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded border border-slate-200 cursor-pointer"
                />
                <input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="border-b border-slate-200 pb-6">
          <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-4">Owner Info</h2>
          <p className="text-xs text-slate-500 mb-4">Contact info for the business owner. Used for invite emails and communication.</p>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Owner Name</label>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Owner Email</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="john@sparkleclean.com"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Owner Phone</label>
              <input
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="border-b border-slate-200 pb-6">
          <h2 className="text-slate-700 font-heading font-semibold text-sm uppercase tracking-wider mb-4">Billing</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Monthly Rate ($)</label>
                <input
                  type="number"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Setup Fee ($)</label>
                <input
                  type="number"
                  value={setupFee}
                  onChange={(e) => setSetupFee(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 block">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Not set yet</option>
                <option value="zelle">Zelle</option>
                <option value="apple_cash">Apple Cash</option>
                <option value="stripe">Stripe</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>
        </div>

        {/* Auto-provision toggle */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoProvision}
              onChange={(e) => setAutoProvision(e.target.checked)}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">Auto-seed defaults</p>
              <p className="text-xs text-slate-500 mt-1">
                Seed {industry} service types, Selena config (AI name, pricing, tone), business hours,
                payment methods, and default team guidelines. Idempotent — can be re-run anytime from the detail page.
              </p>
            </div>
          </label>
        </div>

        {provisionStatus && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-700">
            {provisionStatus}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors"
        >
          {saving ? (provisionStatus || 'Creating...') : 'Create Business + Provision'}
        </button>
      </form>
    </div>
  )
}
