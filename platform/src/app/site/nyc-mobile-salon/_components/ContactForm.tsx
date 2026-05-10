// @ts-nocheck
'use client'
import { useState } from 'react'

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3)
  return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10)
}

export default function ContactForm({ id, variant = "light" }: { id?: string; variant?: "light" | "dark" }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  const isDark = variant === "dark"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setServerError('')

    const clientErrors: Record<string, string> = {}
    if (!form.name.trim()) clientErrors.name = 'Name is required'
    if (!form.email.trim()) clientErrors.email = 'Email is required'
    if (!form.message.trim()) clientErrors.message = 'Message is required'
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (res.ok) {
        setDone(true)
      } else if (json.errors) {
        setErrors(json.errors)
      } else {
        setServerError(json.error || 'Something went wrong')
      }
    } catch {
      setServerError('Network error. Please try again.')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div id={id} className={`rounded-2xl p-8 text-center ${isDark ? "border border-white/10" : "border border-gray-100"}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-light">
          <svg className="h-8 w-8 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className={`mb-2 text-2xl font-semibold font-display ${isDark ? "text-white" : "text-charcoal"}`}>Message Sent</h3>
        <p className={isDark ? "text-gray-400" : "text-gray-500"}>
          Thanks, {form.name.split(' ')[0]}. We&apos;ll get back to you within 24 hours.
        </p>
      </div>
    )
  }

  const inputClass = isDark
    ? "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-500 transition-all focus:border-sage focus:ring-1 focus:ring-sage focus:outline-none"
    : "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-charcoal placeholder-gray-400 transition-all focus:border-sage focus:ring-1 focus:ring-sage focus:outline-none"

  const labelClass = isDark
    ? "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400"
    : "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"

  return (
    <form id={id} onSubmit={handleSubmit} className={`rounded-2xl p-6 sm:p-8 ${isDark ? "border border-white/10" : "border border-gray-100"}`}>
      <h3 className={`mb-1 text-center text-xl font-semibold font-display ${isDark ? "text-white" : "text-charcoal"}`}>
        Send Us a Message
      </h3>
      <p className={`mb-6 text-center text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Questions, custom requests, events, or partnerships — we&apos;ll reply within 24 hours.
      </p>

      {serverError && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor={`${id}-name`} className={labelClass}>Name</label>
          <input
            id={`${id}-name`}
            name="name"
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-email`} className={labelClass}>Email</label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-phone`} className={labelClass}>Phone <span className={isDark ? "text-gray-600" : "text-gray-300"}>(optional)</span></label>
            <input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-message`} className={labelClass}>Message</label>
          <textarea
            id={`${id}-message`}
            name="message"
            rows={4}
            placeholder="How can we help?"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={inputClass}
          />
          {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`mt-5 w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-wide disabled:opacity-60 ${isDark ? "btn-sage" : "btn-primary text-white"}`}
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
