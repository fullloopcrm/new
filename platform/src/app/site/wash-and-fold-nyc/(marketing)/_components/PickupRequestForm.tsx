// @ts-nocheck
'use client'

/**
 * Wash & Fold lead form → POSTs to the global /api/contact endpoint, which
 * resolves the tenant from the host (washandfoldnyc.com) and creates a client +
 * portal_lead + a Sales pipeline deal, then emails the owner.
 *
 * Props:
 *  - selfBook: tag the lead with selfBook:true so /api/contact records the
 *    $10 self-book discount (shown on the admin lead email, honored manually).
 *  - compact: tight single-column layout for the sitewide CTA band.
 */
import { useState } from 'react'

export default function PickupRequestForm({ compact = false, selfBook = false }: { compact?: boolean; selfBook?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    const form = e.currentTarget
    const el = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | null)?.value || ''
    const data = {
      subject: selfBook ? 'Quick-Book pickup — self-book $10' : 'Wash & Fold pickup request',
      selfBook: selfBook || undefined,
      name: el('name'),
      phone: el('phone'),
      email: el('email'),
      address: el('address'),
      message: el('message'),
    }
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) { setStatus('sent'); form.reset() } else { setStatus('error') }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className={`rounded-2xl border border-[#4BA3D4]/30 bg-[#F0F8FF] text-center ${compact ? 'p-6' : 'p-10'}`}>
        <div className="text-3xl text-[#4BA3D4]">&#10003;</div>
        <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mt-2">Pickup Request Received</h3>
        <p className="text-gray-500 text-sm mt-2">
          Thanks! We&apos;ll text you to confirm a pickup window — usually within minutes.{selfBook ? ' Your $10 self-book discount is applied.' : ''}
        </p>
        <button onClick={() => setStatus('idle')} className="mt-4 text-sm font-medium text-[#4BA3D4] underline underline-offset-2 hover:text-[#1a3a5c]">Request another pickup</button>
      </div>
    )
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#1a3a5c] shadow-sm placeholder:text-gray-400 focus:border-[#4BA3D4] focus:ring-1 focus:ring-[#4BA3D4]'
  const btn = 'w-full rounded-lg bg-[#4BA3D4] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#3a8fbf] disabled:opacity-50 transition-colors'

  // Compact = the sitewide CTA band form (name / phone / address + button).
  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="text" name="name" required className={inputClass} placeholder="Name" />
          <input type="tel" name="phone" required className={inputClass} placeholder="Phone" />
        </div>
        <input type="text" name="address" required className={inputClass} placeholder="Pickup address" />
        <input type="hidden" name="email" value="" />
        <input type="hidden" name="message" value="" />
        <button type="submit" disabled={status === 'sending'} className={btn}>
          {status === 'sending' ? 'Sending…' : selfBook ? 'Quick-Book — Save $10' : 'Request a Pickup'}
        </button>
        {status === 'error' && <p className="text-center text-xs text-red-600">Something went wrong — text (917) 970-6002.</p>}
      </form>
    )
  }

  const labelClass = 'block text-sm font-medium text-[#1a3a5c]'
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="name" className={labelClass}>Name *</label><input type="text" id="name" name="name" required className={`mt-1 ${inputClass}`} placeholder="Your name" /></div>
        <div><label htmlFor="phone" className={labelClass}>Phone *</label><input type="tel" id="phone" name="phone" required className={`mt-1 ${inputClass}`} placeholder="(917) 555-1234" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="email" className={labelClass}>Email</label><input type="email" id="email" name="email" className={`mt-1 ${inputClass}`} placeholder="you@email.com" /></div>
        <div><label htmlFor="address" className={labelClass}>Pickup address *</label><input type="text" id="address" name="address" required className={`mt-1 ${inputClass}`} placeholder="Street, unit, borough" /></div>
      </div>
      <div><label htmlFor="message" className={labelClass}>Anything we should know?</label><textarea id="message" name="message" rows={3} className={`mt-1 ${inputClass}`} placeholder="Approx. bags/loads, preferred pickup time, detergent preferences, etc." /></div>
      <button type="submit" disabled={status === 'sending'} className={btn}>
        {status === 'sending' ? 'Sending…' : selfBook ? 'Quick-Book — Save $10' : 'Request a Pickup'}
      </button>
      <p className="text-center text-xs text-gray-500">Prefer to text? (917) 970-6002 — same real person, same fast response.</p>
      {status === 'error' && <p className="text-center text-sm text-red-600">Something went wrong. Please text (917) 970-6002.</p>}
    </form>
  )
}
