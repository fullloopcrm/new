'use client'

import { useState, FormEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { formatPhone } from '@/lib/phone'

function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const links = [
    { href: '/', label: 'Home' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/features', label: 'Features' },
    { href: '/businesses', label: 'Businesses' },
    { href: '/locations', label: 'Locations' },
    { href: '/about', label: 'About' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
  ]
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 h-[72px] flex items-center justify-between px-6">
        <Link href="/" className="text-xl font-extrabold text-gray-900 tracking-tight">Full<span className="text-blue-600">Loop</span> CRM</Link>
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`text-sm font-medium transition-colors ${pathname === l.href ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'}`}>{l.label}</Link>
          ))}
          <Link href="/sign-in" className="text-sm font-medium text-gray-500 hover:text-gray-900">Sign In</Link>
          <Link href="/crm-partnership-request-form" className="bg-gray-900 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors">Apply Now</Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <span className="block w-6 h-0.5 bg-gray-900 mb-1.5"></span>
          <span className="block w-6 h-0.5 bg-gray-900 mb-1.5"></span>
          <span className="block w-6 h-0.5 bg-gray-900"></span>
        </button>
      </nav>
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[150]" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 right-0 w-72 h-full bg-white z-[200] p-6 pt-16 flex flex-col gap-1 shadow-2xl">
            <button className="absolute top-4 right-4 text-2xl text-gray-500" onClick={() => setMobileOpen(false)}>&times;</button>
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block py-3 text-gray-700 font-medium border-b border-gray-100">{l.label}</Link>
            ))}
            <Link href="/crm-partnership-request-form" onClick={() => setMobileOpen(false)} className="mt-4 block text-center bg-gray-900 text-white py-3 rounded-lg font-bold">Apply Now</Link>
          </div>
        </>
      )}
    </>
  )
}
import AddressAutocomplete from '@/components/address-autocomplete'

const SERVICE_CATEGORIES = [
  'House Cleaning',
  'Carpet Cleaning',
  'Window Cleaning',
  'Pressure Washing',
  'Junk Removal',
  'Moving Services',
  'Handyman',
  'Painting',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Roofing',
  'Landscaping',
  'Lawn Care',
  'Tree Service',
  'Pool Cleaning',
  'Pest Control',
  'Home Organizing',
  'Garage Door Repair',
  'Appliance Repair',
  'Locksmith',
  'Mobile Hair/Barber',
  'Mobile Nails',
  'Mobile Massage',
  'Pet Grooming',
  'Dog Walking',
  'Pet Sitting',
  'Personal Training',
  'Tutoring',
  'Photography',
  'Videography',
  'Mobile Car Detailing',
  'Mobile Car Wash',
  'Mobile Mechanic',
  'Catering',
  'DJ Services',
  'Event Planning',
  'Florist',
  'Home Health Aide',
  'Senior Care',
  'Companion Care',
  'Nanny/Babysitting',
  'Notary',
  'Home Inspection',
  'Janitorial/Commercial Cleaning',
  'Office Cleaning',
  'Construction Cleanup',
  'Interior Design',
  'Real Estate Staging',
  'Other',
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

const YEARS_IN_BUSINESS = ['Less than 1', '1-2', '3-5', '6-10', '10+']
const TEAM_SIZES = ['Just me', '2-5', '6-15', '16-50', '50+']
const MONTHLY_REVENUE = ['Under $5K', '$5K-$15K', '$15K-$50K', '$50K-$100K', '$100K+']
const CURRENT_SYSTEMS = ['Pen & paper', 'Spreadsheets', 'Another CRM', 'Scheduling app', 'Nothing']
const REFERRAL_SOURCES = ['Google', 'Social Media', 'AI (ChatGPT, Claude, etc.)', 'Referral', 'Word of mouth', 'Other']

type FormData = {
  business_name: string
  contact_name: string
  email: string
  phone: string
  address: string
  website: string
  service_category: string
  city: string
  state: string
  years_in_business: string
  team_size: string
  monthly_revenue: string
  current_system: string
  referral_source: string
  pitch: string
}

const initialForm: FormData = {
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  service_category: '',
  city: '',
  state: '',
  years_in_business: '',
  team_size: '',
  monthly_revenue: '',
  current_system: '',
  referral_source: '',
  pitch: '',
}

export default function PartnerRequestPage() {
  const [form, setForm] = useState<FormData>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    if (name === 'phone') {
      setForm((prev) => ({ ...prev, phone: formatPhone(value) }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Input class helpers
  const inputClass =
    'w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors'
  const selectClass =
    'w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors cursor-pointer'
  const labelClass = 'text-sm text-gray-400 mb-1.5 block'

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Application Received!</h1>
          <p className="text-gray-400 mb-8">
            We&apos;ll review your application and get back to you within 48 hours. Check your email for confirmation.
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <SiteNav />
      <div className="pt-[72px]">
      {/* Hero */}
      <div className="max-w-2xl mx-auto px-4 pt-12 pb-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
          Apply for Exclusive Partnership
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          We accept one partner per service per city. Limited availability.
        </p>
      </div>

      {/* Who We Work With */}
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Who We Partner With</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Full Loop CRM is built exclusively for established home and field service businesses ready to dominate their local market. We provide a complete operating system — lead generation, AI-powered sales, automated scheduling, GPS-tracked operations, payments, review management, and client retention — all under one platform.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            To protect the value we deliver, <span className="text-white font-medium">we limit partnerships to one business per service category per city or territory</span>. This means when you partner with Full Loop, your competitors in your market can&apos;t. You get exclusive access to our lead generation network, AI sales tools, and the full platform — with zero competition from other partners in your area.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mb-5">
            We&apos;re looking for businesses that are serious about growth — operators with real teams, real clients, and real revenue who want to scale without hiring a receptionist, salesperson, and IT department. If that&apos;s you, apply below.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Established', desc: '1+ years operating' },
              { label: 'Team-based', desc: '2+ team members' },
              { label: 'Revenue', desc: '$5K+/mo minimum' },
              { label: 'Exclusive', desc: '1 per service/city' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-white text-sm font-semibold">{item.label}</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 pb-20">
        {/* Section 1 — About You */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-900 text-sm font-bold">
              1
            </span>
            <h2 className="text-lg font-semibold text-white">About You</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="business_name" className={labelClass}>
                Business Name <span className="text-red-400/70">*</span>
              </label>
              <input
                id="business_name"
                name="business_name"
                type="text"
                required
                value={form.business_name}
                onChange={handleChange}
                placeholder="Acme Cleaning Co."
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="contact_name" className={labelClass}>
                Owner / Contact Name <span className="text-red-400/70">*</span>
              </label>
              <input
                id="contact_name"
                name="contact_name"
                type="text"
                required
                value={form.contact_name}
                onChange={handleChange}
                placeholder="Jane Smith"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email <span className="text-red-400/70">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane@acmecleaning.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone <span className="text-red-400/70">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Business Address
              </label>
              <AddressAutocomplete
                value={form.address}
                onChange={(val) => setForm((prev) => ({ ...prev, address: val }))}
                placeholder="123 Main St, New York, NY"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="website" className={labelClass}>
                Website URL
              </label>
              <input
                id="website"
                name="website"
                type="text"
                value={form.website}
                onChange={handleChange}
                placeholder="https://acmecleaning.com"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 2 — Your Service */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-900 text-sm font-bold">
              2
            </span>
            <h2 className="text-lg font-semibold text-white">Your Service</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="service_category" className={labelClass}>
                Service Category <span className="text-red-400/70">*</span>
              </label>
              <div className="relative">
                <select
                  id="service_category"
                  name="service_category"
                  required
                  value={form.service_category}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">Select your service</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="city" className={labelClass}>
                  Primary City / Market <span className="text-red-400/70">*</span>
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  value={form.city}
                  onChange={handleChange}
                  placeholder="New York"
                  className={inputClass}
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label htmlFor="state" className={labelClass}>
                  State <span className="text-red-400/70">*</span>
                </label>
                <div className="relative">
                  <select
                    id="state"
                    name="state"
                    required
                    value={form.state}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select state</option>
                    {US_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="years_in_business" className={labelClass}>
                Years in Business <span className="text-red-400/70">*</span>
              </label>
              <div className="relative">
                <select
                  id="years_in_business"
                  name="years_in_business"
                  required
                  value={form.years_in_business}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">Select experience</option>
                  {YEARS_IN_BUSINESS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 — Your Business */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-900 text-sm font-bold">
              3
            </span>
            <h2 className="text-lg font-semibold text-white">Your Business</h2>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="team_size" className={labelClass}>
                  Team Size <span className="text-red-400/70">*</span>
                </label>
                <div className="relative">
                  <select
                    id="team_size"
                    name="team_size"
                    required
                    value={form.team_size}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select team size</option>
                    {TEAM_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div>
                <label htmlFor="monthly_revenue" className={labelClass}>
                  Monthly Revenue <span className="text-red-400/70">*</span>
                </label>
                <div className="relative">
                  <select
                    id="monthly_revenue"
                    name="monthly_revenue"
                    required
                    value={form.monthly_revenue}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select range</option>
                    {MONTHLY_REVENUE.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="current_system" className={labelClass}>
                  Current System
                </label>
                <div className="relative">
                  <select
                    id="current_system"
                    name="current_system"
                    value={form.current_system}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select current system</option>
                    {CURRENT_SYSTEMS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div>
                <label htmlFor="referral_source" className={labelClass}>
                  How did you hear about us?
                </label>
                <div className="relative">
                  <select
                    id="referral_source"
                    name="referral_source"
                    value={form.referral_source}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select source</option>
                    {REFERRAL_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4 — Why You */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-900 text-sm font-bold">
              4
            </span>
            <h2 className="text-lg font-semibold text-white">Why You</h2>
          </div>

          <div>
            <label htmlFor="pitch" className={labelClass}>
              Tell us about your business and why you&apos;d be the right partner for your city{' '}
              <span className="text-red-400/70">*</span>
            </label>
            <textarea
              id="pitch"
              name="pitch"
              required
              rows={4}
              value={form.pitch}
              onChange={handleChange}
              placeholder="We've been serving the NYC area for 8 years with a team of 12..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="text-center">
          <button
            type="submit"
            disabled={submitting}
            className="bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Partnership Request'}
          </button>
          <p className="text-xs text-gray-600 mt-4">
            We review partnership applications daily.
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <span className="text-gray-600">Need help?</span>
            <a href="tel:+12122029220" className="text-gray-400 hover:text-white transition-colors">Call (212) 202-9220</a>
            <span className="text-gray-700">|</span>
            <a href="sms:+12122029220" className="text-gray-400 hover:text-white transition-colors">Text (212) 202-9220</a>
          </div>

          <div className="mt-4">
            <Link href="/feedback" className="text-xs text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-2">
              Anonymous Feedback
            </Link>
          </div>
        </div>
      </form>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 pt-16 pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <h3 className="text-white text-lg font-extrabold mb-3">Full<span className="text-blue-600">Loop</span> CRM</h3>
              <p className="text-sm leading-relaxed">The first full-cycle CRM for home service businesses. From lead generation to five-star reviews — one platform, zero gaps.</p>
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Platform</h4>
              <Link href="/features" className="block text-sm py-1 hover:text-white transition-colors">Features</Link>
              <Link href="/pricing" className="block text-sm py-1 hover:text-white transition-colors">Pricing</Link>
              <Link href="/businesses" className="block text-sm py-1 hover:text-white transition-colors">Businesses</Link>
              <Link href="/locations" className="block text-sm py-1 hover:text-white transition-colors">Locations</Link>
              <Link href="/faq" className="block text-sm py-1 hover:text-white transition-colors">FAQ</Link>
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Company</h4>
              <Link href="/about" className="block text-sm py-1 hover:text-white transition-colors">About</Link>
              <Link href="/crm-partnership-request-form" className="block text-sm py-1 hover:text-white transition-colors">Apply for Partnership</Link>
              <Link href="/contact" className="block text-sm py-1 hover:text-white transition-colors">Contact</Link>
              <Link href="/feedback" className="block text-sm py-1 hover:text-white transition-colors">Feedback</Link>
              <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="block text-sm py-1 hover:text-white transition-colors">Built by Consortium NYC</a>
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Contact</h4>
              <a href="sms:+12122029220" className="block text-sm py-1 hover:text-white transition-colors">Text Us: (212) 202-9220</a>
              <a href="tel:+12122029220" className="block text-sm py-1 hover:text-white transition-colors">Call Us: (212) 202-9220</a>
              <a href="mailto:hello@fullloopcrm.com" className="block text-sm py-1 hover:text-white transition-colors">hello@fullloopcrm.com</a>
              <a href="https://maps.google.com/?q=150+W+47th+St+New+York+NY+10036" target="_blank" rel="noopener noreferrer" className="block text-sm py-1 mt-2 leading-relaxed hover:text-white transition-colors">150 W 47th St<br />New York, NY 10036</a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-sm gap-2">
            <span>&copy; 2026 Full Loop CRM. All rights reserved.</span>
            <span>Built by <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 transition-colors">Consortium NYC</a></span>
          </div>
        </div>
      </footer>
    </div>
  )
}
