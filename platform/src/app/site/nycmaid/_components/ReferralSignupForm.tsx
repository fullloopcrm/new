'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ReferralSignupForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [refCode, setRefCode] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    zelle_email: '',
    preferred_payout: 'zelle'
  })
  const [honeypot, setHoneypot] = useState('')
  const [loadedAt] = useState(Date.now())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/referrers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          zelle_email: form.zelle_email || form.email,
          website: honeypot,
          _t: loadedAt
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setRefCode(data.ref_code)
      } else {
        setError(data.error || 'Failed to sign up / No se pudo registrar')
      }
    } catch {
      setError('Something went wrong. Please try again. / Algo salió mal. Inténtalo de nuevo.')
    }

    setLoading(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`https://www.thenycmaid.com/book?ref=${refCode}`)
    alert('Link copied!')
  }

  if (success) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-[#A8F0DC]/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#1E2A4A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">You&apos;re In! / ¡Estás Dentro!</h3>
        <p className="text-gray-600">Welcome to The NYC Maid referral program.</p>
        <p className="text-gray-400 italic mb-6">Bienvenido al programa de referidos de The NYC Maid.</p>

        <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-6 mb-6">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Your Referral Code / Tu Código de Referido</p>
          <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">{refCode}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Your Referral Link / Tu Enlace de Referido</p>
          <p className="text-sm font-mono text-gray-700 break-all mb-3">https://www.thenycmaid.com/book?ref={refCode}</p>
          <button
            onClick={copyLink}
            className="bg-[#A8F0DC] text-[#1E2A4A] px-6 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors"
          >
            Copy Link / Copiar Enlace
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-6">Check your spam/junk folder if you don&apos;t see our welcome email. / Revisa tu carpeta de spam si no ves nuestro correo de bienvenida.</p>

        <Link
          href={`/referral?code=${refCode}`}
          className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors"
        >
          Go to My Dashboard / Ir a Mi Panel
        </Link>
        <p className="text-sm text-gray-500">
          Share your link and earn 10% of every cleaning!
        </p>
        <p className="text-sm text-gray-400 italic mt-1">
          ¡Comparte tu enlace y gana el 10% de cada limpieza!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8">
      <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-6">Sign Up to Start Earning / Regístrate para Empezar a Ganar</h3>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot - hidden from real users */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <label htmlFor="hp_website">Website</label>
          <input
            type="text"
            id="hp_website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name / Nombre Completo *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:border-[#A8F0DC] focus:ring-1 focus:ring-[#A8F0DC] outline-none"
            placeholder="John Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:border-[#A8F0DC] focus:ring-1 focus:ring-[#A8F0DC] outline-none"
            placeholder="john@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone / Teléfono</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:border-[#A8F0DC] focus:ring-1 focus:ring-[#A8F0DC] outline-none"
            placeholder="212-555-1234"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Payout Method / Método de Pago Preferido *</label>
          <select
            value={form.preferred_payout}
            onChange={(e) => setForm({ ...form, preferred_payout: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:border-[#A8F0DC] focus:ring-1 focus:ring-[#A8F0DC] outline-none"
          >
            <option value="zelle">Zelle</option>
            <option value="apple_cash">Apple Cash</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {form.preferred_payout === 'zelle' ? 'Zelle Email or Phone / Correo o Teléfono de Zelle' : 'Apple Cash Phone / Teléfono de Apple Cash'}
          </label>
          <input
            type="text"
            value={form.zelle_email}
            onChange={(e) => setForm({ ...form, zelle_email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:border-[#A8F0DC] focus:ring-1 focus:ring-[#A8F0DC] outline-none"
            placeholder={form.preferred_payout === 'zelle' ? 'Same as email if blank' : 'Your Apple Cash phone number'}
          />
          <p className="text-xs text-gray-500 mt-1">We&apos;ll send your commissions here / Aquí te enviaremos tus comisiones</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-600 leading-relaxed">
            <input type="checkbox" name="sms_consent" required className="mt-1 min-w-[18px] min-h-[18px]" />
            <span>
              <span className="block">By checking this box, I consent to receive transactional text messages from <strong>The NYC Maid</strong> for appointment confirmations, reminders, and customer support. Reply STOP to opt out. Reply HELP for help. Msg frequency may vary. Msg &amp; data rates may apply. <a href="/privacy-policy" className="text-[#1E2A4A] underline underline-offset-2">Privacy Policy</a> | <a href="/terms-conditions" className="text-[#1E2A4A] underline underline-offset-2">Terms &amp; Conditions</a></span>
              <span className="block text-gray-400 italic mt-2">Al marcar esta casilla, doy mi consentimiento para recibir mensajes de texto transaccionales de <strong>The NYC Maid</strong> sobre confirmaciones de citas, recordatorios y atención al cliente. Responde STOP para cancelar. Responde HELP para ayuda. La frecuencia de mensajes puede variar. Pueden aplicar tarifas de mensajes y datos. <a href="/privacy-policy" className="underline underline-offset-2">Política de Privacidad</a> | <a href="/terms-conditions" className="underline underline-offset-2">Términos y Condiciones</a></span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#A8F0DC] text-[#1E2A4A] py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing Up... / Registrando...' : 'Join Referral Program / Únete al Programa'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t text-center">
        <p className="text-sm text-gray-500">
          Already a referrer? / ¿Ya eres referido?{' '}
          <Link href="/referral" className="text-[#1E2A4A] font-medium underline underline-offset-2">
            Log in to your dashboard / Ingresa a tu panel
          </Link>
        </p>
      </div>
    </div>
  )
}
