'use client'
import { useState } from 'react'
import type { SiteConfig } from '@/app/site/template/_config/types'

/**
 * VA lead-capture form. Posts to the tenant-aware /api/contact endpoint (tenant
 * resolved server-side from the host), creating a real lead — so the VA CTA
 * finally lands somewhere that works instead of the cleaning booking funnel.
 * Client component; drop it into the server landing at an #get-started anchor.
 */

const HOURS_OPTIONS = [
  'Not sure yet',
  'Around 10 hrs/week (Starter)',
  'Around 20 hrs/week (Part-Time)',
  'Full-time — 40 hrs/week',
]

export default function VaLeadForm({ config }: { config: SiteConfig }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'sending') return
    const form = e.currentTarget
    const data = new FormData(form)
    // Honeypot — bots fill this; humans never see it.
    if ((data.get('company_website') as string)?.trim()) return

    const name = (data.get('name') as string)?.trim()
    const email = (data.get('email') as string)?.trim()
    const phone = (data.get('phone') as string)?.trim()
    if (!name || (!email && !phone)) {
      setError('Please add your name and a phone or email.')
      setStatus('error')
      return
    }

    const business = (data.get('business') as string)?.trim()
    const hours = (data.get('hours') as string) || ''
    const needs = (data.get('needs') as string)?.trim()
    const message = [
      business ? `Business: ${business}` : '',
      hours ? `Hours needed: ${hours}` : '',
      needs ? `Needs: ${needs}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'general-inquiry',
          subject: 'Virtual Assistant Inquiry',
          name,
          email,
          phone,
          message,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Something went wrong. Please text us instead.')
        setStatus('error')
        return
      }
      setStatus('ok')
      form.reset()
    } catch {
      setError('Network error. Please text us instead.')
      setStatus('error')
    }
  }

  if (status === 'ok') {
    return (
      <div className="max-w-xl mx-auto text-center bg-white rounded-2xl border border-gray-200 p-10">
        <p className="text-[var(--accent)] font-semibold tracking-[0.2em] uppercase text-sm mb-3">Got it</p>
        <h3 className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide mb-3">
          Thanks — we’ll be in touch shortly.
        </h3>
        <p className="text-gray-500">
          A real person will reach out to match you with your assistant. Need us faster?{' '}
          <a href={`sms:${config.contact.phoneDigits}`} className="text-[var(--brand)] font-semibold underline underline-offset-2">
            Text {config.contact.phone}
          </a>.
        </p>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--brand-rgb)/0.15)]'

  return (
    <form onSubmit={onSubmit} className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
      {/* Honeypot */}
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input name="name" required placeholder="Your name" className={inputCls} />
        <input name="business" placeholder="Business name (optional)" className={inputCls} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input name="email" type="email" placeholder="Email" className={inputCls} />
        <input name="phone" type="tel" placeholder="Phone" className={inputCls} />
      </div>
      <select name="hours" defaultValue="" className={inputCls} aria-label="Hours needed">
        <option value="" disabled>How many hours do you need?</option>
        {HOURS_OPTIONS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <textarea name="needs" rows={4} placeholder="What do you need help with? (calls, admin, CRM, support…)" className={inputCls} />

      {status === 'error' && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full inline-flex items-center justify-center bg-[var(--accent)] text-[var(--accent-fg)] px-8 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Get an Assistant'}
      </button>
      <p className="text-center text-gray-400 text-xs">
        Prefer to text? <a href={`sms:${config.contact.phoneDigits}`} className="text-[var(--brand)] underline underline-offset-2">Text {config.contact.phone}</a>.
        Starting at $8/hour, $50/week minimum.
      </p>
    </form>
  )
}
