'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const links = [
    { href: '/', label: 'Home' },
    { href: '/full-loop-crm-pricing', label: 'Pricing' },
    { href: '/full-loop-crm-service-features', label: 'Features' },
    { href: '/businesses', label: 'Businesses' },
    { href: '/locations', label: 'Locations' },
    { href: '/about-full-loop-crm', label: 'About' },
    { href: '/full-loop-crm-frequently-asked-questions', label: 'FAQ' },
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

export default function FeedbackPage() {
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), category: category || 'general' }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong.')
        setSubmitting(false)
        return
      }
      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Thank You!</h1>
          <p className="text-gray-400 mb-8">
            Your feedback has been submitted anonymously. We read every submission and use it to improve the platform.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/" className="inline-block bg-white text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors">
              Back to Home
            </Link>
            <button
              onClick={() => { setSubmitted(false); setMessage(''); setCategory('') }}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <SiteNav />
      <div className="pt-[72px]">
      <div className="max-w-xl mx-auto px-4 pt-12 pb-20">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Anonymous Feedback
          </h1>
          <p className="text-gray-400">
            Share your thoughts, suggestions, or concerns. No account or identity required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors cursor-pointer"
            >
              <option value="">General</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="pricing">Pricing</option>
              <option value="partnership">Partnership Process</option>
              <option value="complaint">Complaint</option>
              <option value="praise">Praise</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">
              Your Feedback <span className="text-red-400/70">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              placeholder="Tell us what's on your mind..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="text-center">
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <p className="text-xs text-gray-600 mt-4">
              100% anonymous. No tracking, no cookies, no identity collected.
            </p>
          </div>
        </form>
      </div>
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
              <Link href="/full-loop-crm-service-features" className="block text-sm py-1 hover:text-white transition-colors">Features</Link>
              <Link href="/full-loop-crm-pricing" className="block text-sm py-1 hover:text-white transition-colors">Pricing</Link>
              <Link href="/full-loop-crm-service-business-industries" className="block text-sm py-1 hover:text-white transition-colors">Industries</Link>
              <Link href="/locations" className="block text-sm py-1 hover:text-white transition-colors">Locations</Link>
              <Link href="/full-loop-crm-frequently-asked-questions" className="block text-sm py-1 hover:text-white transition-colors">FAQ</Link>
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Company</h4>
              <Link href="/about-full-loop-crm" className="block text-sm py-1 hover:text-white transition-colors">About</Link>
              <Link href="/crm-partnership-request-form" className="block text-sm py-1 hover:text-white transition-colors">Apply for Partnership</Link>
              <Link href="/contact" className="block text-sm py-1 hover:text-white transition-colors">Contact</Link>
              <Link href="/feedback" className="block text-sm py-1 hover:text-white transition-colors">Feedback</Link>
              <a href="https://consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="block text-sm py-1 hover:text-white transition-colors">Built by Consortium NYC</a>
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Contact</h4>
              <a href="sms:+12122029220" className="block text-sm py-1 hover:text-white transition-colors">Text Us: (212) 202-9220</a>
              <a href="tel:+12122029220" className="block text-sm py-1 hover:text-white transition-colors">Call Us: (212) 202-9220</a>
              <a href="mailto:hello@homeservicesbusinesscrm.com" className="block text-sm py-1 hover:text-white transition-colors">hello@homeservicesbusinesscrm.com</a>
              <a href="https://maps.google.com/?q=150+W+47th+St+New+York+NY+10036" target="_blank" rel="noopener noreferrer" className="block text-sm py-1 mt-2 leading-relaxed hover:text-white transition-colors">150 W 47th St<br />New York, NY 10036</a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-sm gap-2">
            <span>&copy; 2026 Full Loop CRM. All rights reserved.</span>
            <span>Built by <a href="https://consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 transition-colors">Consortium NYC</a></span>
          </div>
        </div>
      </footer>
    </div>
  )
}
