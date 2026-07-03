'use client'

import { useState } from 'react'
import Link from 'next/link'
import { validateEmail } from '@/lib/validate-email'
import { formatPhone } from '@/lib/format'
import type { SiteConfig } from '../_config/types'

/**
 * Basic trade-agnostic collect / contact form. Config-driven (services, theme,
 * contact from the tenant's SiteConfig). Captures a lead and posts it to
 * /api/contact (host-resolved → the tenant's own clients + portal_leads), which
 * is where tenant-customer leads belong — NOT /api/inquiry (FullLoop's own
 * leads). /api/contact is public in middleware and requires name + phone;
 * /api/lead is NOT public, so a form pointed at it would be auth-redirected.
 *
 * Foundation form for the sales-mode "collect/qualify" path. Kept intentionally
 * minimal to start; qualification fields (budget, timeframe, project scope) get
 * layered on later.
 */

export default function CollectForm({ config }: { config: SiteConfig }) {
  const { services, theme, contact, identity } = config
  const primary = theme.primary
  const accent = theme.accent

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    service: '',
    message: '',
  })
  const [emailErr, setEmailErr] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Please enter your name.'); return }
    if (form.phone.replace(/\D/g, '').length < 10) { setError('Please enter a valid phone number.'); return }
    if (form.email.trim()) {
      const emailCheck = validateEmail(form.email)
      if (!emailCheck.valid) { setEmailErr(emailCheck.error || 'Invalid email'); setError('Please enter a valid email.'); return }
    }
    setEmailErr('')

    // /api/contact reads name/email/phone/message + a few known keys; it has no
    // generic field fold, so the chosen service is composed into the message.
    const composedMessage = [
      form.service ? `Service of interest: ${form.service}` : '',
      form.message.trim(),
    ].filter(Boolean).join('\n\n') || undefined

    setSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim(),
          message: composedMessage,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError((data && data.error) || 'Something went wrong. Please try again or text us.')
        setSubmitting(false)
        return
      }
      setDone(true)
    } catch {
      setError(`Network error. Please try again or text ${contact.phone}.`)
      setSubmitting(false)
    }
  }

  const labelCls = 'block text-xs font-semibold text-slate-500 tracking-widest uppercase mb-2'
  const inputCls =
    'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent transition'
  const inputStyle = { ['--tw-ring-color' as string]: accent } as React.CSSProperties

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-100">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ backgroundColor: `${accent}33` }}>✓</div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: primary }}>Thanks — we got it.</h1>
          <p className="text-slate-600 text-sm mb-6">{identity.name} will reach out shortly. For anything urgent, text us at{' '}
            <a href={`sms:${contact.phoneDigits}`} className="underline" style={{ color: primary }}>{contact.phone}</a>.
          </p>
          <Link href="/" className="inline-block text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase transition hover:opacity-90" style={{ backgroundColor: primary }}>Back home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 md:py-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: primary }}>Get in touch.</h1>
          <p className="text-slate-500 text-sm">Tell us what you need and {identity.name} will follow up. No obligation.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-5 border border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <input type="text" required placeholder="First and last" value={form.name} onChange={(e) => update('name', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" required placeholder="(212) 555-1234" value={form.phone} onChange={(e) => update('phone', formatPhone(e.target.value))} className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => { update('email', e.target.value); setEmailErr('') }} className={inputCls} style={inputStyle} />
            {emailErr && <p className="text-red-600 text-xs mt-1">{emailErr}</p>}
          </div>

          {services.filter((s) => !s.emergency).length > 0 && (
            <div>
              <label className={labelCls}>What do you need? <span className="normal-case font-normal text-slate-400">(optional)</span></label>
              <select value={form.service} onChange={(e) => update('service', e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">General inquiry</option>
                {services.filter((s) => !s.emergency).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Message</label>
            <textarea rows={3} placeholder="A few details about what you're looking for..." value={form.message} onChange={(e) => update('message', e.target.value)} className={`${inputCls} resize-none`} style={inputStyle} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <button type="submit" disabled={submitting} className="w-full py-4 rounded-lg font-bold text-sm tracking-widest uppercase transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: accent, color: primary }}>
            {submitting ? 'Sending…' : 'Send message'}
          </button>

          <p className="text-center text-xs text-slate-400">
            Prefer to text? Reach us at{' '}
            <a href={`sms:${contact.phoneDigits}`} className="underline" style={{ color: primary }}>{contact.phone}</a>
          </p>
        </form>
      </div>
    </div>
  )
}
