// @ts-nocheck
'use client'

/**
 * Wash & Fold pickup-request form → POSTs to the global /api/contact endpoint,
 * which resolves the tenant from the host (washandfoldnyc.com) and creates a
 * client + portal_lead + a Sales pipeline deal, then alerts the owner. Replaces
 * the old mailto-only lead path so web leads actually land in the backend.
 */
import { useState } from 'react'

export default function PickupRequestForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    const form = e.currentTarget
    const data = {
      subject: 'Wash & Fold pickup request',
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      address: (form.elements.namedItem('address') as HTMLInputElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
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
      <div className="rounded-2xl border border-[#4BA3D4]/30 bg-[#F0F8FF] p-10 text-center">
        <div className="text-4xl text-[#4BA3D4]">&#10003;</div>
        <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mt-3">Pickup Request Received</h3>
        <p className="text-gray-500 text-sm mt-2">Thanks! We&apos;ll text you at the number you gave to confirm a pickup window — usually within minutes.</p>
        <button onClick={() => setStatus('idle')} className="mt-4 text-sm font-medium text-[#4BA3D4] underline underline-offset-2 hover:text-[#1a3a5c]">Request another pickup</button>
      </div>
    )
  }

  const inputClass = 'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#1a3a5c] shadow-sm placeholder:text-gray-400 focus:border-[#4BA3D4] focus:ring-1 focus:ring-[#4BA3D4]'
  const labelClass = 'block text-sm font-medium text-[#1a3a5c]'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>Name *</label>
          <input type="text" id="name" name="name" required className={inputClass} placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>Phone *</label>
          <input type="tel" id="phone" name="phone" required className={inputClass} placeholder="(917) 555-1234" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input type="email" id="email" name="email" className={inputClass} placeholder="you@email.com" />
        </div>
        <div>
          <label htmlFor="address" className={labelClass}>Pickup address *</label>
          <input type="text" id="address" name="address" required className={inputClass} placeholder="Street, unit, borough" />
        </div>
      </div>
      <div>
        <label htmlFor="message" className={labelClass}>Anything we should know?</label>
        <textarea id="message" name="message" rows={3} className={inputClass} placeholder="Approx. bags/loads, preferred pickup time, detergent preferences, etc." />
      </div>
      <button type="submit" disabled={status === 'sending'} className="w-full rounded-lg bg-[#4BA3D4] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#3a8fbf] disabled:opacity-50 transition-colors">
        {status === 'sending' ? 'Sending…' : 'Request a Pickup'}
      </button>
      <p className="text-center text-xs text-gray-500">Prefer to text? (917) 970-6002 — same real person, same fast response.</p>
      {status === 'error' && (
        <p className="text-center text-sm text-red-600">Something went wrong. Please text (917) 970-6002 and we&apos;ll take care of it.</p>
      )}
    </form>
  )
}
