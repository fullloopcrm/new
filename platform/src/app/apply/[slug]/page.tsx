'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

type TenantInfo = {
  name: string
  slug: string
  logo_url: string | null
}

type FormState = {
  name: string
  phone: string
  email: string
  address: string
  experience: string
  availability: string
  ref1_name: string
  ref1_phone: string
  ref2_name: string
  ref2_phone: string
  ref3_name: string
  ref3_phone: string
  referral_source: string
  notes: string
  sms_consent: boolean
}

const initialForm: FormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  experience: '',
  availability: '',
  ref1_name: '',
  ref1_phone: '',
  ref2_name: '',
  ref2_phone: '',
  ref3_name: '',
  ref3_phone: '',
  referral_source: '',
  notes: '',
  sms_consent: false,
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export default function ApplyPage() {
  const { slug } = useParams<{ slug: string }>()
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState<FormState>(initialForm)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/tenants/public?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error || !d.tenant) setNotFound(true)
        else setTenant(d.tenant)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  function updateField(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handlePhoneChange(field: 'phone' | 'ref1_phone' | 'ref2_phone' | 'ref3_phone', value: string) {
    updateField(field, formatPhone(value))
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB.')
      return
    }

    setPhoto(file)
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.referral_source.trim()) {
      setError('Please fill in all required fields. / Por favor complete todos los campos obligatorios.')
      return
    }
    if (!photo) {
      setError('Please upload a photo. / Por favor suba una foto.')
      return
    }
    if (!form.sms_consent) {
      setError('You must agree to receive SMS messages. / Debe aceptar recibir mensajes de texto.')
      return
    }

    setSubmitting(true)

    try {
      // Upload photo first
      const photoFormData = new FormData()
      photoFormData.append('file', photo)

      const uploadRes = await fetch('/api/team-applications/upload', {
        method: 'POST',
        body: photoFormData,
      })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        setError(uploadData.error || 'Failed to upload photo.')
        setSubmitting(false)
        return
      }

      // Submit application
      const references = [
        { name: form.ref1_name, phone: form.ref1_phone.replace(/\D/g, '') },
        { name: form.ref2_name, phone: form.ref2_phone.replace(/\D/g, '') },
        { name: form.ref3_name, phone: form.ref3_phone.replace(/\D/g, '') },
      ].filter((r) => r.name && r.phone)

      const res = await fetch('/api/team-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: slug,
          name: form.name.trim(),
          phone: form.phone.replace(/\D/g, ''),
          email: form.email.trim() || null,
          address: form.address.trim(),
          experience: form.experience || null,
          availability: form.availability || null,
          referral_source: form.referral_source.trim(),
          references,
          notes: form.notes.trim() || null,
          photo_url: uploadData.url,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit application.')
        setSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again. / Algo sali\u00f3 mal. Int\u00e9ntelo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (notFound || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-800 mb-2">Business Not Found</p>
          <p className="text-slate-400">Negocio no encontrado</p>
          <p className="text-sm text-slate-300 mt-2">This application link is not valid.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Application Received!</h1>
          <p className="text-lg text-slate-600 mb-1">Solicitud Recibida!</p>
          <p className="text-slate-400 mt-4">
            We&apos;ll review your application and reach out soon.
          </p>
          <p className="text-slate-400">
            Revisaremos su solicitud y nos pondremos en contacto pronto.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-600 px-4 py-6">
        <div className="max-w-lg mx-auto text-center">
          {tenant.logo_url && (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/30 object-cover"
            />
          )}
          <h1 className="text-white text-xl font-bold">{tenant.name}</h1>
          <p className="text-white/80 text-sm mt-1">Team Application / Solicitud de Empleo</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name / Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone / Tel&eacute;fono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => handlePhoneChange('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email / Correo Electr&oacute;nico
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address / Direcci&oacute;n <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="123 Main St, City, State ZIP"
            />
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Experience / Experiencia
            </label>
            <select
              value={form.experience}
              onChange={(e) => updateField('experience', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Select / Seleccionar</option>
              <option value="none">None / Ninguna</option>
              <option value="1-2 years">1-2 years / 1-2 a&ntilde;os</option>
              <option value="3-5 years">3-5 years / 3-5 a&ntilde;os</option>
              <option value="5+ years">5+ years / 5+ a&ntilde;os</option>
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Availability / Disponibilidad
            </label>
            <select
              value={form.availability}
              onChange={(e) => updateField('availability', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Select / Seleccionar</option>
              <option value="full-time">Full-time / Tiempo completo</option>
              <option value="part-time">Part-time / Medio tiempo</option>
              <option value="weekends">Weekends / Fines de semana</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          {/* References */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              References / Referencias (3)
            </label>
            <div className="space-y-3">
              {([1, 2, 3] as const).map((n) => (
                <div key={n} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-slate-400 font-medium">Reference {n} / Referencia {n}</p>
                  <input
                    type="text"
                    value={form[`ref${n}_name` as keyof FormState] as string}
                    onChange={(e) => updateField(`ref${n}_name` as keyof FormState, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Name / Nombre"
                  />
                  <input
                    type="tel"
                    value={form[`ref${n}_phone` as keyof FormState] as string}
                    onChange={(e) => handlePhoneChange(`ref${n}_phone` as 'ref1_phone' | 'ref2_phone' | 'ref3_phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Phone / Tel\u00e9fono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* How did you hear about us */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              How did you hear about us? / C&oacute;mo se enter&oacute; de nosotros? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.referral_source}
              onChange={(e) => updateField('referral_source', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Friend, online, etc."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Additional Notes / Notas Adicionales
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="Anything else you'd like us to know / Algo m\u00e1s que quiera que sepamos"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Photo / Foto <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-teal-500 transition-colors overflow-hidden bg-gray-50 shrink-0"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-xs text-gray-400">Upload</span>
                  </div>
                )}
              </div>
              <div className="text-sm text-slate-400">
                <p>JPEG, PNG, or WebP</p>
                <p>Max 5MB</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          {/* SMS Consent */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sms_consent}
                onChange={(e) => updateField('sms_consent', e.target.checked)}
                className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="text-xs text-slate-500 leading-relaxed">
                By checking this box, I consent to receive SMS text messages from {tenant.name} regarding
                my application status and employment-related communications. Message and data rates may apply.
                Message frequency varies. Reply STOP to opt out at any time. Reply HELP for assistance.
                <br /><br />
                Al marcar esta casilla, doy mi consentimiento para recibir mensajes de texto SMS de {tenant.name} sobre
                el estado de mi solicitud y comunicaciones relacionadas con el empleo. Se pueden aplicar tarifas de mensajes y datos.
                La frecuencia de los mensajes var&iacute;a. Responda STOP para cancelar en cualquier momento. Responda HELP para obtener ayuda.
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {submitting ? 'Submitting... / Enviando...' : 'Submit Application / Enviar Solicitud'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-300 mt-8 pb-6">
          Powered by FullLoop CRM
        </p>
      </div>
    </div>
  )
}
