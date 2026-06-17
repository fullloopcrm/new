'use client'

import { useState } from 'react'

const ROLES = ['Operator', 'Investor', 'Acquirer', 'Press', 'Other'] as const
const BUDGETS = ['<$100K', '$100K–$1M', '$1M–$10M', '$10M+', 'N/A'] as const

export function InquiryForm() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    const payload = {
      name: String(fd.get('name') || ''),
      company: String(fd.get('company') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
      role: String(fd.get('role') || ''),
      budget: String(fd.get('budget') || ''),
      message: String(fd.get('message') || ''),
    }
    try {
      const r = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'submit_failed')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-8 text-center">
        <div className="text-teal-300 font-mono text-xs uppercase tracking-widest mb-3">Received</div>
        <h2 className="text-2xl font-heading font-bold text-white mb-3">We&apos;ll be in touch.</h2>
        <p className="text-slate-400 text-sm">
          Serious inquiries get a reply within a few business days. Thanks for reaching out.
        </p>
      </div>
    )
  }

  const inputClass =
    'w-full rounded-md border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'
  const labelClass = 'block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2'

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className={labelClass}>Name</label>
        <input id="name" name="name" type="text" required maxLength={120} className={inputClass} />
      </div>
      <div>
        <label htmlFor="company" className={labelClass}>Company</label>
        <input id="company" name="company" type="text" required maxLength={160} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input id="email" name="email" type="email" required maxLength={200} className={inputClass} />
      </div>
      <div>
        <label htmlFor="phone" className={labelClass}>Phone</label>
        <input id="phone" name="phone" type="tel" required maxLength={40} autoComplete="tel" className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="role" className={labelClass}>Role</label>
          <select id="role" name="role" required className={inputClass} defaultValue="">
            <option value="" disabled>Select…</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="budget" className={labelClass}>Budget / deal size</label>
          <select id="budget" name="budget" required className={inputClass} defaultValue="">
            <option value="" disabled>Select…</option>
            {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="message" className={labelClass}>Message</label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={2000}
          rows={5}
          className={inputClass + ' resize-y'}
          placeholder="What are you reaching out about?"
        />
      </div>
      {error && (
        <p className="text-sm text-red-400 font-mono">{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-white px-6 py-3 text-sm font-mono uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending…' : 'Send Inquiry'}
      </button>
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 text-center">
        We don&apos;t publish a phone or chat. The form is the channel.
      </p>
    </form>
  )
}
