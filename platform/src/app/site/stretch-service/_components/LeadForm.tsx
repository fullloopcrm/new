'use client'

import { useState } from 'react'

const inputCls =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'

/**
 * Contact/lead form that posts to the shared /api/lead endpoint so submissions
 * land in the CRM (tenant resolved server-side from the request host). Replaces
 * the original `action="mailto:"` form, which only opened the visitor's email
 * client and never reached the backend.
 */
export default function LeadForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    const fd = new FormData(e.currentTarget)
    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      message: String(fd.get('message') || '').trim(),
      visitAt: fd.get('visitAt') ? new Date(String(fd.get('visitAt'))).toISOString() : undefined,
    }
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Something went wrong. Please try again.')
      }
      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'ok') {
    return (
      <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 px-6 py-8 text-center">
        <p className="text-lg font-bold text-teal-800 font-heading">Thanks — we got your message.</p>
        <p className="mt-2 text-sm text-teal-700">We&apos;ll get back to you shortly.</p>
      </div>
    )
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-slate-700">Name</label>
        <input type="text" id="name" name="name" required className={inputCls} placeholder="Your name" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email</label>
        <input type="email" id="email" name="email" required className={inputCls} placeholder="your@email.com" />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">Phone (optional)</label>
        <input type="tel" id="phone" name="phone" className={inputCls} placeholder="Your phone number" />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-slate-700">Message</label>
        <textarea id="message" name="message" rows={4} required className={inputCls} placeholder="Tell us about your needs — location, any specific concerns..." />
      </div>
      <div>
        <label htmlFor="visitAt" className="block text-sm font-semibold text-slate-700">Preferred session (date &amp; time)</label>
        <input type="datetime-local" id="visitAt" name="visitAt" min={new Date().toISOString().slice(0, 16)} className={inputCls} />
      </div>
      {status === 'error' && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-lg bg-teal-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-700 font-cta disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
